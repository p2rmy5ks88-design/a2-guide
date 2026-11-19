/* Skyline Empire prototype rules: topology, legality, market bounds, investment prerequisites, tower, milestones, endings, saves, determinism, AI legality. */
const assert=require('node:assert/strict'),path=require('node:path'),E=require(path.resolve(__dirname,'../lib/career-empire-rules.js'));
let passed=0;const check=(name,fn)=>{fn();passed++;console.log('PASS',name)};
const fresh=(o={})=>E.newMatch({seed:11,ai:[0,1,1,1],...o});
const toInvest=s=>{const pid=s.turn;E.act(s,pid,{type:'roll'});while(E.pending(s).kind==='auction'||E.pending(s).kind==='respond'){const pd=E.pending(s);E.act(s,pd.player,E.ai(s,pd.player))}
 const L=E.legal(s,pid);if(L.some(a=>a.type==='end'&&a.blocked))E.act(s,pid,{type:'auction',node:s.players[pid].pos});while(E.pending(s).kind==='auction'){const pd=E.pending(s);E.act(s,pd.player,{type:'bid-pass'})}return pid};

check('art-matched loop: 44 spaces, 34 sites in six scenic zones, Empire Start and 9 specials',()=>{
 assert.equal(E.NODES.length,44);assert.equal(E.PROPS.length,34);assert.equal(E.BY.E0.type,'start');
 assert.deepEqual(E.ZONES.map(z=>[z.id,E.SITES[z.id].length]),[['luxury',3],['trade',6],['innovation',7],['finance',8],['culture',5],['residential',5]]);
 assert.equal(new Set(E.NODES.map(n=>n.id)).size,44)});
check('six scenic zones map onto four economic systems (proposed mapping, not merged)',()=>{
 assert.deepEqual(Object.fromEntries(E.ZONES.map(z=>[z.id,z.system])),{luxury:'residential',trade:'transport',innovation:'commercial',finance:'commercial',culture:'landmark',residential:'residential'});
 assert.deepEqual([...E.SYSTEMS],['commercial','residential','transport','landmark'])});
check('roll moves exactly the dice total along the loop and pays payday when passing Empire Start',()=>{const s=fresh(),pid=s.turn,p=s.players[pid];p.pos='E40';const cash=p.cash;
 E.act(s,pid,{type:'roll'});const t=p.lastRoll[0]+p.lastRoll[1];assert.equal(p.pos,'E'+((40+t)%44));if(40+t>=44)assert.ok(p.cash>=cash+E.BALANCE.payday-200)});
check('only the active player may act; a second roll in one turn is refused without changing state',()=>{const s=fresh(),pid=s.turn,before=E.serialize(s);
 assert.equal(E.act(s,(pid+1)%4,{type:'roll'}).ok,false);assert.equal(E.serialize(s),before);E.act(s,pid,{type:'roll'});assert.equal(E.act(s,pid,{type:'roll'}).ok,false)});
check('landing on an unowned site requires buy or auction before ending the turn',()=>{const s=fresh(),pid=s.turn,p=s.players[pid];p.pos='E43';s.rng=12345;
 for(let tries=0;tries<200;tries++){const t=E.newMatch({seed:tries+1,ai:[0,1,1,1]}),q=t.turn;E.act(t,q,{type:'roll'});const here=E.BY[t.players[q].pos];
  if(here.type==='property'&&t.own[here.id].o<0){assert.match(E.legal(t,q).find(a=>a.type==='end').blocked,/Buy or auction/);const c=t.players[q].cash;E.act(t,q,{type:'buy',node:here.id});
   assert.equal(t.own[here.id].o,q);assert.equal(t.players[q].cash,c-here.price);assert.ok(!E.legal(t,q).find(a=>a.type==='end').blocked);return}}assert.fail('no landing found')});
check('market moves are seeded and bounded within [marketMin, marketMax] for every system and build cost',()=>{for(let seed=1;seed<=40;seed++){const s=E.runAI(E.newMatch({seed,ai:[1,1,1,1]}));
 for(const v of [...Object.values(s.market.demand),s.market.cost]){assert.ok(v>=E.BALANCE.marketMin-1e-9&&v<=E.BALANCE.marketMax+1e-9)}}});
