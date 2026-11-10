// Championship scores are deterministic and limited to explicitly opted-in offline matches.
'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const {readSources,createRuntime}=require('../online/headless-runtime.cjs');
const rt=createRuntime(readSources(path.resolve(__dirname,'..')));
const test = [
"(()=>{",
" FAST=true;GEN++;applyCity('lagos');",
" newGame({lc:true,cash:5000,set:{ai:'normal',mode:'timed',rounds:30,championship:1,perks:false,city:'lagos'},",
"   players:[0,1].map(i=>({name:NAMES[i],tok:TOKENS[i],col:PCOL[i],ai:true,tl:1}))});",
" const ids=Object.values(GROUPS).find(ids=>ids.length===3&&ids.every(i=>SQ[i].t==='prop'));",
" const price=ids.reduce((n,i)=>n+SQ[i].p,0);",
" ids.forEach(i=>G.own[i].o=0);P(0).cash-=price;",
" const before=skylineChampionshipScore(P(0)),other=skylineChampionshipScore(P(1));",
" const winningWithoutBankruptcy=standings()[0].id===0;",
" const lm=ids[0],fee=Math.round(SQ[lm].p*.25/5)*5;",
" P(0).cash-=fee;G.lm={[SQ[lm].g]:{i:lm,pid:0}};",
" const after=skylineChampionshipScore(P(0));",
" const feeRestored=after.total===before.total;",
" G.round=30;const beforeFinish=endCheck();G.round=31;const atFinish=endCheck();",
" G.set.championship=0;",
" const legacyOnlyNetWorth=standings().length===2 && typeof skylineChampionshipScore(P(0)).total==='number';",
" return JSON.stringify({before,other,price,winningWithoutBankruptcy,feeRestored,beforeFinish,atFinish,legacyOnlyNetWorth});",
"})()"
].join('\n');
const result=JSON.parse(rt.run(test));
assert.equal(result.before.total>result.other.total,true,'complete district must have a visible score bonus');
assert.equal(result.winningWithoutBankruptcy,true);
assert.equal(result.feeRestored,true,'Landmark investment must not create an instant scoring windfall');
assert.equal(result.beforeFinish,false);
assert.equal(result.atFinish,true);
assert.equal(result.legacyOnlyNetWorth,true);
console.log('PASS championship-score '+JSON.stringify(result));
