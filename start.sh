#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"
export PORT="${PORT:-3000}"

/usr/bin/time -p npm install
/usr/bin/time -p npm run build
/usr/bin/time -p mkdir -p /home/runner/work/_temp/omgithub-web
/usr/bin/time -p node -e 'const fs = require("node:fs"); const path = require("node:path"); const project = process.argv[1]; const output = path.join(project, "dist"); fs.writeFileSync("/home/runner/work/_temp/omgithub-web/deployment-output.json", JSON.stringify({ project, directory: output }, null, 2) + "\n");' "$PROJECT_DIR"

exec /usr/bin/time -p node server.mjs
