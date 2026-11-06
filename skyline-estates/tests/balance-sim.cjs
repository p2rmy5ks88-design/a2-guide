// Task 14: reproducible balance matrix (seeded, AI-only, 3 players, FAST engine).
// Usage: node tests/balance-sim.cjs [configId ...] > out.csv   (no args = all configs)
// Each row: config,run,seed,first,winner,winnerFromFirst,boostSeat,boostWon,rounds,outcome,bankrupt,leader20,comeback,builds,auctions,trades
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const path=require('node:path');
const CONFIGS={
 base:{n:90,seed:5000,set:{perks:false},tl:[1,1,1]},
 tier6:{n:90,seed:6000,set:{},boost:6},     // one seat Chaotic (tier 6), others tier 1; boosted seat rotates
 tier3:{n:60,seed:7000,set:{},boost:3},     // one seat Epic (tier 3)
 tier3b:{n:90,seed:17000,set:{},boost:3},   // replication of tier3 with fresh seeds
 events:{n:60,seed:8000,set:{perks:false,events2:true}},
 pulse:{n:60,seed:9000,set:{perks:false,marketPulse:true}},
 stockholm:{n:30,seed:10000,set:{perks:false,city:'stockholm'}},
 tokyo:{n:30,seed:11000,set:{perks:false,city:'tokyo'}},
 dubai:{n:30,seed:12000,set:{perks:false,city:'dubai'}},
 hard:{n:30,seed:13000,set:{perks:false,ai:'hard'}},
 easy:{n:30,seed:14000,set:{perks:false,ai:'easy'}},
 classic200:{n:200,seed:30000,set:{perks:false}},           // Living City comparisons: same seeds, classic rules
 lc200:{n:200,seed:30000,set:{perks:false},lc:true}         // Living City V2 rules (offline rule version 2)
};
(async()=>{
 const want=process.argv.slice(2).length?process.argv.slice(2):Object.keys(CONFIGS);
 const browser=await chromium.launch({headless:true,args:['--disable-webgl'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const page=await browser.newPage();await page.route('https://**/*',r=>r.abort());
 await page.addInitScript(()=>localStorage.setItem('skylinePrefs',JSON.stringify({nick:'Sim',nickSet:true,welcomed:1,tutDone:1,flat2d:true,stats:{games:9}})));
 await page.goto('file://'+path.resolve(__dirname,'../index.html'));await page.locator('#boot').waitFor({state:'detached',timeout:25000});
 console.log('config,run,seed,first,winner,winnerFromFirst,boostSeat,boostWon,rounds,outcome,bankrupt,leader20,comeback,builds,auctions,trades');
 for(const id of want){const c=CONFIGS[id];if(!c)throw Error('unknown config '+id);
  const rows=await page.evaluate(async({id,c})=>{
   const C={b:0,a:0,t:0};let snap=null;
   if(!window.__balHooks){window.__balHooks=1;
    const b0=build;build=function(){C0().b++;return b0.apply(this,arguments)};
    const a0=auction;auction=function(){C0().a++;return a0.apply(this,arguments)};
    const t0=executeTrade;executeTrade=function(){C0().t++;return t0.apply(this,arguments)};
    const p0=playTurn;playTurn=function(){const s=window.__balSnap;if(s&&s.v===null&&G.round>=20)s.v=standings()[0].id;return p0.apply(this,arguments)}}
   window.__balC=C;window.C0=()=>window.__balC;
   const prevR=Math.random,prevF=FAST,out=[];
   try{for(let k=0;k<c.n;k++){const seed=(c.seed+k)>>>0;let s=seed;Math.random=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296};FAST=true;
     C.b=C.a=C.t=0;window.__balSnap={v:null};
     const boostSeat=c.boost?k%3:-1,tl=[0,1,2].map(i=>i===boostSeat?c.boost:(c.tl?c.tl[i]:1));
     GEN++;newGame({lc:!!c.lc,cash:1600,set:{ai:'normal',speed:'fast',pot:false,maxRounds:300,city:'lagos',...c.set},players:[0,1,2].map(i=>({name:NAMES[i],tok:TOKENS[i],col:PCOL[i],ai:true,tl:tl[i]}))});G.sim=true;
     let err=null;const pe=window.__onErr;window.__onErr=e=>err=e;try{await run()}finally{window.__onErr=pe}
     const ended=!err&&endCheck(),win=ended?standings()[0].id:-1,first=G.first||0,l20=window.__balSnap.v;
     out.push([id,k+1,seed,first,win,win<0?-1:(win-first+3)%3,boostSeat,boostSeat<0?'':(win===boostSeat?1:0),G.round,err?'error':ended?'finished':'round-limit',G.players.filter(p=>p.bankrupt).length,l20==null?'':l20,win<0||l20==null?'':(win!==l20?1:0),C.b,C.a,C.t].join(','))}}
   finally{Math.random=prevR;FAST=prevF}
   return out},{id,c});
  rows.forEach(r=>console.log(r))}
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
