#!/bin/sh
# One-time GitHub setup for the deploy pipeline (needs the `gh` CLI, logged in).
#   - "production" environment: required reviewer = repo owner; only the
#     main branch can deploy to it
#   - AWS_ROLE_ARN variable on that environment (not a secret: the role is
#     only assumable by this environment, per trust-policy.json)
# Run from the repo root after setup.sh:  sh infra/github-deploy/github-env.sh
set -eu
REPO=MarcoGarcia650/project-exfil
REVIEWER_ID=$(gh api user --jq .id)

gh api -X PUT "repos/$REPO/environments/production" --input - >/dev/null <<JSON
{
  "reviewers": [{ "type": "User", "id": $REVIEWER_ID }],
  "deployment_branch_policy": { "protected_branches": false, "custom_branch_policies": true }
}
JSON
gh api "repos/$REPO/environments/production/deployment-branch-policies" --jq '.branch_policies[].name' | grep -qx main \
  || gh api -X POST "repos/$REPO/environments/production/deployment-branch-policies" -f name=main -f type=branch >/dev/null
gh variable set AWS_ROLE_ARN --repo "$REPO" --env production \
  --body "arn:aws:iam::600406561374:role/exfil-github-deploy"
echo "GitHub environment 'production': reviewer set, main-only, AWS_ROLE_ARN set"
