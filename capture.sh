#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

CAPTURE_URL="${CAPTURE_URL:-http://localhost:${PORT:-3000}}"
CAPTURE_DIR="${CAPTURE_DIR:-./screenshots}"
mkdir -p "$CAPTURE_DIR"

if command -v playwright-cli >/dev/null 2>&1; then
  if timeout 20s playwright-cli open "$CAPTURE_URL" >/tmp/roadster-open.log 2>&1; then
    sleep 2
  fi

  if timeout 20s playwright-cli screenshot --filename="$CAPTURE_DIR/roadster.png" >/tmp/roadster-screenshot.log 2>&1; then
    echo "Captured screenshot to $CAPTURE_DIR/roadster.png"
    exit 0
  fi
fi

echo "Capture step skipped; browser automation not available or page did not render." >&2
exit 0
