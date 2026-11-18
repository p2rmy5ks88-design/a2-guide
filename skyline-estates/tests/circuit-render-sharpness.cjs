/* Renderer sharpness contract: preserve native-density output without unbounded GPU cost.
   This static check does not replace visual screenshots or device performance tests. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../lib/circuit-renderer-3d.js'),'utf8');
assert.match(src,/function facade\(kind,detail=1\)\{const mul=detail>1\?4:2;return canvasTex\(128\*mul,256\*mul/,'facade textures scale to 512x1024 for high density');
assert.match(src,/ctx\.scale\(mul,mul\);w\/=mul;h\/=mul/,'facade drawing coordinates remain stable');
assert.match(src,/t\.anisotropy=8/,'oblique facades use anisotropic filtering');
assert.match(src,/t\.minFilter=THREE\.LinearMipmapLinearFilter/,'mipmaps reduce aliasing');
assert.match(src,/high:\{[^}]*maxScale:3,/,'high tier allows native 3x density');
assert.match(src,/Math\.sqrt\(4200000\/\(W\*Hh\)\)/,'pixel budget caps rendering cost');
assert.match(src,/function downgrade\(\)/,'adaptive quality fallback preserved');
assert.match(src,/renderer\.setPixelRatio\(dpr\)/,'pixel ratio actually applied');
assert.match(src,/Slim exterior corner mullions/,'mid-rise facade accents retained');
assert.match(src,/Recessed crown rim and four vertical corner accents/,'high-rise silhouette accents retained');
assert.match(src,/facade\('glass',tierName!=='low'\?2:1\)/,'higher-fidelity glass on medium/high tiers');
console.log('PASS: 4x retina facade detail on medium/high, anisotropic mipmaps, capped native-density rendering and fallback');
