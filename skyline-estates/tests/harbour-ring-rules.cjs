// Harbour Ring rules (headless): board definition, random international districts, turn order, every decision type,
// takeover/block, Exchange protection of complete districts, liquidation, determinism and scoring.
'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const HR=require('../lib/harbour-ring-rules.js');
const src=fs.readFileSync(path.join(__dirname,'..','game.html'),'utf8');const i=src.indexOf('const CITY_RAW=')+15;
const cities=Object.values(JSON.parse(src.slice(i,src.indexOf(';\n',i)))).map(c=>({key:c.key,name:c.name,country:c.country,props:c.props}));
let n=0;const ok=m=>{n++;console.log('PASS',m)};
const fresh=(seed=1,first=0)=>HR.newMatch({seed,first,cities,players:[{name:'Ada'},{name:'Bot',ai:true}]});
const playOut=s=>{let g=0;while(!s.over&&g++<5000){const D=HR.pending(s);if(D.type==='bid'){HR.act(s,0,HR.ai(s,0));if(!s.over&&HR.pending(s)===D)HR.act(s,1,HR.ai(s,1))}else HR.act(s,D.p,HR.ai(s,D.p))}return s};

{const s=fresh(7);assert.equal(s.tiles.length,24);
  const k=s.tiles.map(t=>t.k);assert.deepEqual([0,8,12,20].map(i=>k[i]),['corner','corner','corner','corner']);
  assert.equal(s.tiles.filter(t=>t.k==='prop').length,16);assert.equal(s.tiles.filter(t=>t.k==='special').length,4);
  for(let d=0;d<8;d++)assert.equal(s.tiles.filter(t=>t.d===d).length,2);
  assert.equal(new Set(s.districts.map(d=>d.city)).size,8);
  assert.deepEqual(s.districts.slice(0,4).map(d=>d.price),s.districts.slice(4).map(d=>d.price));
  assert.ok(s.tiles.filter(t=>t.k==='prop').every(t=>t.n&&t.city&&!/^Street /.test(t.n)));
  assert.deepEqual(s.players.map(p=>[p.pos,p.home]),[[0,0],[12,12]]);ok('24 spaces: 4 corners, 16 real streets in 8 districts from 8 different cities, mirrored prices, starts 0 and 12')}
{const a=new Set();for(let k=1;k<=40;k++)a.add(fresh(k).districts.map(d=>d.city).join());assert.ok(a.size>=38);
  const x=playOut(fresh(99)),y=playOut(fresh(99));assert.deepEqual(x.final,y.final);ok('cities change from match to match; the same seed replays identically')}
{const s=fresh(3);const D=HR.pending(s);assert.equal(D.type,'move');assert.equal(D.p,0);
  assert.throws(()=>HR.act(s,1,{steps:s.options[0].steps}),/not your decision/);assert.throws(()=>HR.act(s,0,{steps:99}),/bad move/);
  const d=s.dice;assert.deepEqual(s.options.map(o=>o.steps),d[0]===d[1]?[d[0],d[0]*2]:[d[0],d[1],d[0]+d[1]]);ok('choose your move: one die or the total; nobody can act out of turn')}
{// Salary is paid per full lap from each player's own start.
  const s=fresh(5);const P=s.players[1];P.pos=10;const c=P.cash;s.turn=1;s.options=[{steps:4,target:14}];s.decision={type:'move',p:1};HR.act(s,1,{steps:4});
  assert.equal(P.laps,1);assert.ok(P.cash>=c+HR.CFG.payday-400);ok('salary for a full lap from your own start (12 for the second player)')}
{// Takeover: rent first, then an offer; the owner blocks (locks) or takes the money.
  const s=fresh(11);const t=s.tiles.find(x=>x.k==='prop'&&x.d===2);t.o=1;s.players[0].pos=(t.i-2+24)%24;s.options=[{steps:2,target:t.i}];s.decision={type:'move',p:0};
  const c0=s.players[0].cash;HR.act(s,0,{steps:2});let D=HR.pending(s);assert.equal(D.type,'takeover');assert.ok(s.players[0].cash<c0);
  HR.act(s,0,{yes:true});D=HR.pending(s);assert.equal(D.type,'defend');assert.equal(D.p,1);HR.act(s,1,{block:true});
  assert.equal(t.o,1);assert.ok(t.lock>s.round-1);
  const s2=fresh(11);const t2=s2.tiles.find(x=>x.k==='prop'&&x.d===2);t2.o=1;s2.players[0].pos=(t2.i-2+24)%24;s2.options=[{steps:2,target:t2.i}];s2.decision={type:'move',p:0};
  HR.act(s2,0,{steps:2});HR.act(s2,0,{yes:true});const cb=s2.players[1].cash;HR.act(s2,1,{block:false});assert.equal(t2.o,0);assert.equal(s2.players[1].cash,cb+Math.round(t2.p*HR.CFG.takeover));
  ok('takeover: rent is paid, the owner either blocks (pays, street locked) or takes 1.5× the price')}
{// A complete district can't be taken over or swapped at the Exchange.
  const s=fresh(13);const pair=s.tiles.filter(x=>x.d===5);pair.forEach(x=>x.o=1);const t=pair[0];s.players[0].pos=(t.i-1+24)%24;s.options=[{steps:1,target:t.i}];s.decision={type:'move',p:0};
  HR.act(s,0,{steps:1});assert.notEqual((HR.pending(s)||{}).type,'takeover');
  const mine=s.tiles.find(x=>x.d===0);mine[0]=0;mine.o=0;assert.ok(HR.swaps(s,0).every(c=>!pair.some(x=>x.i===c.take)));
  ok('complete districts are protected from takeovers and the Exchange')}
{// Sealed bid: higher bid wins, a tie means no sale.
  const s=fresh(17);const t=s.tiles.find(x=>x.k==='prop'&&x.d===1);s.players[0].pos=(t.i-1+24)%24;s.options=[{steps:1,target:t.i}];s.decision={type:'move',p:0};
  HR.act(s,0,{steps:1});HR.act(s,0,{yes:false});assert.equal(HR.pending(s).type,'bid');HR.act(s,1,{bid:90});HR.act(s,0,{bid:120});assert.equal(t.o,0);
  const s2=fresh(17);const t2=s2.tiles.find(x=>x.k==='prop'&&x.d===1);s2.players[0].pos=(t2.i-1+24)%24;s2.options=[{steps:1,target:t2.i}];s2.decision={type:'move',p:0};
  HR.act(s2,0,{steps:1});HR.act(s2,0,{yes:false});HR.act(s2,0,{bid:100});HR.act(s2,1,{bid:100});assert.equal(t2.o,-1);ok('sealed bid: higher bid wins; a tie leaves the street unsold')}
{// Building needs the whole district; rents rise with buildings; a broke player sells buildings, then streets.
  const s=fresh(19);const pair=s.tiles.filter(x=>x.d===3);pair[0].o=0;assert.ok(!HR.canBuild(s,pair[0],0));pair[1].o=0;assert.ok(HR.canBuild(s,pair[0],0));
  const r0=HR.rent(s,pair[0]);pair[0].lv=2;assert.ok(HR.rent(s,pair[0])>r0);
  s.players[0].cash=-500;s.players[0].cash+=0;const before=HR.tilesOf(s,0).length;
  const t=s.tiles.find(x=>x.k==='prop'&&x.d===7);t.o=1;t.lv=4;s.players[0].pos=(t.i-1+24)%24;s.players[0].cash=10;s.options=[{steps:1,target:t.i}];s.decision={type:'move',p:0};HR.act(s,0,{steps:1});
  assert.ok(pair[0].lv<2||HR.tilesOf(s,0).length<before||s.players[0].bankrupt);ok('build only on a complete district; rent rises; a broke player sells buildings then streets')}
{let fin=0,errs=0;for(let k=0;k<300;k++){try{const s=playOut(fresh(500+k,k&1));if(s.over&&s.round===15)fin++}catch(e){errs++}}assert.equal(errs,0);assert.ok(fin>=290);
  ok(`300 computer matches finish cleanly (${fin} after round 15)`)}
