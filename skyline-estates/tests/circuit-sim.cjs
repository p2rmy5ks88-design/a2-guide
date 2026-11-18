// Skyline Circuit simulation (research; thresholds in CIRCUIT.md were fixed before any run).
//   node tests/circuit-sim.cjs                       CI sample (200 held-out seeds): asserts all 12 thresholds; seat balance
//                                                    gets 8 points of tolerance at this sample size (the 1,000-match verdict uses 5)
//   CIRCUIT_N=1000 CIRCUIT_SEED=900000 node ...      full verdict run (held-out seeds)
//   CIRCUIT_SEED=1 node ...                           development seeds (tuning only)
//   CIRCUIT_TARGET / CIRCUIT_ROUNDS override the Standard match for tuning; CIRCUIT_REPORT=1 prints every metric.
'use strict';
const assert=require('node:assert/strict'),SC=require('../lib/circuit-rules.js');
const N=+(process.env.CIRCUIT_N||200),SEED=+(process.env.CIRCUIT_SEED||900000),RULES=process.env.CIRCUIT_RULES?JSON.parse(process.env.CIRCUIT_RULES):{};
const LENGTHS={quick:{target:+(process.env.CIRCUIT_TARGET_QUICK||0),rounds:30},standard:{target:+(process.env.CIRCUIT_TARGET||0),rounds:+(process.env.CIRCUIT_ROUNDS||0)},extended:{target:+(process.env.CIRCUIT_TARGET_EXT||0),rounds:60}};
const SEAT_TOL=N>=1000?5:8;
const pct=(v,q)=>{if(!v.length)return null;const s=[...v].sort((a,b)=>a-b),k=(s.length-1)*q,f=Math.floor(k),c=Math.min(f+1,s.length-1);return +(s[f]+(s[c]-s[f])*(k-f)).toFixed(1)};
const share=(a,f)=>+(100*a.filter(f).length/Math.max(1,a.length)).toFixed(1);
// Play one match, collecting per-turn impact and per-decision route values.
function play(seed,players,opt){const s=SC.newMatch({seed,players,target:opt.target,rounds:opt.rounds,rules:RULES});const pre=s.cfg.routeTiming==='before-roll';
 const turns=[],decisions=[];let cur=null;const snap=p=>({cash:p.cash,own:SC.PROPS.filter(id=>s.own[id].o===p.id).length,lv:SC.PROPS.reduce((n,id)=>n+(s.own[id].o===p.id?s.own[id].h:0),0),nw:SC.netWorth(s,p)});
 const close=()=>{if(!cur)return;const p=s.players[cur.pid],b=snap(p);if(pre&&(p.st.plansUsed||0)>cur.plans)cur.routes++;const decision=b.own!==cur.a.own||b.lv>cur.a.lv;turns.push({round:cur.round,decision,rel:cur.a.nw>0?Math.abs(b.cash-cur.a.cash)/cur.a.nw:0,routes:cur.routes});cur=null};
 const curve={};let lastRound=s.round;const mark=()=>{if(s.round!==lastRound||s.over){const v=s.players.map(p=>p.inf).sort((a,b)=>b-a);curve[lastRound]={lead:v[0],last:v[v.length-1]};lastRound=s.round}};
 let guard=0;while(!s.over&&guard++<200000){mark();const pd=SC.pending(s);if(!pd)break;
  if(pd.type==='roll'){close();cur={pid:pd.player,round:s.round,a:snap(s.players[pd.player]),routes:0,plans:s.players[pd.player].st.plansUsed||0};if(pre){const e=SC.planValues(s,pd.player);decisions.push(Math.abs(e.stay-e.cross))}}
  if(pd.type==='route'){cur.routes++;const o=SC.routeOptions(s,pd.player);decisions.push(Math.abs(o.stay-o.cross))}
  SC.act(s,pd.player,SC.ai(s,pd.player))}
 close();mark();if(!s.over)throw Error('unfinished '+seed);
 const inf=s.players.map(p=>p.inf),w=s.winner,sorted=[...inf].sort((a,b)=>b-a),second=s.players.filter(p=>p.id!==w).reduce((m,p)=>Math.max(m,p.inf),0);
 const half=Math.max(1,Math.floor(s.round/2));
 return{seed,round:s.round,end:s.endReason,winner:w,players:players.map(p=>p.ai),hist:s.hist,closeFinish:inf[w]>0&&second>=.85*inf[w],comeback:s.hist.leaders[half]!=null&&s.hist.leaders[half]!==w,turns,decisions,curve,hash:SC.hash(s)}}
