/* Renderer sharpness contract: preserve native-density output without unbounded GPU cost.
   This static check does not replace visual screenshots or device performance tests. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../lib/circuit-renderer-3d.js'),'utf8');
assert.match(src,/function facade\(kind\)\{return canvasTex\(256,512/,'facade resolution is 2x');
assert.match(src,/ctx\.scale\(2,2\);w\/=2;h\/=2/,'facade drawing coordinates remain stable');
assert.match(src,/t\.anisotropy=8/,'oblique facades use anisotropic filtering');
assert.match(src,/t\.minFilter=THREE\.LinearMipmapLinearFilter/,'mipmaps reduce aliasing');
assert.match(src,/high:\{[^}]*maxScale:3,/,'high tier allows native 3x density');
assert.match(src,/Math\.sqrt\(4200000\/\(W\*Hh\)\)/,'pixel budget caps rendering cost');
assert.match(src,/function downgrade\(\)/,'adaptive quality fallback preserved');
assert.match(src,/renderer\.setPixelRatio\(dpr\)/,'pixel ratio actually applied');
console.log('PASS: 2x facades, anisotropic mipmaps, capped native-density rendering and adaptive fallback');
