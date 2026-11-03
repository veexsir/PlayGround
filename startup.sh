#!/usr/bin/env bash
set -euo pipefail

# Install the browser used by capture.sh once per worker.
/usr/bin/time -p playwright-cli install-browser chromium