function run(name,count,players,opt,rotate){const rows=[];for(let k=0;k<N;k++){const seed=SEED+k;let ps=players(k);rows.push(play(seed,ps,opt))}return rows}
const ident=n=>()=>[...Array(n)].map((_,i)=>({name:'P'+i,ai:'route'}));
function metrics(rows){const t=rows.flatMap(r=>r.turns),d=rows.flatMap(r=>r.decisions),wins=rows.filter(r=>r.end==='influence').map(r=>r.round);
 return{matches:rows.length,endInfluence:share(rows,r=>r.end==='influence'),endSolvent:share(rows,r=>r.end==='last-solvent'),endLimit:share(rows,r=>r.end==='round-limit'),
  victoryRound:[pct(wins,.1),pct(wins,.5),pct(wins,.9)],earlyVictory:share(rows,r=>r.end==='influence'&&r.round<15),earlyVictory12:share(rows,r=>r.end==='influence'&&r.round<12),
  firstMid:pct(rows.map(r=>r.hist.firstMid).filter(x=>x!=null),.5),midPct:share(rows,r=>r.hist.firstMid!=null),firstSky:pct(rows.map(r=>r.hist.firstSky).filter(x=>x!=null),.5),skyPct:share(rows,r=>r.hist.firstSky!=null),
  firstBuy:pct(rows.map(r=>r.hist.firstBuy).filter(x=>x!=null),.5),bankruptcyPct:share(rows,r=>r.hist.firstBankrupt!=null),
  turnsWithRoute:share(t,x=>x.routes>0),routesPerTurn:+(t.reduce((n,x)=>n+x.routes,0)/Math.max(1,t.length)).toFixed(2),meaningful:share(d,x=>x>=25),
  closeFinish:share(rows,r=>r.closeFinish),
  // Influence growth: median leader and trailing-player influence at the end of rounds 5/10/15/20 (matches still running).
  influenceCurve:Object.fromEntries([5,10,15,20].map(k=>{const c=rows.map(r=>r.curve[k]).filter(Boolean);return[k,{lead:pct(c.map(x=>x.lead),.5),last:pct(c.map(x=>x.last),.5),running:c.length}]})),comeback:share(rows,r=>r.comeback),lowImpact:share(t,x=>!x.decision&&x.rel<.02)}}
