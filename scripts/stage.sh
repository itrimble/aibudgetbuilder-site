#!/usr/bin/env bash
# Local preview only. Builds the site and lays out what GitHub Pages serves, in ./stage/. Nothing is published and no network call is made.
# Publishing is automatic: .github/workflows/deploy.yml builds and deploys on every push to main and once a day.
# Preview: open stage/index.html, or run `npm run serve` (serves dist/, the same file).
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build >/dev/null
rm -rf stage && mkdir stage
cp dist/index.html stage/index.html
printf 'aibudgetbuilder.remnantsecurity.com' > stage/CNAME
: > stage/.nojekyll
echo "Staged $(wc -c < stage/index.html | tr -d ' ') bytes in $(pwd)/stage (CNAME aibudgetbuilder.remnantsecurity.com). Not published."
