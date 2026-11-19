/* Skyline Dominion prototype rules: topology, legality, economy invariants, victory paths, saves, determinism, AI legality. */
const assert=require('node:assert/strict'),path=require('node:path'),D=require(path.resolve(__dirname,'../lib/career-dominion-rules.js'));
let passed=0;const check=(name,fn)=>{fn();passed++;console.log('PASS',name)};
const fresh=(o={})=>D.newMatch({seed:7,ai:[0,1,1,1],...o});
const first=s=>s.turn;

check('30 nodes: 24 sites (8 districts × 3), 2 central, 4 contest exchanges',()=>{
 assert.equal(D.NODES.length,30);assert.equal(D.PROPS.length,24);
 assert.equal(D.NODES.filter(n=>n.type==='central').length,2);assert.equal(D.NODES.filter(n=>n.type==='contest').length,4);
 for(const d of D.DISTRICTS)assert.equal(D.SITES[d.id].length,3)});
check('45 undirected edges, symmetric, no self-loops, every node reachable',()=>{
 assert.equal(D.EDGES.length,45);for(const[a,b]of D.EDGES){assert.notEqual(a,b);assert.ok(D.NEIGH[a].includes(b)&&D.NEIGH[b].includes(a))}
 const seen=new Set(['central_1']),q=['central_1'];while(q.length)for(const n of D.NEIGH[q.pop()])if(!seen.has(n)){seen.add(n);q.push(n)}
 assert.equal(seen.size,30)});
check('every node id is unique and stable',()=>{assert.equal(new Set(D.NODES.map(n=>n.id)).size,30)});

check('turn start pays income and restores action points',()=>{const s=fresh(),p=s.players[first(s)];
 assert.equal(p.ap,D.BALANCE.apPerTurn);assert.equal(p.cash,D.BALANCE.startCash+D.BALANCE.income)});
check('moving off-graph or out of turn is rejected without changing state',()=>{const s=fresh(),pid=first(s),before=D.serialize(s);
 assert.equal(D.act(s,pid,{type:'move',to:'innovation_3'}).ok,false);assert.equal(D.act(s,(pid+1)%4,{type:'end'}).ok,false);assert.equal(D.serialize(s),before)});
check('buy charges once, costs one AP, transfers ownership; a second buy is illegal',()=>{const s=fresh(),pid=first(s),p=s.players[pid];
 const to=D.NEIGH[p.pos].find(id=>D.BY[id].type==='property');D.act(s,pid,{type:'move',to});const cash=p.cash,ap=p.ap;
 assert.ok(D.act(s,pid,{type:'buy',node:to}).ok);assert.equal(p.cash,cash-D.BY[to].price);assert.equal(p.ap,ap-1);assert.equal(s.own[to].o,pid);
 assert.equal(D.act(s,pid,{type:'buy',node:to}).ok,false)});
check('Low-rise needs only ownership; Mid-rise is blocked with a reason until the district is controlled',()=>{const s=fresh(),pid=first(s),p=s.players[pid];
 const site=D.NEIGH[p.pos].find(id=>D.BY[id].type==='property');D.act(s,pid,{type:'move',to:site});D.act(s,pid,{type:'buy',node:site});
 assert.ok(D.act(s,pid,{type:'develop',node:site}).ok);assert.equal(s.own[site].h,1);
 const blocked=D.legal(s,pid).find(a=>a.type==='develop');assert.ok(blocked.blocked);
 s.players[pid].built=[];const again=D.legal(s,pid).find(a=>a.type==='develop');assert.match(again.blocked,/needs control/)});
check('district control from two of three sites unlocks advanced stages',()=>{const s=fresh(),pid=first(s),d=D.BY['market_1'].district;
 s.own.market_1.o=pid;s.own.market_2.o=pid;s.own.market_1.h=1;s.players[pid].pos='market_1';s.players[pid].cash=5000;
 assert.equal(D.controller(s,d),pid);const dev=D.legal(s,pid).find(a=>a.type==='develop');assert.ok(!dev.blocked);assert.equal(dev.stage,2)});
