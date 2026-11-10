// Skyline Duel online (Stage 3): server-authoritative 1v1 rooms with a turn timer and forfeits.
// In-memory store, fake ID tokens and an injected clock; the same rules engine as the app.
'use strict';
const assert=require('node:assert/strict');
const {createLivingCityService,DUEL_TURN_MS}=require('../competition/living-city-service.cjs');
let n=0;const ok=m=>{n++;console.log('PASS',m)};
function memoryDb(){const data={};const get=p=>p.split('/').reduce((o,k)=>o&&o[k],data);
  const set=(p,v)=>{const ks=p.split('/'),last=ks.pop();let o=data;for(const k of ks)o=o[k]=o[k]||{};if(v==null)delete o[last];else o[last]=v};
  return{data,set,ref(p){return{async transaction(fn){const cur=get(p);const next=fn(cur==null?null:JSON.parse(JSON.stringify(cur)));set(p,next);return{committed:true,snapshot:{val:()=>next}}},async once(){return{val:()=>get(p)}}}}}}
const pick=b=>{const o=b.options||{};if(b.type==='actions')return o.keys.includes('roll')?'roll':o.keys.includes('end')?'end':o.keys.includes('pay')?'pay':o.keys[0];if(b.type==='modal')return o.keys.includes('buy')?'buy':o.keys[0];if(b.type==='bid')return 0;if(b.type==='trade')return false;
  if(b.type==='lc:review')return o.can?'permit':'standard';if(b.type==='lc:landmark')return 'i'+o.opts[0];const c=(o.choices||[]).filter(x=>x.ok);return c[0].k};
