#!/usr/bin/env bash
# CI-only: add the validation probe to the bundled web game (never used for release builds).
set -euo pipefail
cd "$(dirname "$0")/.."
# Optional argument: "coach" uses the Skyline Coach probe instead of the Living City scenes.
if [ "${1:-living-city}" = coach ]; then cp scripts/native-coach-probe.js www/native-probe.js; else cp scripts/native-probe.js www/native-probe.js; fi
sed -i.bak 's#<head>#<head><script src="./native-probe.js"></script>#' www/index.html && rm -f www/index.html.bak
grep -q native-probe.js www/index.html
echo "Native probe injected (${1:-living-city}; validation build only)"
