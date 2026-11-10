// Endgame balance simulator: seeded AI-vs-AI matches on the headless rules core (same code as the app and the
// online engine, no UI). Measures how matches end, the building-permit bank, development and how wealth is held.
// Usage: node tests/endgame-sim.cjs <config> [n=60] [seed=50000]      configs are listed in CONFIGS below
// Prints one JSON line per match (SIM_ROWS=1) and a summary. Uses only rules code; nothing is written anywhere.
'use strict';
const path=require('node:path');
const {readSources,createRuntime}=require('../online/headless-runtime.cjs');
const ROOT=path.resolve(__dirname,'..');
const CONFIGS={
  // Living City, bankruptcy only (today's Classic) with a 300-round safety cap so stalls are measurable
  lc_classic:{lc:true,set:{maxRounds:300}},
  classic_classic:{lc:false,set:{maxRounds:300}},
  lc_r20:{lc:true,set:{mode:'timed',rounds:20,championship:1}},lc_r30:{lc:true,set:{mode:'timed',rounds:30,championship:1}},lc_r40:{lc:true,set:{mode:'timed',rounds:40,championship:1}},
  lc_plain_r30:{lc:true,set:{mode:'timed',rounds:30}},
  duel12:{lc:true,set:{mode:'timed',rounds:12,championship:1,duelDeal:3}},duel15:{lc:true,set:{mode:'timed',rounds:15,championship:1,duelDeal:3}},duel18:{lc:true,set:{mode:'timed',rounds:18,championship:1,duelDeal:3}},duel15_d2:{lc:true,set:{mode:'timed',rounds:15,championship:1,duelDeal:2}},
};
const name=process.argv[2]||'lc_classic',N=+(process.argv[3]||60),SEED=+(process.argv[4]||50000),PLAYERS=+(process.env.SIM_PLAYERS||3);
const cfg=CONFIGS[name];if(!cfg)throw Error('unknown config '+name+'; one of '+Object.keys(CONFIGS).join(', '));
const extra=process.env.SIM_SET?JSON.parse(process.env.SIM_SET):{};
const HUMAN=['1','true','yes'].includes((process.env.SIM_HUMAN||'').toLowerCase());
const MATCH=`(async(seed,lc,set,players,human)=>{let s=seed;Math.random=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296};FAST=true;GEN++;applyCity('lagos');
 newGame({lc,cash:1600,set:Object.assign({ai:'normal',speed:'fast',pot:false,maxRounds:300,city:'lagos',perks:false},set),players:[...Array(players)].map((_,i)=>({name:NAMES[i],tok:TOKENS[i],col:PCOL[i],ai:true,tl:1}))});G.sim=true;
 // Skyline Duel prototype start (simulation only): deal N streets each, value-balanced, plus optional compensation for the second seat.
 if(set.duelDeal){const pool=shuffle(SQ.map((_,i)=>i).filter(i=>SQ[i].t==='prop'&&G.own[i].o<0));const v=G.players.map(()=>0);
   for(let k=0;k<set.duelDeal*G.players.length;k++){const pid=v.indexOf(Math.min(...v));const i=pool.pop();G.own[i].o=pid;v[pid]+=SQ[i].p}
   if(set.duelComp){const second=G.players[((G.first||0)+1)%G.players.length];second.cash+=set.duelComp}}
 const M={zeroFrom:null,zeroRounds:0,homeBlockedRounds:0,homeBlockedOpportunities:0,lastRound:0,leaders:{},builds:0,sells:0,trades:0,auctions:0,levelsAt:{},cashShareAt:{}};
 if(!globalThis.__simHooked){globalThis.__simHooked=1;
   const b0=build;build=function(){globalThis.__M.builds++;return b0.apply(this,arguments)};
   const s0=sell;sell=function(){globalThis.__M.sells++;return s0.apply(this,arguments)};
   const t0=executeTrade;executeTrade=function(){globalThis.__M.trades++;return t0.apply(this,arguments)};
   const a0=auction;auction=function(){globalThis.__M.auctions++;return a0.apply(this,arguments)};
   // "Guarded human" proxy for seat 0: never accepts or proposes trades (what most real players do vs. the AI).
   const ac0=aiAccept;aiAccept=function(t){if(globalThis.__human&&t.to===0)return false;return ac0.apply(this,arguments)};
   const pr0=aiProposeTrade;aiProposeTrade=function(p){if(globalThis.__human&&p.id===0)return null;return pr0.apply(this,arguments)};
   const p0=playTurn;playTurn=function(p){const M=globalThis.__M;if(G.round!==M.lastRound){M.lastRound=G.round;
       if(G.houses<=0){
         M.zeroRounds++;if(M.zeroFrom==null)M.zeroFrom=G.round;
         // Distinguish an empty bank from a real development block. Test legal builds
         // with one temporary home permit, then restore state before the real turn.
         const saved=G.houses;let opportunities=0;
         try{G.houses=1;for(let i=0;i<SQ.length;i++){
           const o=G.own[i];if(o.o>=0&&!P(o.o).bankrupt&&o.h<3&&canBuild(o.o,i))opportunities++
         }}finally{G.houses=saved}
         if(opportunities){M.homeBlockedRounds++;M.homeBlockedOpportunities+=opportunities}
       }
       const st=standings();M.leaders[G.round]=st[0].id;
       if([10,20,30,40,60,100,150].includes(G.round)){M.levelsAt[G.round]=G.own.reduce((n,o)=>n+(o.o>=0?o.h:0),0);
         const nw=alive().reduce((n,q)=>n+netWorth(q),0),cs=alive().reduce((n,q)=>n+Math.max(0,q.cash),0);M.cashShareAt[G.round]=nw?+(cs/nw).toFixed(2):0}}
     return p0.apply(this,arguments)}}
 globalThis.__M=M;globalThis.__human=human;let err=null;const pe=globalThis.__onErr;globalThis.__onErr=e=>err=e;try{await run()}finally{globalThis.__onErr=pe}
 const st=standings(),w=st[0],bank=G.players.filter(p=>p.bankrupt).length,lv=[0,0,0,0,0,0];G.own.forEach(o=>{if(o.o>=0)lv[o.h]++});
 const nw=G.players.map(p=>p.bankrupt?0:netWorth(p)),cash=G.players.map(p=>p.bankrupt?0:Math.max(0,p.cash));
 const half=Math.max(1,Math.floor(G.round/2)),leaderHalf=M.leaders[half];
 return JSON.stringify({seed,err:err&&String(err),rounds:G.round,outcome:alive().length<=1?'bankruptcy':(G.set.mode==='timed'?'round-limit':'stalled'),bankrupt:bank,
   winner:w.id,first:G.first||0,comeback:leaderHalf!=null&&leaderHalf!==w.id?1:0,houses:G.houses,towers:G.hotels,zeroFrom:M.zeroFrom,zeroRounds:M.zeroRounds,homeBlockedRounds:M.homeBlockedRounds,homeBlockedOpportunities:M.homeBlockedOpportunities,levels:lv,
   landmarks:Object.keys(G.lm||{}).length,builds:M.builds,sells:M.sells,trades:M.trades,auctions:M.auctions,levelsAt:M.levelsAt,cashShareAt:M.cashShareAt,
   scores:G.players.map(p=>skylineChampionshipScore(p)),bankruptSeats:G.players.map(p=>!!p.bankrupt),netWorth:nw,cash,gap:(()=>{const a=[...nw].sort((x,y)=>y-x);return a[0]?+((a[0]-(a[1]||0))/a[0]).toFixed(2):0})(),
   owned:G.own.filter((o,i)=>o.o>=0&&SQ[i].t==='prop').length,monopolies:Object.keys(GROUPS).filter(g=>G.players.some(p=>!p.bankrupt&&ownsAll(p.id,g))).length})})`;
