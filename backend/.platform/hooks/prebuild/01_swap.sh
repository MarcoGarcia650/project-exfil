#!/bin/bash
# Ensures a 1 GB swap file on the EB instance (t3.micro has ~1 GB RAM and
# no swap). Without it, `npm install` during a deploy once stalled for 17
# minutes under memory pressure, hit EB's 10-minute timeout and took the
# site down (2026-11-09). Runs before npm install on every deploy and
# config change; idempotent; persists across reboots via /etc/fstab.
set -euo pipefail

SWAPFILE=/var/swapfile
SIZE_MB=1024

if swapon --show=NAME --noheadings | grep -qx "$SWAPFILE"; then
  echo "swap: $SWAPFILE already active"
  exit 0
fi

if [ ! -f "$SWAPFILE" ]; then
  # dd rather than fallocate: always valid as swap on XFS (AL2023 root fs).
  dd if=/dev/zero of="$SWAPFILE" bs=1M count="$SIZE_MB" status=none
  chmod 600 "$SWAPFILE"
  mkswap "$SWAPFILE" >/dev/null
fi

swapon "$SWAPFILE"
grep -q "^$SWAPFILE " /etc/fstab || echo "$SWAPFILE none swap sw 0 0" >> /etc/fstab
echo "swap: enabled $SWAPFILE (${SIZE_MB} MB)"
