// Phase 1: exercise the exact adaptive-resolution controller in game.html.
// Browser/render performance and physical iPhone acceptance remain separate gates.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','game.html'),'utf8');
const start=source.indexOf('const BOARD_RES=');
const end=source.indexOf('function drawScene(time)',start);
assert.ok(start>0&&end>start,'adaptive controller exists in the source game');
const controller=source.slice(start,end);
function harness(coarse,dpr){
  return vm.runInNewContext(controller+';({BOARD_RES,boardRenderScale})',{
    COARSE:coarse,devicePixelRatio:dpr,Math
  });
}
function feed(h,from,step,count){
  let now=from;
  for(let i=0;i<count;i++,now+=step)h.boardRenderScale(now,true);
  return now;
}
assert.equal(harness(true,3).boardRenderScale(1,true),2,'touch starts at a 2x cap');
assert.equal(harness(true,1.5).boardRenderScale(1,true),1.5,'never exceed device DPR');
assert.equal(harness(false,3).boardRenderScale(1,true),2,'desktop remains capped at 2x');
assert.equal(harness(false,1).boardRenderScale(1,true),1,'low-DPR desktop unchanged');
const fast=harness(true,3);
let now=feed(fast,1,16,1100);
assert.equal(fast.BOARD_RES.level,2.5,'sustained fast active frames may increase detail');
assert.equal(fast.boardRenderScale(now,true),2.5);
now=feed(fast,now+40,40,800);
assert.equal(fast.BOARD_RES.level,1.5,'sustained pressure progressively reduces rendering cost');
assert.equal(fast.boardRenderScale(now,true),1.5);
fast.BOARD_RES.slowWindows=1;
fast.BOARD_RES.fastWindows=1;
fast.BOARD_RES.history.push(24);
fast.boardRenderScale(now+200,false);
assert.equal(fast.BOARD_RES.history.length,0,'idle/modal sampling clears pending frames');
assert.equal(fast.BOARD_RES.slowWindows,0,'idle clears slow-frame votes');
assert.equal(fast.BOARD_RES.fastWindows,0,'idle clears fast-frame votes');
const interrupted=harness(true,3);
feed(interrupted,1,16,80);
interrupted.boardRenderScale(6000,true);
assert.equal(interrupted.BOARD_RES.history.length,0,'long frame gap is not treated as active load');
assert.equal(interrupted.BOARD_RES.level,2,'a single pause must not change resolution');
const style=source.slice(0,source.indexOf('</style>'));
const earlier=style.indexOf('#ui #roster{top:calc(max(8px,env(safe-area-inset-top,0px)) + 54px)');
const compact=style.indexOf('/* Phase 1 small-phone roster: final-cascade correction.');
assert.ok(earlier>0&&compact>earlier,'compact rules follow the higher-specificity roster override');
assert.match(style.slice(compact),/max-height:380px/,'very small landscape layout retained');
assert.match(style.slice(compact),/#ui #roster \.pcard\{min-height:44px\}/,'keep 44px touch targets');
assert.match(style.slice(compact),/overflow-x:auto/,'ownership strips remain reachable');
console.log('PASS adaptive board resolution and small-phone HUD source checks (15 assertions)');