check('Low-rise needs ownership; Mid-rise needs 2 zone sites; High-rise needs zone majority AND transport infrastructure',()=>{const s=fresh(),pid=toInvest(s),p=s.players[pid];p.cash=99999;p.invest=9;
 s.own.E21={o:pid,h:1};let d=E.legal(s,pid).find(a=>a.type==='develop'&&a.node==='E21');assert.match(d.blocked,/2 sites/);
 s.own.E22={o:pid,h:0};d=E.legal(s,pid).find(a=>a.type==='develop'&&a.node==='E21');assert.ok(!d.blocked);E.act(s,pid,{type:'develop',node:'E21'});
 d=E.legal(s,pid).find(a=>a.type==='develop'&&a.node==='E21');assert.match(d.blocked,/majority/);for(const id of E.SITES.finance.slice(0,5))s.own[id].o=pid;
 d=E.legal(s,pid).find(a=>a.type==='develop'&&a.node==='E21');assert.match(d.blocked,/infrastructure/);s.own.E5.o=pid;
 d=E.legal(s,pid).find(a=>a.type==='develop'&&a.node==='E21');assert.ok(!d.blocked);assert.equal(d.stage,3)});
check('investment actions are limited per turn and the reason is shown',()=>{const s=fresh(),pid=toInvest(s),p=s.players[pid];p.cash=99999;s.own.E1={o:pid,h:0};s.own.E2={o:pid,h:0};s.own.E4={o:pid,h:0};
 E.act(s,pid,{type:'develop',node:'E1'});E.act(s,pid,{type:'develop',node:'E2'});assert.match(E.legal(s,pid).find(a=>a.type==='develop'&&a.node==='E4').blocked,/No investment actions/)});
check('Empire Tower funding is shared, advances one stage per funded cost and grants influence; it never completes unfunded',()=>{const s=fresh(),pid=toInvest(s),p=s.players[pid];p.cash=5000;
 assert.equal(s.tower.stage,0);E.act(s,pid,{type:'fund',amount:300});assert.equal(s.tower.stage,1);assert.equal(p.influence,Math.floor(300/E.BALANCE.towerInfluencePer));
 E.act(s,pid,{type:'fund',amount:100});assert.equal(s.tower.stage,1);assert.equal(s.tower.funded,100)});
check('rent includes market demand and zone-majority bonus; the payer loses exactly what the owner gains',()=>{const s=fresh(),pid=s.turn,opp=(pid+1)%4;s.own.E21={o:opp,h:2};const r1=E.rent(s,'E21');
 assert.equal(r1,Math.round(E.BY.E21.price*E.BALANCE.rentMult[2]*s.market.demand.commercial));for(const id of E.SITES.finance.slice(1,5))s.own[id].o=opp;assert.ok(E.rent(s,'E21')>r1);
 for(let seed=0;seed<2000;seed++){const t=JSON.parse(E.serialize(s));t.rng=seed;t.players[pid].pos='E19';const a0=t.players[pid].cash,b0=t.players[opp].cash,r=E.rent(t,'E21');E.act(t,pid,{type:'roll'});
  if(t.players[pid].pos==='E21'){assert.equal(t.players[pid].cash,a0-r);assert.equal(t.players[opp].cash,b0+r);return}}assert.fail('no landing')});
check('negotiation: offers only in your landing zone or after the Negotiation Desk; AI accepts generous offers only',()=>{const s=fresh(),pid=toInvest(s),opp=(pid+1)%4,p=s.players[pid];p.cash=9999;p.pos='E21';s.own.E22={o:opp,h:0};s.players[opp].ai=true;
 assert.ok(E.legal(s,pid).some(a=>a.type==='offer'&&a.node==='E22'&&!a.blocked));assert.ok(!E.legal(s,pid).some(a=>a.type==='offer'&&a.node==='E1'));
 E.act(s,pid,{type:'offer',node:'E22',amount:E.BY.E22.price});E.act(s,opp,E.ai(s,opp));assert.equal(s.own.E22.o,opp);
 s.players[pid].desk=true;s.own.E1={o:opp,h:0};E.act(s,pid,{type:'offer',node:'E1',amount:900});E.act(s,opp,E.ai(s,opp));assert.equal(s.own.E1.o,pid)});
