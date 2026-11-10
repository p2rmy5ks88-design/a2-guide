// Synthetic two-player Living City regression: isolate a genuinely exhausted 36-permit
// home bank from the more common no-monopoly/no-build stalemate. No save files or data writes.
'use strict';
const path=require('node:path'),assert=require('node:assert/strict');
const {readSources,createRuntime}=require('../online/headless-runtime.cjs');
const root=path.resolve(__dirname,'..');
const code=`(()=>{
FAST=true;GEN++;applyCity('lagos');
newGame({lc:true,cash:100000,set:{ai:'normal',speed:'fast',pot:false,city:'lagos',perks:false},
  players:[0,1].map(i=>({name:NAMES[i],tok:TOKENS[i],col:PCOL[i],ai:true,tl:1}))});
if(G.rv!==2)throw Error('Living City V2 not enabled');
const groups=Object.entries(GROUPS).filter(([g,ids])=>ids.length===3&&ids.every(i=>SQ[i].t==='prop'));
if(groups.length<5)throw Error('Need at least five 3-street groups');
for(let k=0;k<4;k++)for(const i of groups[k][1]){G.own[i].o=k%2;G.own[i].h=3}
for(const i of groups[4][1])G.own[i].o=0;
G.houses=0;G.hotels=12;
const remaining=groups[4][1][0],target=groups[0][1][0],owner=G.own[target].o;
const wasBlocked=!canBuild(0,remaining);
G.houses=1;const openWithPermit=canBuild(0,remaining);G.houses=0;
const nonLandmarkCannotSky=!canBuild(owner,target);
G.lm={[groups[0][0]]:{i:target,pid:owner}};
const legalTower=canBuild(owner,target);
if(legalTower)build(owner,target);
const released=G.houses,sky=G.own[target].h,backToWork=canBuild(0,remaining);
const valid=G.own.reduce((sum,o)=>sum+(o.h===5?0:o.h),0)+G.houses===36
 && G.own.filter(o=>o.h===5).length+G.hotels===12;
return JSON.stringify({wasBlocked,openWithPermit,nonLandmarkCannotSky,legalTower,released,sky,backToWork,valid,
  homesLeft:G.houses,towersLeft:G.hotels,completeDistricts:groups.length});
})()`;
const r=JSON.parse(createRuntime(readSources(root)).run(code));
for(const k of ['wasBlocked','openWithPermit','nonLandmarkCannotSky','legalTower','backToWork','valid'])
 assert.equal(r[k],true,k+' failed: '+JSON.stringify(r));
assert.equal(r.released,3,'Skyscraper must free three home permits');
assert.equal(r.sky,5,'High-rise should become Skyscraper');
console.log('PASS: permit starvation is possible with 2 players, 12 High-rises / 0 permits.');
console.log('PASS: non-Landmarks cannot upgrade; a legal Landmark Skyscraper returns 3 permits.');
console.log('DETAIL '+JSON.stringify(r));
