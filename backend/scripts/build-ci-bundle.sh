#!/bin/sh
# Builds the production EB bundle WITH node_modules pre-installed, so the
# server skips `npm install` on deploy (a stalled install on the t3.micro
# took the site down on 2026-11-09). Meant for CI (Linux x64, like EB).
#
#   sh backend/scripts/build-ci-bundle.sh <output.zip>
#
# Steps: full install → prisma generate (needs the CLI) → reinstall with
# production dependencies only → zip with .platform/ and .ebextensions/.
set -eu
out="${1:?usage: build-ci-bundle.sh <output.zip>}"
case "$out" in /*) ;; *) out="$PWD/$out" ;; esac
mkdir -p "$(dirname "$out")"
cd "$(dirname "$0")/.."

npm ci --no-audit --no-fund
npx prisma generate
rm -rf node_modules
npm ci --omit=dev --omit=peer --no-audit --no-fund

test -f .ebextensions/01-origin-cloudfront-only.config || { echo "missing CloudFront-only SG config" >&2; exit 1; }
test -x .platform/hooks/prebuild/01_swap.sh || { echo "missing swap hook" >&2; exit 1; }

rm -f "$out"
zip -qr "$out" package.json package-lock.json prisma.config.ts prisma src node_modules .platform .ebextensions \
  -x '*.DS_Store' -x '*/.env*'
echo "Built $out ($(du -h "$out" | cut -f1))"
