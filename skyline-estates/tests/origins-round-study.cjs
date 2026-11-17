// Origins round-count study as a regression test (Skyline Career pre-development study, 17 Nov 2026).
// Seeded AI-vs-AI matches on the headless rules runtime (same code as the app and online engine); nothing is written.
//   node tests/origins-round-study.cjs            CI sample: 5 configurations x 150 matches, with guard-rail assertions
//   ORIGINS_STUDY_FULL=1 node tests/origins-round-study.cjs   the full study: 27 configurations x 1000 matches + no-limit runs
// Seeds start at 100000 in every configuration, so configurations compare the same games.
'use strict';
const path=require('node:path'),assert=require('node:assert/strict');
const {readSources,createRuntime}=require('../online/headless-runtime.cjs');
const ROOT=path.resolve(__dirname,'..'),FULL=process.env.ORIGINS_STUDY_FULL==='1',N=+(process.env.ORIGINS_STUDY_N||(FULL?1000:150)),SEED0=100000;
const MATCH=`(async(seed,rounds,players,ai,human,unlimited)=>{
 let s=seed;Math.random=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296};
 FAST=true;GEN++;applyCity('lagos');
 // App defaults (setup.rules) except token perks off (all seats tier 1 anyway); Quick Play = timed Championship.
 const set={ai,speed:'fast',city:'lagos',...(unlimited?{mode:'classic'}:{mode:'timed',rounds,championship:1}),minigames:true,perks:false,ffa:false,events:false,speedDie:false,pot:false,goDouble:false,jailRent:false,auction:true,even:true,interest:true,maxRounds:300};
 newGame({lc:true,cash:1600,set,players:[...Array(players)].map((_,i)=>({name:NAMES[i],tok:TOKENS[i],col:PCOL[i],ai:true,tl:1}))});G.sim=true;
 const M={firstSet:null,firstLevel:{1:null,2:null,3:null,5:null},firstLandmark:null,firstBankrupt:null,bankruptRounds:[],builds:0,trades:0,turns:[],buildRounds:{},lastBuildRound:0,lastOwnChangeRound:0,leaders:{}};
 globalThis.__M=M;globalThis.__human=human;
 if(!globalThis.__studyHooked){globalThis.__studyHooked=1;
  const b0=build;build=function(){const r=b0.apply(this,arguments);const M=globalThis.__M;M.builds++;M.buildRounds[G.round]=(M.buildRounds[G.round]||0)+1;M.lastBuildRound=G.round;return r};
  const t0=executeTrade;executeTrade=function(){globalThis.__M.trades++;return t0.apply(this,arguments)};
  const k0=bankrupt;bankrupt=function(){const M=globalThis.__M;if(M.firstBankrupt==null)M.firstBankrupt=G.round;M.bankruptRounds.push(G.round);return k0.apply(this,arguments)};
  const ac0=aiAccept;aiAccept=function(t){if(globalThis.__human&&t.to===0)return false;return ac0.apply(this,arguments)};
  const pr0=aiProposeTrade;aiProposeTrade=function(p){if(globalThis.__human&&p.id===0)return null;return pr0.apply(this,arguments)};
  const scan=()=>{const M=globalThis.__M,r=G.round;
   if(M.firstSet==null&&Object.keys(GROUPS).some(g=>G.players.some(p=>!p.bankrupt&&ownsAll(p.id,g))))M.firstSet=r;
   const mx=G.own.reduce((m,o)=>o.o>=0?Math.max(m,o.h):m,0);for(const k of [1,2,3,5])if(M.firstLevel[k]==null&&mx>=k)M.firstLevel[k]=r;
   if(M.firstLandmark==null&&Object.keys(G.lm||{}).length)M.firstLandmark=r};
  globalThis.__scan=scan;
  const snap=p=>({cash:p.cash,own:G.own.filter(o=>o.o===p.id).length,lv:G.own.reduce((n,o)=>n+(o.o===p.id?o.h:0),0),mort:G.own.filter(o=>o.o===p.id&&o.m).length,lm:Object.values(G.lm||{}).filter(x=>x.pid===p.id).length,trades:globalThis.__M.trades,nw:netWorth(p)});
  const p0=playTurn;playTurn=async function(p){const M=globalThis.__M;scan();
   if(!M.leaders[G.round]){const st=standings();M.leaders[G.round]=st[0].id}
   const a=snap(p),r0=G.round,ownAll0=G.own.map(o=>o.o).join();
   const res=await p0.apply(this,arguments);
   const b=snap(p);scan();if(G.own.map(o=>o.o).join()!==ownAll0)M.lastOwnChangeRound=r0;
   const decision=(b.own!==a.own)||(b.lv!==a.lv)||(b.mort!==a.mort)||(b.lm!==a.lm)||(b.trades!==a.trades);
   const dc=b.cash-a.cash,rel=a.nw>0?Math.abs(dc)/a.nw:0;
   M.turns.push([r0,decision?1:0,+rel.toFixed(4),p.bankrupt?1:0]);return res}}
 let err=null;const pe=globalThis.__onErr;globalThis.__onErr=e=>err=e;try{await run()}finally{globalThis.__onErr=pe}
 globalThis.__scan();
 const st=standings(),w=st[0],sc=G.players.map(p=>p.bankrupt?0:skylineChampionshipScore(p).total),nw=G.players.map(p=>p.bankrupt?0:netWorth(p));
 const sorted=[...sc].sort((x,y)=>y-x),lv=[0,0,0,0,0,0];G.own.forEach(o=>{if(o.o>=0)lv[o.h]++});
 const half=Math.max(1,Math.floor(rounds/2));
 return JSON.stringify({seed,err:err&&String(err),rounds:G.round,limit:rounds,players,ai,human,
  outcome:G.players.filter(p=>!p.bankrupt).length<=1?'bankruptcy':'round-limit',solvent:G.players.filter(p=>!p.bankrupt).length,
  firstSet:M.firstSet,firstLow:M.firstLevel[1],firstMid:M.firstLevel[2],firstHigh:M.firstLevel[3],firstSky:M.firstLevel[5],firstLandmark:M.firstLandmark,firstBankrupt:M.firstBankrupt,bankruptRounds:M.bankruptRounds,
  builds:M.builds,trades:M.trades,levels:lv,landmarks:Object.keys(G.lm||{}).length,winner:w.id,first:G.first||0,
  marginScore:sorted[0]?+((sorted[0]-(sorted[1]||0))/sorted[0]).toFixed(3):0,
  leaderHalf:M.leaders[half]??null,lastBuildRound:M.lastBuildRound,lastOwnChangeRound:M.lastOwnChangeRound,
  buildRounds:M.buildRounds,turns:M.turns})})`;
