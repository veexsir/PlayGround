#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
export PORT="${PORT:-3000}"
/usr/bin/time -p node server.mjs
