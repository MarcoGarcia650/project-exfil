#!/bin/sh
# Builds a clean Elastic Beanstalk bundle for "Upload and deploy" in the
# EB console (or `eb deploy --label`). Run from anywhere:
#
#   sh backend/scripts/make-deploy-zip.sh
#
# Output: backend/deploy/exfil-backend-<git-sha>.zip
#
# Contents: package.json + package-lock.json, prisma.config.ts, prisma/
# (schema, migrations, scripts), .platform/ (EB hooks, e.g. swap),
# .ebextensions/ (EB resource config, e.g. the security group) and src/
# INCLUDING src/generated (it's gitignored but the app imports it at runtime).
# Never included: .env (secrets come from EB environment properties),
# node_modules (EB installs Linux builds itself from package-lock.json),
# tests, and EB CLI state.
set -eu
cd "$(dirname "$0")/.."

if [ ! -f src/generated/prisma/client.ts ]; then
  echo "src/generated/prisma is missing. Run: npx prisma generate" >&2
  exit 1
fi
if [ -n "$(git status --porcelain -- src prisma .platform .ebextensions package.json package-lock.json prisma.config.ts)" ]; then
  echo "Uncommitted backend changes. Commit first so the zip matches a known commit." >&2
  exit 1
fi

sha=$(git rev-parse --short HEAD)
mkdir -p deploy
out="deploy/exfil-backend-$sha.zip"
rm -f "$out"
zip -qr "$out" package.json package-lock.json prisma.config.ts prisma src .platform .ebextensions \
  -x '*.DS_Store' -x '*/.env*' -x 'node_modules/*'
echo "Built $out ($(unzip -l "$out" | tail -1 | awk '{print $2}') files)"
