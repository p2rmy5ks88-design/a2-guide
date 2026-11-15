// Phase 1 non-rendering regression checks for the Harbour Ring water-band cleanup.
// A source check cannot prove the photographic backdrop looks correct in Safari.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','lib','harbour-ring.js'),'utf8');
assert.match(source,/\.hr-sky:before\{content:none\}/,'the artificial water overlay is removed');
assert.doesNotMatch(source,/@keyframes\s+hrWater\b/,'obsolete water-band animation is removed');
assert.match(source,/html\.light\s+\.hr-sky:before\{content:none\}/,'light mode cannot restore the overlay');
assert.match(source,/url\(art\/ring-golden\.jpg\)/,'original golden-hour photograph remains');
assert.match(source,/art\/ring-day\.jpg/,'daylight photograph remains available');
assert.match(source,/\.hr-boat\{animation:hrSail/,'boat animation remains intact');
assert.match(source,/prefers-reduced-motion:reduce/,'reduced-motion accessibility remains');
assert.match(source,/\.hr-b\{[^}]*min-height:44px/,'primary action buttons retain touch target size');
assert.match(source,/\.hr-ib\{[^}]*width:44px;height:44px/,'icon actions retain touch target size');
console.log('PASS Harbour Ring water-band source regression (9 assertions)');
