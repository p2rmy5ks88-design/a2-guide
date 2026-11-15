#!/usr/bin/env bash
# Phase 1 read-only verification. No deployment, signing, uploads or branch changes.
set -euo pipefail
cd "$(dirname "$0")/../.."
echo "Phase 1: source regression"
node --check skyline-estates/tests/living-board-render-scale.cjs
node --check skyline-estates/tests/harbour-ring-water-visual.cjs
node --check skyline-estates/lib/harbour-ring.js
node skyline-estates/tests/living-board-render-scale.cjs
node skyline-estates/tests/harbour-ring-water-visual.cjs
echo "Phase 1: generated web/offline manifest integrity"
python3 skyline-estates/build.py --check
echo "Phase 1: Harbour Ring and board browser regression"
node skyline-estates/tests/harbour-ring-rules.cjs
node skyline-estates/tests/harbour-ring-browser.cjs
node skyline-estates/tests/living-board-pixel-capture.cjs
echo "Phase 1 automated gate PASS; physical iPhone Safari and full stability/security suites remain mandatory."
