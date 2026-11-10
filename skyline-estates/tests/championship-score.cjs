// Championship scores are deterministic and limited to explicitly opted-in offline matches.
'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const {readSources,createRuntime}=require('../online/headless-runtime.cjs');
const rt=createRuntime(readSources(path.resolve(__dirname,'..')));
function check(code){return JSON.parse(rt.run('JSON.stringify((()=>{'+code+'})())'))}
function start(){rt.run(`FAST=true;GEN++;applyCity('lagos');newGame({lc:true,cash:5000,set:{ai:'normal',mode:'timed',rounds:30,championship:1,perks:false,city:'lagos'},players:[0,1,2].map(i=>({name:NAMES[i],tok:TOKENS[i],col:PCOL[i],ai:true,tl:1}))});`)}
start();
const score=check(`
 const ids=Object.values(GROUPS).find(ids=>ids.length===3&&ids.every(i=>SQ[i].t==='prop'));
 const price=ids.reduce((n,i)=>n+SQ[i].p,0);
 ids.forEach(i=>G.own[i].o=0);P(0).cash=5000-price;P(1).cash=5000;
 const before=skylineChampionshipScore(P(0));
 const fee=Math.round(SQ[ids[0]].p*.25/5)*5;
 P(0).cash-=fee;G.lm={[SQ[ids[0]].g]:{i:ids[0],pid:0}};
 const after=skylineChampionshipScore(P(0));
 G.own[ids[1]].h=3;G.own[ids[2]].m=true;
 const developed=skylineChampionshipScore(P(0));
 P(0).bankrupt=true;const bankrupt=skylineChampionshipScore(P(0));
 return {price,before,after,developed,buildPrice:SQ[ids[1]].h,mortgagePrice:SQ[ids[2]].p,bankrupt};`);
assert.equal(score.before.total,5000+Math.round(score.price*.1));
assert.equal(score.after.total,score.before.total,'Landmark payment is counted once');
assert.equal(score.developed.buildings,3*score.buildPrice,'building value is counted once');
assert.equal(score.developed.properties,score.price-score.mortgagePrice/2,'mortgage reduces property value');
assert.equal(score.developed.total,Object.entries(score.developed).filter(([k])=>k!=='total').reduce((n,[,v])=>n+v,0));
assert.equal(score.bankrupt.total,0);
// Force a case where Championship and legacy ranking disagree; a type-only check cannot catch leakage.
for(const mode of ['championship','legacy','online','lcOnline','classic']){
 start();
 const result=check(`const ids=Object.values(GROUPS).find(ids=>ids.length===3&&ids.every(i=>SQ[i].t==='prop'));
 const price=ids.reduce((n,i)=>n+SQ[i].p,0);ids.forEach(i=>G.own[i].o=0);
 P(0).cash=5000-price;P(1).cash=5001;P(2).cash=1;
 ${mode==='legacy'?'delete G.set.championship;':mode==='online'?'G.online=true;':mode==='lcOnline'?"G.lcNet={code:'TEST'};":mode==='classic'?"G.set.mode='classic';":''}
 return {active:skylineChampionshipActive(),winner:standings()[0].id};`);
 assert.equal(result.active,mode==='championship',mode+' scoring gate');
 assert.equal(result.winner,mode==='championship'?0:1,mode+' ranking');
}
// Exercise the actual offline driver with deterministic turns, including a nonzero first seat.
(async()=>{
 for(const first of [0,1,2])for(const startRound of [29,31]){
  start();
  const result=JSON.parse(await rt.run(`(async()=>{
    G.first=${first};G.turn=G.first;G.round=${startRound};G.set.rounds=30;
    const played=[];playTurn=async p=>{played.push([G.round,p.id]);G.phase='busy'};
    finish=async()=>{};save=()=>{};await run();return JSON.stringify({played,over:G.over,round:G.round});
  })()`));
  assert.equal(result.over,true);assert.equal(result.round,31);
  assert.deepEqual(result.played,(startRound===31?[]:[29,30]).flatMap(round=>[0,1,2].map(offset=>[round,(first+offset)%3])),'every player completes exactly two rounds');
 }
 console.log('PASS Championship component totals, legacy/online isolation and exact final-turn completion');
})().catch(e=>{console.error(e);process.exitCode=1});
