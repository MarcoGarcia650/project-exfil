#!/bin/sh
# One-time AWS setup for the GitHub Actions deploy pipeline. Idempotent.
#
# Creates:
#   - the GitHub OIDC identity provider (so GitHub can log in to AWS
#     without stored keys)
#   - role exfil-github-deploy, assumable ONLY by this repo's
#     "production" GitHub environment (trust-policy.json), with:
#       * AWS-managed AdministratorAccess-AWSElasticBeanstalk (EB deploys
#         touch CloudFormation, EC2, Auto Scaling, S3, IAM PassRole, …)
#       * frontend-policy.json: write the frontend bucket + invalidate
#         that one CloudFront distribution
#   - sets the EB environment's deployment policy to Immutable
#     (direct environment settings override .ebextensions, and this
#     environment had "Rolling" set directly)
#
# Run from the repo root:  sh infra/github-deploy/setup.sh
set -eu
cd "$(dirname "$0")"
ROLE=exfil-github-deploy
OIDC_ARN=arn:aws:iam::600406561374:oidc-provider/token.actions.githubusercontent.com

if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$OIDC_ARN" >/dev/null 2>&1; then
  echo "OIDC provider: exists"
else
  aws iam create-open-id-connect-provider \
    --url https://token.actions.githubusercontent.com \
    --client-id-list sts.amazonaws.com >/dev/null
  echo "OIDC provider: created"
fi

if aws iam get-role --role-name "$ROLE" >/dev/null 2>&1; then
  aws iam update-assume-role-policy --role-name "$ROLE" --policy-document file://trust-policy.json
  echo "Role $ROLE: exists, trust policy updated"
else
  aws iam create-role --role-name "$ROLE" \
    --description "GitHub Actions deploys for project-exfil (production environment only)" \
    --assume-role-policy-document file://trust-policy.json >/dev/null
  echo "Role $ROLE: created"
fi
aws iam attach-role-policy --role-name "$ROLE" \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess-AWSElasticBeanstalk
aws iam put-role-policy --role-name "$ROLE" --policy-name exfil-frontend-deploy \
  --policy-document file://frontend-policy.json
echo "Role $ROLE: policies attached"

aws elasticbeanstalk update-environment --region us-east-1 --environment-name vetpath-env \
  --option-settings Namespace=aws:elasticbeanstalk:command,OptionName=DeploymentPolicy,Value=Immutable \
  >/dev/null
echo "EB vetpath-env: DeploymentPolicy=Immutable (environment updating; wait for Ready/Green)"

echo
echo "Role ARN: $(aws iam get-role --role-name "$ROLE" --query Role.Arn --output text)"