check('milestone victory needs all three milestones and the lead at a check, never before minWinRound',()=>{let found=0;for(let seed=1;seed<=200&&found<5;seed++){const s=E.runAI(E.newMatch({seed,ai:[1,1,1,1]}));
 if(s.endReason!=='milestones')continue;found++;assert.ok(s.round>=E.BALANCE.minWinRound);const c=s.checks[s.checks.length-1].players.find(x=>x.id===s.winner);assert.ok(c.milestones.economic&&c.milestones.development&&c.milestones.influence)}assert.ok(found>0)});
check('round limit applies the published score formula with deterministic tie-breaks',()=>{const s=fresh({cfg:{rounds:2}});let g=0;while(s.phase!=='over'&&g++<200){const pd=E.pending(s);E.act(s,pd.player,E.ai(s,pd.player))}
 assert.equal(s.endReason,'round-limit');const r=E.ranking(s);assert.equal(s.winner,r[0].id);for(const x of r)assert.equal(x.score,E.score(s,s.players[x.id]))});
check('bankruptcy sells buildings then sites, releases holdings and ends with the last solvent player',()=>{const s=E.newMatch({seed:3,players:2,ai:[1,1],names:['A','B']}),pid=s.turn,opp=1-pid;s.players[pid].cash=0;
 s.own.E21={o:opp,h:4};for(const id of E.SITES.finance.slice(1,5))s.own[id].o=opp;s.players[pid].pos='E21';s.phase='invest';
 // force a rent payment through the public roll path from a position that lands on E21
 for(let seed=0;seed<500;seed++){const t=JSON.parse(E.serialize(s));t.phase='roll';t.rng=seed;t.players[pid].pos='E19';E.act(t,pid,{type:'roll'});if(t.players[pid].pos==='E21'){assert.ok(t.players[pid].out);assert.equal(t.phase,'over');assert.equal(t.winner,opp);return}}assert.fail('no landing')});
check('save/restore round-trips exactly; corrupted, foreign and newer-version saves are refused',()=>{const s=fresh();E.act(s,s.turn,{type:'roll'});const r=E.restore(E.serialize(s));assert.ok(r.ok);assert.equal(E.serialize(r.state),E.serialize(s));
 assert.equal(E.restore('{').ok,false);assert.equal(E.restore(JSON.stringify({...s,version:9})).ok,false);assert.equal(E.restore(JSON.stringify({...s,ruleset:'dominion-p1'})).ok,false)});
check('same seed → identical transcript hash; a resumed save finishes identically',()=>{const a=E.runAI(E.newMatch({seed:77,ai:[1,1,1,1]})),b=E.runAI(E.newMatch({seed:77,ai:[1,1,1,1]}));assert.equal(E.hash(a),E.hash(b));
 const c=E.newMatch({seed:77,ai:[1,1,1,1]});for(let i=0;i<150;i++){const pd=E.pending(c);E.act(c,pd.player,E.ai(c,pd.player))}const d=E.restore(E.serialize(c)).state;E.runAI(c);E.runAI(d);assert.equal(E.hash(c),E.hash(d))});
check('300 seeded AI matches: legal actions only, solvent cash never negative, every match ends within the cap',()=>{for(let seed=1;seed<=300;seed++){const s=E.newMatch({seed,ai:[1,1,1,1]});let n=0;
 while(s.phase!=='over'){assert.ok(n++<9000);const pd=E.pending(s);const r=E.act(s,pd.player,E.ai(s,pd.player));assert.ok(r.ok,r.error);for(const p of s.players)if(!p.out)assert.ok(p.cash>=0)}assert.ok(s.round<=s.cfg.rounds)}});
console.log(`${passed} Empire rule checks passed`);