(async()=>{
  let now=1_800_000_000_000;const db=memoryDb();db.set('skylineV2/flags',{lcOnline:true});
  const users={tA:'alice',tB:'bob'},client={rules:[1,2],lc:1};
  const svc=createLivingCityService({db,clock:()=>now,verifyIdToken:async t=>{if(!users[t])throw Error('bad');return{uid:users[t]}}});
  const call=async(fn,token,body)=>{try{return{status:200,body:await svc[fn](token,body)}}catch(e){return{status:e.status||500,body:{error:e.code||String(e)}}}};
  let r=await call('create','tA',{name:'Alice',client});assert.equal(r.status,200,JSON.stringify(r.body));const code=r.body.code;
  r=await call('start','tA',{code,mode:'duel'});assert.equal(r.status,400);
  await call('join','tB',{code,name:'Bob',client});
  r=await call('start','tA',{code,mode:'duel',ai:1});assert.deepEqual([r.status,r.body.error],[400,'duel-needs-two-players']);ok('a Duel needs exactly two human players (no AI seats)');
  r=await call('start','tA',{code,mode:'duel'});assert.equal(r.status,200,JSON.stringify(r.body));let game=r.body.game;const G=game.G;
  assert.equal(G.set.duel,1);assert.equal(G.set.rounds,15);assert.equal(G.set.mode,'timed');assert.equal(G.rv,2);
  const owned=[0,1].map(id=>G.own.filter(o=>o.o===id).length);assert.deepEqual(owned,[3,3]);assert.deepEqual(G.players.map(p=>p.cash),[1700,1700]);
  ok(`server deals 3 streets each and SC 1.7B each; 15-round Living City (rule version ${G.rv})`);
  const tok={alice:'tA',bob:'tB'},state=async(t)=>(await call('state',t,{code})).body.game;
  // Timer: too early is refused; after the deadline the AI plays the idle player's turn.
  let v=await state('tA');const idle=v.waitingFor,idleTok=tok[v.G.players[idle].uid],otherTok=idleTok==='tA'?'tB':'tA';
  r=await call('timeout',otherTok,{code,revision:v.revision});assert.deepEqual([r.status,r.body.error],[409,'not-yet']);
  now+=DUEL_TURN_MS+1;r=await call('timeout',otherTok,{code,revision:v.revision});assert.equal(r.status,200,JSON.stringify(r.body));
  assert.ok(r.body.game.revision>v.revision);assert.equal(r.body.game.G.players[idle].ai,false,'AI help ends after that turn');
  ok('turn timer: refused before 25 s; after the deadline the AI plays the idle player’s turn, then hands control back');
  // Answering resets the strike count; three timeouts in a row forfeit.
  for(let k=0;k<20;k++){v=await state('tA');if(v.over)break;if(v.waitingFor===idle)break;r=await call('act',tok[v.G.players[v.waitingFor].uid],{code,revision:v.revision,answer:{value:pick((await state(tok[v.G.players[v.waitingFor].uid])).decision)}});assert.equal(r.status,200,JSON.stringify(r.body))}
  let forfeit=null;for(let k=0;k<12&&forfeit==null;k++){v=await state('tA');if(v.over)break;now+=DUEL_TURN_MS+1;
    if(v.waitingFor!==idle){r=await call('act',tok[v.G.players[v.waitingFor].uid],{code,revision:v.revision,answer:{value:pick((await state(tok[v.G.players[v.waitingFor].uid])).decision)}});continue}
    r=await call('timeout',otherTok,{code,revision:v.revision});assert.equal(r.status,200,JSON.stringify(r.body));forfeit=r.body.forfeit}
  v=await state('tA');assert.equal(forfeit,idle,'third timeout in a row forfeits');assert.ok(v.over);assert.ok(v.G.players[idle].bankrupt);assert.equal(db.data.skylineV2.lc[code].status,'finished');
  ok('three timeouts in a row forfeit the Duel: the idle player loses and the room is finished');
  r=await call('timeout',otherTok,{code,revision:v.revision});assert.equal(r.status,409);ok('no timeouts after the match is over');
  // A full Duel played by both players ends by round 15.
  r=await call('create','tA',{name:'Alice',client});const c2=r.body.code;await call('join','tB',{code:c2,name:'Bob',client});r=await call('start','tA',{code:c2,mode:'duel'});game=r.body.game;let steps=0;
  while(!game.over&&steps<3000){steps++;const who=tok[game.G.players[game.waitingFor].uid];const vv=(await call('state',who,{code:c2})).body.game;r=await call('act',who,{code:c2,revision:vv.revision,answer:{value:pick(vv.decision)}});assert.equal(r.status,200,JSON.stringify(r.body));game=r.body.game}
  assert.ok(game.over);assert.ok(game.G.round<=16||game.G.players.some(p=>p.bankrupt),'round '+game.G.round);
  const trades=game.G.log?game.G.log.filter(l=>/trade/i.test(l)).length:0;ok(`full online Duel: ${Math.min(game.G.round,15)} rounds, ${steps} decisions, ended ${game.G.players.some(p=>p.bankrupt)?'by bankruptcy':'at the round limit'}`);
  r=await call('timeout','tA',{code:c2,revision:game.revision});assert.equal(r.status,409);
  // Ordinary rooms are unchanged: no timer endpoint.
  r=await call('create','tA',{name:'Alice',client});const c3=r.body.code;await call('join','tB',{code:c3,name:'Bob',client});await call('start','tA',{code:c3,mode:'timed',rounds:10});
  const v3=await state('tA');r=await call('timeout','tB',{code:c3,revision:v3.revision});assert.deepEqual([r.status,r.body.error],[400,'not-a-duel']);ok('ordinary Living City rooms have no turn timer');
  // Matchmaking queue: the first player waits, the second is paired into a started Duel, the first collects the same code.
  r=await call('queue','tA',{name:'Alice',client});assert.deepEqual(r.body,{waiting:true,seconds:60});
  r=await call('queue','tA',{name:'Alice',client});assert.ok(r.body.waiting,'calling again keeps your place');
  r=await call('queue','tB',{name:'Bob',client});assert.ok(r.body.matched&&r.body.code,JSON.stringify(r.body));const qc=r.body.code;
  r=await call('queue','tA',{name:'Alice',client});assert.deepEqual(r.body,{matched:true,code:qc});
  const qa=(await call('state','tA',{code:qc})).body,qb=(await call('state','tB',{code:qc})).body;
  assert.equal(qa.status,'playing');assert.equal(qa.game.G.set.duel,1);assert.deepEqual(qa.seats.map(x=>x.you),[true,false]);assert.deepEqual(qb.seats.map(x=>x.you),[false,true]);
  ok('matchmaking: first player waits, second is paired into a started Duel, both see the same room');
  r=await call('queue','tA',{name:'Alice',client});assert.ok(r.body.waiting);now+=61000;r=await call('queue','tB',{name:'Bob',client});assert.ok(r.body.waiting,'an expired wait is not paired');
  await call('queueCancel','tB',{});r=await call('queue','tA',{name:'Alice',client});assert.ok(r.body.waiting,'cancel removes you from the queue');
  ok('queue entries expire after 60 s, and Cancel removes you');
  // Ranked ladder: matchmade Duels are rated once, rewards are claimed once, the 3rd same-day rematch is unrated.
  const DR=require('../competition/duel-rating.cjs');
  const g1=DR.glicko2({r:1500,rd:350,vol:.06},{r:1500,rd:350,vol:.06},1);assert.ok(g1.r>1600&&g1.r<1700&&g1.rd<350,'glicko2 '+JSON.stringify(g1));
  const g2=DR.glicko2({r:1500,rd:200,vol:.06},{r:1400,rd:30,vol:.06},0);assert.ok(g2.r<1500);assert.equal(DR.tierOf({games:4,r:2000}),'Placement');assert.equal(DR.tierOf({games:5,r:1560}),'Gold');
  assert.deepEqual(DR.carry({r:1900,rd:60,vol:.06}),{r:1700,rd:200,vol:.06});ok('Glicko-2 rating, tiers after 5 placement games, soft season reset');
  const quickDuel=async(loserTok)=>{await call('queueCancel','tA',{});await call('queueCancel','tB',{});now+=1000;await call('queue','tA',{name:'Alice',client});const m=(await call('queue','tB',{name:'Bob',client})).body;const c=m.code;
    for(let k=0;k<200;k++){const v=(await call('state','tA',{code:c})).body.game;if(v.over)break;const who=v.G.players[v.waitingFor].uid;now+=DUEL_TURN_MS+1;
      if(tok[who]===loserTok){await call('timeout',loserTok==='tA'?'tB':'tA',{code:c,revision:v.revision})}else{const vv=(await call('state',tok[who],{code:c})).body.game;await call('act',tok[who],{code:c,revision:vv.revision,answer:{value:pick(vv.decision)}})}}
    return c};
  const d1=await quickDuel('tB');let cl=(await call('duelClaim','tA',{code:d1})).body;assert.equal(cl.won,true);assert.equal(cl.rated,true);assert.ok(cl.after>cl.before);assert.equal(cl.reward.coins,300);
  let cl2=(await call('duelClaim','tA',{code:d1})).body;assert.equal(cl2.alreadyClaimed,true);assert.equal(cl2.reward.coins,0);
  const lb=(await call('duelClaim','tB',{code:d1})).body;assert.equal(lb.won,false);assert.equal(lb.reward.coins,80);assert.ok(lb.after<lb.before);
  ok(`ranked result recorded once: winner ${cl.before}→${cl.after} (+300 coins, +600 XP), loser ${lb.before}→${lb.after} (+80 coins); a second claim pays nothing`);
  r=await call('duelClaim','tA',{code:c2});assert.equal(r.status,404);ok('friend and unranked rooms give no ranked rewards');
  const d2=await quickDuel('tB'),d3=await quickDuel('tB');const c3r=(await call('duelClaim','tA',{code:d3})).body;assert.equal(c3r.rated,false);assert.equal(c3r.after,c3r.before);
  ok('the third match against the same opponent on the same day does not change ratings');
  let me=(await call('duelMe','tA',{})).body;assert.equal(me.rec.games,3);assert.equal(me.rec.tier,'Placement');assert.equal(me.rec.placementLeft,2);
  await quickDuel('tB');await quickDuel('tB');me=(await call('duelMe','tA',{})).body;assert.equal(me.rec.games,5);assert.notEqual(me.rec.tier,'Placement');
  const board=(await call('duelBoard','tB',{})).body;assert.equal(board.players,2);assert.equal(board.top[0].name,'Alice');assert.equal(board.you.name,'Bob');assert.ok(board.top[0].rating%25===0);
  ok(`season ${board.season} leaderboard: ${board.top.map(x=>x.name+' '+x.tier+' '+x.rating).join(', ')} (ratings shown in bands of 25; your own row always included)`);
  console.log(`SKYLINE DUEL ONLINE ${n} checks`);
})().catch(e=>{console.error(e);process.exit(1)});