const pct=(v,q)=>{if(!v.length)return null;const s=[...v].sort((a,b)=>a-b),k=(s.length-1)*q,f=Math.floor(k),c=Math.min(f+1,s.length-1);return +(s[f]+(s[c]-s[f])*(k-f)).toFixed(1)};
const trio=v=>[pct(v,.1),pct(v,.5),pct(v,.9)],share=(rows,f)=>+(100*rows.filter(f).length/rows.length).toFixed(1);
function summarise(rows){const R=rows[0].limit,P=rows[0].players,live=rows.flatMap(r=>r.turns).filter(t=>!t[3]);
 const ms=k=>{const hit=rows.map(r=>r[k]).filter(x=>x!=null);return{pct:+(100*hit.length/rows.length).toFixed(1),p10_50_90:trio(hit)}};
 return{rounds:R,players:P,ai:rows[0].ai,matches:rows.length,errors:rows.filter(r=>r.err).length,endedEarly:share(rows,r=>r.outcome==='bankruptcy'),
  firstSet:ms('firstSet'),firstMidRise:ms('firstMid'),firstSkyscraper:ms('firstSky'),firstBankruptcy:ms('firstBankrupt'),
  solventMean:+(rows.reduce((n,r)=>n+r.solvent,0)/rows.length).toFixed(2),upgrades:trio(rows.map(r=>r.builds)),
  marginScore:trio(rows.map(r=>r.marginScore)),closeFinish:share(rows,r=>r.marginScore<.15),comeback:share(rows,r=>r.leaderHalf!=null&&r.leaderHalf!==r.winner),
  seatWins:[...Array(P)].map((_,i)=>share(rows,r=>r.winner===i)),firstMoverWins:share(rows,r=>r.winner===r.first),
  lowImpactTurns:+(100*live.filter(t=>!t[1]&&t[2]<.02).length/Math.max(1,live.length)).toFixed(1),idleTurns:+(100*live.filter(t=>!t[1]&&t[2]===0).length/Math.max(1,live.length)).toFixed(1),
  sameRoundLowToSkyscraper:share(rows.filter(r=>r.firstSky!=null),r=>r.firstSky===r.firstLow)}}
