/* Empire prototype balance simulation. Usage: node tests/empire-sim.cjs [cfgJSON] [matches] [players] [firstSeed]. Held-out verdict seeds start at 950000. */
const E=require(require('node:path').resolve(__dirname,'../lib/career-empire-rules.js'));
function run(cfg,N=400,players=4,start=1){const r={why:{},rounds:[],seat:Array(players).fill(0),close:0,comeback:0,errors:0,earliest:99,tower:0,ms:[0,0,0],bank:0};
 for(let seed=start;seed<start+N;seed++){const s=E.newMatch({seed,cfg,ai:Array(players).fill(1),names:['A','B','C','D'].slice(0,players)});let half=null,n=0;
  try{while(s.phase!=='over'){if(n++>9000)throw Error('stall');const pd=E.pending(s);const x=E.act(s,pd.player,E.ai(s,pd.player));if(!x.ok)throw Error(x.error);if(half===null&&s.round>s.cfg.rounds/2)half=E.ranking(s)[0].id}}catch(e){r.errors++;continue}
  r.why[s.endReason]=(r.why[s.endReason]||0)+1;if(s.endReason==='milestones')r.earliest=Math.min(r.earliest,s.round);r.rounds.push(s.round);r.seat[s.winner]++;r.tower+=s.tower.stage;
  r.bank+=s.players.filter(p=>p.out).length;const k=E.ranking(s);if(k.length>1&&k[1].score>=.85*k[0].score)r.close++;if(half!==null&&half!==s.winner)r.comeback++;
  const m=E.milestones(s,s.players[s.winner]);[m.economic,m.development,m.influence].forEach((x,i)=>r.ms[i]+=x.done)}
 r.rounds.sort((a,b)=>a-b);const pct=x=>Math.round(100*x/N);
 return{why:Object.fromEntries(Object.entries(r.why).map(([k,v])=>[k,pct(v)])),earliest:r.earliest,median:r.rounds[N>>1],seat:r.seat.map(pct),close:pct(r.close),comeback:pct(r.comeback),towerStage:+(r.tower/N).toFixed(1),winnerMilestones:r.ms.map(pct),bankrupt:+(r.bank/N).toFixed(2),errors:r.errors}}
module.exports=run;if(require.main===module)console.log(JSON.stringify(run(JSON.parse(process.argv[2]||'{}'),+process.argv[3]||400,+process.argv[4]||4,+process.argv[5]||1)));
