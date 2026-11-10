#!/bin/sh
# Read-only checks against production after a deploy.
#   sh smoke.sh api
#   sh smoke.sh site <path to the just-built index.html>
set -eu
API="${API:-https://api.projectexfilout.org}"
SITE="${SITE:-https://projectexfilout.org}"

expect() { # expect <url> <status>
  got=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$1")
  [ "$got" = "$2" ] || { echo "::error::$1 returned $got, expected $2"; return 1; }
  echo "ok  $1 → $got"
}

case "$1" in
  api)
    expect "$API/health" 200
    expect "$API/programs" 200
    expect "$API/programs/this-listing-does-not-exist" 404
    expect "$API/dashboard" 401
    ;;
  site)
    expect "$SITE/" 200
    expect "$SITE/programs" 200
    asset=$(grep -o 'assets/index-[A-Za-z0-9_-]*\.js' "$2" | head -1)
    curl -s --max-time 15 "$SITE/" | grep -q "$asset" || { echo "::error::Live index.html doesn't reference $asset"; exit 1; }
    echo "ok  live index.html serves $asset"
    ;;
  *) echo "usage: smoke.sh api | site <index.html>"; exit 2 ;;
esac