(async()=>{
 const rt=createRuntime(readSources(ROOT));const play=rt.run(MATCH);
 const run=async(R,P,A,H=false,U=false)=>{const rows=[];for(let k=0;k<N;k++)rows.push(JSON.parse(await play(SEED0+k,U?300:R,P,A,H,U)));return rows};
 const configs=FULL?[20,30,40].flatMap(R=>[2,3,4].flatMap(P=>['easy','normal','hard'].map(A=>[R,P,A,false]))).concat([20,30,40].map(R=>[R,4,'normal',true]))
  :[[20,4,'normal',false],[30,4,'normal',false],[40,4,'normal',false],[30,2,'normal',false],[30,3,'normal',false]];
 const out={};for(const [R,P,A,H] of configs){const s=summarise(await run(R,P,A,H));out[`${R}r_${P}p_${A}${H?'_noTrade':''}`]=s;console.log('STUDY',JSON.stringify({config:`${R}r_${P}p_${A}${H?'_noTrade':''}`,...s}))}
 if(FULL)for(const P of [2,3,4]){const rows=await run(300,P,'normal',false,true);const fin=rows.filter(r=>r.outcome==='bankruptcy').map(r=>r.rounds);console.log('STUDY',JSON.stringify({config:`unlimited_${P}p_normal`,matches:rows.length,errors:rows.filter(r=>r.err).length,endedByBankruptcy:share(rows,r=>r.outcome==='bankruptcy'),rounds:trio(fin)}))}
 // Guard rails: wide bands around the 17 Nov 2026 study so real balance shifts are flagged, sampling noise is not.
 const errs=Object.values(out).reduce((n,s)=>n+s.errors,0);assert.equal(errs,0,'simulated matches must finish without errors');
 const s20=out['20r_4p_normal'],s30=out['30r_4p_normal'],s40=out['40r_4p_normal'];
 if(s30){assert.ok(s30.firstSet.pct>=80,'30 rounds: most matches complete a set ('+s30.firstSet.pct+'%)');
  assert.ok(s30.firstSkyscraper.pct>=65,'30 rounds: most matches reach a Skyscraper ('+s30.firstSkyscraper.pct+'%)');
  assert.ok(s30.solventMean>=2.9,'30 rounds: most players are still solvent at the end ('+s30.solventMean+')');
  assert.ok(s30.closeFinish>=12&&s30.comeback>=30,'30 rounds: finishes stay competitive');
  assert.ok(s30.seatWins.every(w=>Math.abs(w-25)<=10),'seat balance within 10 points of a fair 25%: '+s30.seatWins)}
 if(s20&&s30&&s40){assert.ok(s20.firstSkyscraper.pct<s30.firstSkyscraper.pct&&s30.firstSkyscraper.pct<=s40.firstSkyscraper.pct,'longer limits allow more development');
  assert.ok(s20.endedEarly<=s30.endedEarly&&s30.endedEarly<=s40.endedEarly,'longer limits end more matches by bankruptcy')}
 console.log(`ORIGINS ROUND STUDY ${Object.keys(out).length} configurations x ${N} matches, 0 errors`);
})().catch(e=>{console.error(e);process.exit(1)});