(async()=>{
  const rt=createRuntime(readSources(ROOT));const play=rt.run(MATCH);const rows=[];const t0=Date.now();
  for(let k=0;k<N;k++){const r=JSON.parse(await play(SEED+k,cfg.lc,Object.assign({},cfg.set,extra),PLAYERS,HUMAN));rows.push(r);if(process.env.SIM_ROWS)console.log(JSON.stringify(r))}
  const avg=f=>+(rows.reduce((n,r)=>n+f(r),0)/rows.length).toFixed(2),pct=f=>Math.round(rows.filter(f).length/rows.length*100);
  const med=a=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)]};
  const wins=[...Array(PLAYERS)].map((_,i)=>pct(r=>r.winner===i));const firstWin=pct(r=>r.winner===r.first);
  const summary={config:name,human:HUMAN,extra,players:PLAYERS,matches:rows.length,errors:rows.filter(r=>r.err).length,
    avgRounds:avg(r=>r.rounds),medianRounds:med(rows.map(r=>r.rounds)),bankruptcyEnd:pct(r=>r.outcome==='bankruptcy'),stalledAtCap:pct(r=>r.outcome==='stalled'),roundLimitEnd:pct(r=>r.outcome==='round-limit'),
    houseBankEmptyPct:pct(r=>r.zeroFrom!=null),avgFirstEmptyRound:avg(r=>r.zeroFrom??0)&&+(rows.filter(r=>r.zeroFrom!=null).reduce((n,r)=>n+r.zeroFrom,0)/Math.max(1,rows.filter(r=>r.zeroFrom!=null).length)).toFixed(1),
    avgRoundsWithEmptyBank:avg(r=>r.zeroRounds),bankBlockedBuildPct:pct(r=>r.homeBlockedRounds>0),avgBankBlockedRounds:avg(r=>r.homeBlockedRounds),avgBankBlockedOpportunities:avg(r=>r.homeBlockedOpportunities),avgSkyscrapers:avg(r=>r.levels[5]),avgHighRise:avg(r=>r.levels[3]),avgLandmarks:avg(r=>r.landmarks),avgBuildingLevels:avg(r=>r.levels[1]+2*r.levels[2]+3*r.levels[3]+5*r.levels[5]),
    avgCashShareEnd:avg(r=>{const nw=r.netWorth.reduce((a,b)=>a+b,0);return nw?r.cash.reduce((a,b)=>a+b,0)/nw:0}),avgWinnerGap:avg(r=>r.gap),closeFinishPct:pct(r=>r.gap<0.15),comebackPct:pct(r=>r.comeback),
    winsBySeat:wins,firstPlayerWinPct:firstWin,cashLeaderAlsoWinnerPct:pct(r=>{const max=Math.max(...r.cash);return r.cash[r.winner]===max}),avgTrades:avg(r=>r.trades),avgSells:avg(r=>r.sells),avgMonopolies:avg(r=>r.monopolies),seconds:Math.round((Date.now()-t0)/1000)};
  console.log('SUMMARY '+JSON.stringify(summary));
})().catch(e=>{console.error(e);process.exit(1)});