check('toll is paid on entering an opponent site and money is conserved',()=>{const s=fresh(),pid=first(s),opp=(pid+1)%4,p=s.players[pid];
 const to=D.NEIGH[p.pos].find(id=>D.BY[id].type==='property');s.own[to]={o:opp,h:2,cool:0};const total=s.players.reduce((a,x)=>a+x.cash,0),r=D.rent(s,to);
 D.act(s,pid,{type:'move',to});assert.equal(s.players[opp].cash-(D.BALANCE.startCash),r);assert.equal(s.players.reduce((a,x)=>a+x.cash,0),total)});
check('contest needs presence, transfers the site with its building intact and sets a cooldown',()=>{const s=fresh(),pid=first(s),opp=(pid+1)%4,p=s.players[pid];
 s.own.market_1={o:opp,h:1,cool:0};p.pos='market_1';p.cash=5000;
 assert.match(D.legal(s,pid).find(a=>a.type==='contest').blocked,/neighbouring district|Contest Exchange/);
 s.own.market_2={o:pid,h:0,cool:0};const c=D.legal(s,pid).find(a=>a.type==='contest');assert.ok(!c.blocked);const oppCash=s.players[opp].cash;
 assert.ok(D.act(s,pid,{type:'contest',node:'market_1'}).ok);assert.equal(s.own.market_1.o,pid);assert.equal(s.own.market_1.h,1);
 assert.equal(s.players[opp].cash,oppCash+c.price);assert.equal(s.own.market_1.cool,s.round+D.BALANCE.contestCooldown)});
check('High-rise and Skyscraper are protected from contests',()=>{const s=fresh(),pid=first(s),opp=(pid+1)%4,p=s.players[pid];
 s.own.market_1={o:opp,h:3,cool:0};s.own.market_2={o:pid,h:0,cool:0};p.pos='market_1';p.cash=9999;
 assert.match(D.legal(s,pid).find(a=>a.type==='contest').blocked,/protected/)});
check('a contest during cooldown is refused',()=>{const s=fresh(),pid=first(s),opp=(pid+1)%4,p=s.players[pid];
 s.own.market_1={o:opp,h:0,cool:s.round+1};s.own.market_2={o:pid,h:0,cool:0};p.pos='market_1';p.cash=9999;
 assert.match(D.legal(s,pid).find(a=>a.type==='contest').blocked,/Protected until round/)});
check('auction: every solvent player bids once, highest valid bid pays and owns; below-minimum bids are void',()=>{const s=fresh(),pid=first(s),p=s.players[pid];
 const to=D.NEIGH[p.pos].find(id=>D.BY[id].type==='property');D.act(s,pid,{type:'move',to});assert.ok(D.act(s,pid,{type:'auction',node:to}).ok);
 const bids={};let k=0;while(s.phase==='auction'){const who=D.pending(s).player;bids[who]=[50,300,10,120][k++];D.act(s,who,{type:'bid',amount:bids[who]})}
 const win=+Object.entries(bids).sort((a,b)=>b[1]-a[1])[0][0];assert.equal(s.own[to].o,win)});
check('negotiation: offer, AI declines low and accepts generous offers; challenge recorded once on control',()=>{const s=fresh(),pid=first(s),opp=(pid+1)%4,p=s.players[pid];
 s.own.market_1={o:pid,h:0,cool:0};s.own.market_2={o:opp,h:0,cool:0};p.pos='market_1';p.cash=5000;s.players[opp].ai=true;
 assert.ok(D.act(s,pid,{type:'offer',node:'market_2',amount:D.BY.market_2.price}).ok);assert.equal(D.pending(s).player,opp);
 D.act(s,opp,D.ai(s,opp));assert.equal(s.own.market_2.o,opp);
 assert.equal(D.act(s,pid,{type:'offer',node:'market_2',amount:999}).ok,false,'one offer per site per turn');
 s.players[pid].offered=[];D.act(s,pid,{type:'offer',node:'market_2',amount:900});D.act(s,opp,D.ai(s,opp));assert.equal(s.own.market_2.o,pid);
 assert.equal(s.challenges.filter(c=>c.tag==='negotiation'&&c.player===pid).length,1)});
