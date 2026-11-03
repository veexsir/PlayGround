#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CAPTURE_URL="${CAPTURE_URL:-http://localhost:${PORT:-3000}}"
CAPTURE_DIR="${CAPTURE_DIR:-$PROJECT_DIR/screenshots}"
SESSION="roadster-capture-$$"
BROWSER_OPEN=false

finish() {
  status=$?
  trap - EXIT
  if [[ "$BROWSER_OPEN" == true ]]; then
    if ! /usr/bin/time -p playwright-cli -s="$SESSION" close; then
      echo "Could not close the capture browser session." >&2
      [[ $status -ne 0 ]] || status=75
    fi
  fi
  exit "$status"
}
trap finish EXIT

/usr/bin/time -p mkdir -p "$CAPTURE_DIR"
if ! command -v playwright-cli >/dev/null 2>&1; then
  echo "playwright-cli is not installed; browser capture cannot run." >&2
  exit 75
fi

if ! /usr/bin/time -p playwright-cli -s="$SESSION" open "$CAPTURE_URL"; then
  echo "Browser startup or navigation failed for $CAPTURE_URL." >&2
  exit 75
fi
BROWSER_OPEN=true
/usr/bin/time -p sleep 2

render_check="$(/usr/bin/time -p playwright-cli -s="$SESSION" eval '() => Boolean(document.querySelector("#gameCanvas") && document.querySelector("#startBtn") && document.querySelector("#startBtn").textContent.trim() === "Start Race" && document.querySelector("h1")?.textContent.includes("TESLA ROADSTER"))')" || {
  echo "Could not inspect the rendered page in the browser." >&2
  exit 75
}
if [[ "$render_check" != *true* ]]; then
  echo "The page loaded but the Tesla Roadster game did not render as expected." >&2
  exit 1
fi

if ! /usr/bin/time -p playwright-cli -s="$SESSION" resize 1440 1000; then
  echo "Browser could not switch to the desktop viewport." >&2
  exit 75
fi
if ! /usr/bin/time -p playwright-cli -s="$SESSION" screenshot --filename="$CAPTURE_DIR/final-desktop.png"; then
  echo "Browser failed while capturing the desktop view." >&2
  exit 75
fi
if ! /usr/bin/time -p playwright-cli -s="$SESSION" resize 390 844; then
  echo "Browser could not switch to the mobile viewport." >&2
  exit 75
fi
/usr/bin/time -p sleep 1
if ! /usr/bin/time -p playwright-cli -s="$SESSION" screenshot --filename="$CAPTURE_DIR/final-mobile.png"; then
  echo "Browser failed while capturing the mobile view." >&2
  exit 75
fi
/usr/bin/time -p test -s "$CAPTURE_DIR/final-desktop.png"
/usr/bin/time -p test -s "$CAPTURE_DIR/final-mobile.png"
echo "Captured rendered desktop and mobile views from $CAPTURE_URL in $CAPTURE_DIR"
