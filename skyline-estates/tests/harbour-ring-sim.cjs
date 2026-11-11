// Harbour Ring balance simulation: computer vs computer over many seeded matches. Prints first/second-player
// win rates, margins, bankruptcies and how often the lead changes, and fails if the mode drifts out of balance.
//   node tests/harbour-ring-sim.cjs [matches]
'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const HR=require('../lib/harbour-ring-rules.js');
const src=fs.readFileSync(path.join(__dirname,'..','game.html'),'utf8');const i=src.indexOf('const CITY_RAW=')+15;
const RAW=JSON.parse(src.slice(i,src.indexOf(';\n',i)));const cities=Object.values(RAW).map(c=>({key:c.key,name:c.name,country:c.country,props:c.props}));
const N=+process.argv[2]||4000,ov=process.env.HR_CFG?JSON.parse(process.env.HR_CFG):null;if(ov)Object.assign(HR.CFG,{});
function play(seed,first){const s=HR.newMatch({seed,first,cities,players:[{name:'A',ai:true},{name:'B',ai:true}]});let guard=0,lead=null,swaps=0;
  while(!s.over&&guard++<5000){const D=HR.pending(s);if(D.type==='bid'){HR.act(s,0,HR.ai(s,0));if(!s.over&&HR.pending(s)===D)HR.act(s,1,HR.ai(s,1))}else HR.act(s,D.p,HR.ai(s,D.p));
    if(D.type==='move'){const l=HR.score(s,0)>=HR.score(s,1)?0:1;if(lead!=null&&l!==lead)swaps++;lead=l}}
  assert.ok(s.over,'match '+seed+' did not finish');return{s,swaps}}
let firstWins=0,bank=0,close=0,margin=0,swapT=0,built=0,takeovers=0,auctions=0,towersT=0,rounds=0;
for(let k=0;k<N;k++){const first=k&1,{s,swaps}=play(1000+k,first);if(s.winner===first)firstWins++;if(s.players.some(p=>p.bankrupt))bank++;
  const [a,b]=s.final,m=Math.abs(a-b)/Math.max(1,Math.max(a,b));margin+=m;if(m<0.1)close++;swapT+=swaps;rounds+=s.round;
  towersT+=HR.towers(s,0)+HR.towers(s,1);built+=s.tiles.filter(t=>t.lv>0).length;
  takeovers+=s.log.filter(l=>/took over|blocked the takeover/.test(l.txt)).length;auctions+=s.log.filter(l=>/sealed bid/.test(l.txt)).length}
const r={matches:N,firstWinPct:+(100*firstWins/N).toFixed(1),bankruptPct:+(100*bank/N).toFixed(1),closePct:+(100*close/N).toFixed(1),avgMarginPct:+(100*margin/N).toFixed(1),
  leadChanges:+(swapT/N).toFixed(2),builtTiles:+(built/N).toFixed(2),towers:+(towersT/N).toFixed(2),takeovers:+(takeovers/N).toFixed(2),auctionLines:+(auctions/N).toFixed(2),avgRound:+(rounds/N).toFixed(1)};
console.log('HARBOUR RING SIM',JSON.stringify(r));
assert.ok(r.firstWinPct>=45&&r.firstWinPct<=55,'first player win rate out of 45–55%');
assert.ok(r.bankruptPct<=12,'too many bankruptcies');
assert.ok(r.leadChanges>=1,'lead almost never changes');
console.log('PASS balance within limits');