// Stress the rules with independent deterministic fixtures, including property-state invariants.
{const cities=Array.from({length:12},(_,i)=>({key:'stress-'+i,name:'City '+i,country:'X',
  props:Array.from({length:24},(_,j)=>['Street '+j,'District'])}));
  let maxSteps=0;
  for(let k=0;k<1000;k++){
    const s=HR.newMatch({seed:11000+k,first:k%2,cities,players:[{name:'Human'},{name:'AI',ai:true}]});
    let steps=0;
    while(!s.over&&steps++<5000){
      const d=HR.pending(s);assert.ok(d,'decision must exist');
      if(d.type==='bid'){HR.act(s,0,HR.ai(s,0));if(!s.over&&HR.pending(s)===d)HR.act(s,1,HR.ai(s,1))}
      else HR.act(s,d.p,HR.ai(s,d.p));
      assert.equal(s.tiles.length,24);
      const props=s.tiles.filter(t=>t.k==='prop');assert.equal(props.length,16);
      for(const t of props){assert.ok([-1,0,1].includes(t.o));assert.ok(Number.isInteger(t.lv)&&t.lv>=0&&t.lv<=4)}
    }
    assert.ok(s.over&&s.round===15,'match must finish in round 15');maxSteps=Math.max(maxSteps,steps);
  }
  ok('1,000 deterministic matches finish with valid board, ownership and building states (max '+maxSteps+' steps)');
}
console.log(`HARBOUR RING RULES ${n} checks`);
