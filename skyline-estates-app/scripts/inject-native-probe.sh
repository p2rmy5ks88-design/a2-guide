#!/usr/bin/env bash
# CI-only: add the validation probe to the bundled web game (never used for release builds).
set -euo pipefail
cd "$(dirname "$0")/.."
cp scripts/native-probe.js www/native-probe.js
sed -i.bak 's#<head>#<head><script src="./native-probe.js"></script>#' www/index.html && rm -f www/index.html.bak
grep -q native-probe.js www/index.html
echo "Native probe injected (validation build only)"
