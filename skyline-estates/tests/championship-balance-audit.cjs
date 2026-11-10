// Compare final-score weights on identical seeded match trajectories. This is
// a sensitivity audit, not an agent trained to exploit each alternative formula.
'use strict';
const cp=require('node:child_process'),path=require('node:path'),assert=require('node:assert/strict');
const samples=Number(process.env.CHAMP_BALANCE_SAMPLES||300);
assert.ok(Number.isInteger(samples)&&samples>0);
const variants={current:s=>s.total,noDistrict:s=>s.total-s.districts,doubleDistrict:s=>s.total+s.districts,development20:s=>s.total+Math.round(s.buildings*.2)};
const guarded=process.env.CHAMP_BALANCE_GUARDED!=='0';
const counts=process.env.CHAMP_BALANCE_PLAYERS?[Number(process.env.CHAMP_BALANCE_PLAYERS)]:[2,3,4];
for(const players of counts){
 assert.ok([2,3,4].includes(players));
 const run=cp.spawnSync(process.execPath,[path.join(__dirname,'endgame-sim.cjs'),'lc_r30',String(samples),'93000'],{env:{...process.env,SIM_PLAYERS:String(players),SIM_HUMAN:guarded?'1':'0',SIM_ROWS:'1'},encoding:'utf8',maxBuffer:32e6});
 assert.equal(run.status,0,run.stderr);
 const rows=run.stdout.split('\n').filter(l=>l.startsWith('{')).map(l=>JSON.parse(l));
 assert.equal(rows.length,samples);
 assert.ok(rows.every(r=>!r.err&&r.rounds<=31&&r.outcome!=='stalled'),'30-round Championship must always finish');
 const pct=n=>+(100*n/samples).toFixed(1);
 const bySeat=Array(players).fill(0),byOrder=Array(players).fill(0),starts=Array(players).fill(0),out={players,samples,guarded,variants:{}};
 for(const r of rows){bySeat[r.winner]++;byOrder[(r.winner-r.first+players)%players]++;starts[r.first]++}
 out.startsBySeat=starts;out.winsBySeat=bySeat.map(pct);out.winsByTurnOrder=byOrder.map(pct);
 for(const [name,value] of Object.entries(variants)){
  let changed=0,cash=0,ties=0;
  for(const r of rows){
   const ranked=r.scores.map((s,id)=>({id,v:value(s)})).filter(s=>!r.bankruptSeats[s.id]).sort((a,b)=>b.v-a.v||r.netWorth[b.id]-r.netWorth[a.id]||a.id-b.id);
   const winner=ranked[0].id;
   if(name==='current')assert.equal(winner,r.winner,'component scoring reproduces game winner');
   changed+=winner!==r.winner;cash+=r.cash[winner]===Math.max(...r.cash);ties+=ranked.length>1&&ranked[0].v===ranked[1].v;
  }
  out.variants[name]={winnerChangedPct:pct(changed),cashLeaderWinsPct:pct(cash),topScoreTiesPct:pct(ties)};
 }
 console.log('BALANCE '+JSON.stringify(out));
}