(async()=>{
 const std=LENGTHS.standard;std.target=std.target||SC.CFG.target;std.rounds=std.rounds||SC.CFG.rounds;
 const out={},seats={};
 for(const n of [2,3,4]){const rows=run('ident'+n,N,ident(n),std);out['standard_'+n+'p']=metrics(rows);seats[n]=[...Array(n)].map((_,i)=>share(rows,r=>r.winner===i));
  if(n===4){const a=rows.map(r=>r.hash),b=run('repeat',N,ident(n),std).map(r=>r.hash);out.deterministic=a.every((h,i)=>h===b[i])}}
 // Route-aware against random-route: 2 players with seats alternating; 4 players with the route-aware seat rotating.
 const h2=run('adv2',N,k=>k%2?[{ai:'random'},{ai:'route'}]:[{ai:'route'},{ai:'random'}],std);const adv2=share(h2,(r)=>r.players[r.winner]==='route');
 const h4=run('adv4',N,k=>[0,1,2,3].map(i=>({ai:i===k%4?'route':'random'})),std);const adv4=share(h4,(r)=>r.players[r.winner]==='route');
 const m4=out.standard_4p,all=[out.standard_2p,out.standard_3p,out.standard_4p];
 const verdict=[
  ['1 route choices happen (>=60% of turns)',m4.turnsWithRoute,m4.turnsWithRoute>=60],
  ['2 route choices matter (>=35% differ by >=25)',m4.meaningful,m4.meaningful>=35],
  ['3 2-player advantage route vs random (60-85%)',adv2,adv2>=60&&adv2<=85],
  ['4 4-player advantage one route vs three random (>=35%)',adv4,adv4>=35],
  ['5 first Mid-rise median round 4-12; Skyscraper in >=60%',[m4.firstMid,m4.skyPct],m4.firstMid>=4&&m4.firstMid<=12&&m4.skyPct>=60],
  ['6 early influence victory before round 15 (<5%)',m4.earlyVictory,all.every(m=>m.earlyVictory<5)],
  ['7 natural endings >=70%; median victory round 18-32',[100-m4.endLimit,m4.victoryRound[1]],all.every(m=>100-m.endLimit>=70)&&m4.victoryRound[1]>=18&&m4.victoryRound[1]<=32],
  ['8 close finishes (>=20%)',m4.closeFinish,m4.closeFinish>=20],
  ['9 comebacks (>=25%)',m4.comeback,m4.comeback>=25],
  ['10 seat balance (within '+SEAT_TOL+' points; first mover <= +'+SEAT_TOL+')',seats,Object.entries(seats).every(([n,w])=>w.every(x=>Math.abs(x-100/n)<=SEAT_TOL))],
  ['11 low-impact turns (<=42%)',m4.lowImpact,m4.lowImpact<=42],
  ['12 deterministic, 0 errors',out.deterministic,out.deterministic]];
 // Quick criteria (CIRCUIT.md, Quick mode): Q1-Q4 and Q8-Q12 are the Standard checks; Q5-Q7 are Quick-specific.
 const quick=[...verdict.slice(0,4).map(v=>['Q'+v[0],v[1],v[2]]),
  ['Q5 first Mid-rise median round 3-8; Skyscraper in >=50%',[m4.firstMid,m4.skyPct],m4.firstMid>=3&&m4.firstMid<=8&&m4.skyPct>=50],
  ['Q6 influence victory before round 12 (<5%)',all.map(m=>m.earlyVictory12),all.every(m=>m.earlyVictory12<5)],
  ['Q7 natural endings >=70%; median victory round 13-16',[100-m4.endLimit,m4.victoryRound[1]],all.every(m=>100-m.endLimit>=70)&&m4.victoryRound[1]>=13&&m4.victoryRound[1]<=16],
  ...verdict.slice(7).map(v=>['Q'+v[0],v[1],v[2]])];
 const isQuick=process.env.CIRCUIT_CRITERIA==='quick';
 console.log('CIRCUIT',JSON.stringify({seeds:[SEED,SEED+N-1],standard:std,rules:RULES,metrics:out,seats,adv2,adv4}));
 for(const [name,val,pass] of verdict)console.log((pass?'PASS ':'FAIL ')+name+' :: '+JSON.stringify(val));
 if(isQuick)for(const [name,val,pass] of quick)console.log((pass?'QPASS ':'QFAIL ')+name+' :: '+JSON.stringify(val));
 // Default (CI): every threshold must hold. CIRCUIT_ASSERT=0 only reports (tuning runs, Quick/Extended studies).
 assert.ok(out.deterministic,'Circuit must be deterministic');
 if(process.env.CIRCUIT_ASSERT!=='0'){const failed=(isQuick?quick:verdict).filter(v=>!v[2]).map(v=>v[0]);assert.deepEqual(failed,[],'thresholds failed')}
})().catch(e=>{console.error(e);process.exit(1)});
