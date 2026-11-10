#!/bin/sh
# Waits until the EB environment is Ready and Green on the expected version.
#   sh wait-eb.sh <environment> <version-label>
# Immutable deploys launch and health-check a new instance first, so allow
# up to 25 minutes.
set -eu
env="$1"; want="$2"
for i in $(seq 1 150); do
  read -r status health version <<EOT
$(aws elasticbeanstalk describe-environments --environment-names "$env" --query 'Environments[0].[Status,Health,VersionLabel]' --output text)
EOT
  echo "$(date -u +%H:%M:%S) $status $health $version"
  if [ "$status" = "Ready" ]; then
    if [ "$version" = "$want" ] && [ "$health" = "Green" ]; then exit 0; fi
    if [ "$version" != "$want" ]; then
      echo "::error::Environment is Ready but on $version, not $want (deploy failed or was rolled back)"
      aws elasticbeanstalk describe-events --environment-name "$env" --max-items 10 --query 'Events[].[Severity,Message]' --output text
      exit 1
    fi
  fi
  sleep 10
done
echo "::error::Timed out waiting for $env"
exit 1
