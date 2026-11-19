/* Dominion prototype balance simulation. Usage: node tests/dominion-sim.cjs [cfgJSON] [matches] [players] [firstSeed]. Held-out verdict seeds start at 900000. */
const D=require(require("node:path").resolve(__dirname,"../lib/career-dominion-rules.js"));
function run(cfg,N=400,players=4,start=1){const r={early:0,rounds:[],seat:Array(players).fill(0),close:0,comeback:0,maxD:[],contests:0,errors:0,earliest:99};
 for(let seed=start;seed<start+N;seed++){const s=D.newMatch({seed,cfg,ai:Array(players).fill(1),names:['A','B','C','D'].slice(0,players)});let half=null;
  try{while(s.phase!=='over'){const pd=D.pending(s);const a=D.ai(s,pd.player);if(a.type==='contest')r.contests++;const x=D.act(s,pd.player,a);if(!x.ok)throw Error(x.error);
   if(!half&&s.round>s.cfg.rounds/2)half=D.ranking(s)[0].id}}catch(e){r.errors++;continue}
  if(s.endReason==='district-control'){r.early++;r.earliest=Math.min(r.earliest,s.round)}r.rounds.push(s.round);r.seat[s.winner]++;
  const k=D.ranking(s);if(k.length>1&&k[1].cp>=.85*k[0].cp)r.close++;if(half!==null&&half!==s.winner)r.comeback++;
  r.maxD.push(Math.max(...s.checks.flatMap(c=>c.players.map(p=>p.districts.length))))}
 r.rounds.sort((a,b)=>a-b);const pct=x=>Math.round(100*x/N);
 return{early:pct(r.early),earliest:r.earliest,median:r.rounds[N>>1],seat:r.seat.map(pct),close:pct(r.close),comeback:pct(r.comeback),maxD:r.maxD.reduce((a,b)=>a+b,0)/N,contests:+(r.contests/N).toFixed(1),errors:r.errors}}
module.exports=run;if(require.main===module){const cfg=JSON.parse(process.argv[2]||'{}');console.log(JSON.stringify(run(cfg,+process.argv[3]||400,+process.argv[4]||4,+process.argv[5]||1)))}