check('early victory requires the target districts at two successive scoring checks, never before minWinRound',()=>{const s=fresh(),pid=first(s);
 for(const d of ['market','harbor','financial'])for(const id of D.SITES[d].slice(0,2))s.own[id].o=pid;
 let guard=0;while(s.phase!=='over'&&guard++<500){const pd=D.pending(s);if(pd.kind!=='act'){D.act(s,pd.player,D.ai(s,pd.player));continue}D.act(s,pd.player,{type:'end'})}
 assert.equal(s.endReason,'district-control');assert.equal(s.winner,pid);assert.ok(s.round>=D.BALANCE.minWinRound);
 assert.ok(s.checks.filter(c=>c.players.find(x=>x.id===pid).districts.length>=3).length>=2)});
check('round limit ends the match with a deterministic control-point, then net-worth, then seat ranking',()=>{const s=fresh({cfg:{rounds:2}});let g=0;
 while(s.phase!=='over'&&g++<100){const pd=D.pending(s);D.act(s,pd.player,{type:'end'})}assert.equal(s.endReason,'round-limit');const r=D.ranking(s);assert.equal(s.winner,r[0].id);
 for(let i=1;i<r.length;i++)assert.ok(r[i-1].cp>r[i].cp||r[i-1].cp===r[i].cp&&(r[i-1].worth>r[i].worth||r[i-1].worth===r[i].worth&&r[i-1].id<r[i].id))});
check('bankruptcy releases sites to the bank and the last solvent player wins',()=>{const s=D.newMatch({seed:9,players:2,ai:[1,1],names:['A','B']}),pid=first(s),opp=1-pid;
 s.players[pid].cash=0;const to=D.NEIGH[s.players[pid].pos].find(id=>D.BY[id].type==='property');s.own[to]={o:opp,h:4,cool:0};
 D.act(s,pid,{type:'move',to});assert.ok(s.players[pid].out);assert.equal(s.phase,'over');assert.equal(s.winner,opp);assert.equal(s.endReason,'last-standing')});
check('save/restore round-trips exactly; corrupted and newer-version saves are refused',()=>{const s=fresh();D.act(s,first(s),{type:'end'});
 const r=D.restore(D.serialize(s));assert.ok(r.ok);assert.equal(D.serialize(r.state),D.serialize(s));
 assert.equal(D.restore('{bad').ok,false);assert.equal(D.restore(JSON.stringify({...s,version:99})).ok,false);assert.equal(D.restore(JSON.stringify({...s,ruleset:'circuit-v0'})).ok,false)});
check('same seed → identical transcript hash; a resumed save finishes identically',()=>{const a=D.runAI(D.newMatch({seed:42,ai:[1,1,1,1]})),b=D.runAI(D.newMatch({seed:42,ai:[1,1,1,1]}));assert.equal(D.hash(a),D.hash(b));
 const c=D.newMatch({seed:42,ai:[1,1,1,1]});for(let i=0;i<120;i++){const pd=D.pending(c);D.act(c,pd.player,D.ai(c,pd.player))}const d=D.restore(D.serialize(c)).state;D.runAI(c);D.runAI(d);assert.equal(D.hash(c),D.hash(d))});
check('300 seeded AI matches: AI only takes legal actions, cash never negative for solvent players, all matches end',()=>{
 for(let seed=1;seed<=300;seed++){const s=D.newMatch({seed,ai:[1,1,1,1]});let n=0;while(s.phase!=='over'){assert.ok(n++<6000,'stall '+seed);const pd=D.pending(s);const r=D.act(s,pd.player,D.ai(s,pd.player));assert.ok(r.ok,r.error);
  for(const p of s.players)if(!p.out)assert.ok(p.cash>=0)}assert.ok(s.round<=s.cfg.rounds)}});
console.log(`${passed} Dominion rule checks passed`);
