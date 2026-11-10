#!/bin/sh
# Runs a command in backend/ with DATABASE_URL pointing at PRODUCTION (RDS).
# The URL is read from the EB environment at call time and never printed or
# written to disk. Needs AWS CLI credentials and your IP allowed by the RDS
# security group (vetpath-rds-sg).
#
#   sh backend/scripts/with-prod-db.sh npx prisma migrate status    # read-only
#   sh backend/scripts/with-prod-db.sh npx prisma migrate deploy    # applies migrations
#   sh backend/scripts/with-prod-db.sh node prisma/import-programs.js          # dry run
#   sh backend/scripts/with-prod-db.sh node prisma/make-admin.js <email>
set -eu
DATABASE_URL=$(aws elasticbeanstalk describe-configuration-settings --region us-east-1 \
  --application-name vetpath --environment-name vetpath-env \
  --query "ConfigurationSettings[0].OptionSettings[?Namespace=='aws:elasticbeanstalk:application:environment' && OptionName=='DATABASE_URL'].Value" \
  --output text)
case "$DATABASE_URL" in postgres*) ;; *) echo "Could not read production DATABASE_URL" >&2; exit 1 ;; esac
export DATABASE_URL
cd "$(dirname "$0")/.."
exec "$@"
