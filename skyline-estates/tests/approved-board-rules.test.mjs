import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as R from '../lib/approved-board-rules.js';
for(const [board,spaces] of [['dominion',48],['empire',32]]){
 const raw=JSON.parse(fs.readFileSync(new URL(`../assets/approved-replacements/${board}/board_data.json`,import.meta.url),'utf8'));
 const tiles=R.preserveRules(raw,board);
 assert.equal(tiles.length,spaces);assert.equal(tiles[0].kind,'start');
 const names=new Set(tiles.map(t=>t.key));assert.equal(names.size,spaces);
 for(let i=0;i<spaces;i++){assert.deepEqual(tiles[i].neighbors,[(i+spaces-1)%spaces,(i+1)%spaces]);assert.ok(tiles[i].pawn_anchor.length===3)}
 const s=R.createMatch(board,raw,{seed:20261121,length:'quick'});
 assert.equal(s.players.length,4);assert.equal(s.phase,'roll');
 assert.equal(s.ruleset,'skyline-approved-board-v1');
 let rolls=0;for(let t=0;t<300&&s.phase!=='over';t++){
  const before=s.players[0].pos;const r=R.roll(s,tiles);assert.equal(r.steps.length,r.dice[0]+r.dice[1]);
  assert.equal(s.players[0].pos,(before+r.steps.length)%spaces);rolls++;
  const landing=tiles[s.players[0].pos];
  if(s.phase!=='over'&&R.isOwnable(landing)&&!s.properties[landing.id]&&s.players[0].cash>=landing.price_sc)R.buy(s,tiles);
  const mine=Object.keys(s.properties).find(id=>s.properties[id].owner===0&&s.properties[id].stage<R.MAX_STAGE[board]&&s.players[0].cash>=R.buildCost(tiles[id],s.properties[id]));
  if(s.phase!=='over'&&mine!==undefined){s.selected=+mine;R.build(s,tiles,+mine)}
  const move=s.phase==='over'?[]:R.endTurn(s,tiles);assert.ok(Array.isArray(move));
  const snap=JSON.stringify(s);if(s.phase!=='over'){assert.deepEqual(R.restore(snap,tiles,board),s)}
 }
 assert.equal(s.phase,'over');assert.ok(s.round>=1); 
 assert.ok(Number.isInteger(s.winner)&&s.winner>=0&&s.winner<4);
 assert.ok(rolls>0);assert.ok(R.score(s,tiles)[0].worth>=0);
 const facts=R.careerFacts(s,tiles);assert.equal(facts.board,board);assert.equal(facts.ruleset,R.ID);assert.equal(facts.over,true);
 console.log(board,'PASS','completed real turns',rolls,'winner',s.winner,'built',Object.values(s.properties).filter(p=>p.stage>0).length);
}
console.log('All approved board rules tests passed.');


// Approval gate: real property rent, salary, auctions, trades, Career receipts
// and strict rejection of incompatible old 61-node/44-space saved games.
for (const board of ['dominion','empire']) {
 const raw=JSON.parse(fs.readFileSync(new URL('../assets/approved-replacements/'+board+'/board_data.json',import.meta.url),'utf8'));
 const spaces=R.preserveRules(raw,board),N=spaces.length,seed=board==='dominion'?1:11,propertyId=board==='dominion'?2:3;
 const rentState=R.createMatch(board,raw,{seed,length:'standard'}),property=spaces[propertyId];
 assert.ok(R.isOwnable(property));
 rentState.properties[propertyId]={owner:1,stage:2};
 const ownerBefore=rentState.players[1].cash,playerBefore=rentState.players[0].cash;
 const moved=R.roll(rentState,spaces);
 assert.deepEqual(moved.dice,board==='dominion'?[1,1]:[1,2]);
 assert.equal(rentState.players[0].pos,propertyId);
 const toll=R.rent(property,rentState.properties[propertyId]);
 assert.equal(rentState.players[0].cash,playerBefore-toll);
 assert.equal(rentState.players[1].cash,ownerBefore+toll);
 assert.throws(()=>R.buy(rentState,spaces),/not available/);
 assert.equal(R.restore(JSON.stringify({...rentState,ruleset:board==='dominion'?'dominion-p1':'empire-p1'}),spaces,board),null);
 assert.equal(R.restore(JSON.stringify({...rentState,players:rentState.players.map((p,i)=>i?p:{...p,pos:N})}),spaces,board),null);

 const payday=R.createMatch(board,raw,{seed,length:'standard'});
 payday.players[0].pos=board==='dominion'?N-1:N-2;
 const before=payday.players[0].cash,salary=board==='dominion'?220000:350000;
 const route=R.roll(payday,spaces);
 assert.deepEqual(route.steps,board==='dominion'?[0,1]:[N-1,0,1]);
 assert.equal(payday.players[0].cash,before+salary);

 const auctionState=R.createMatch(board,raw,{seed,length:'standard'});
 R.roll(auctionState,spaces);
 const beforeBids=auctionState.players.map(p=>p.cash);
 const winner=R.auction(auctionState,spaces,spaces[propertyId].price_sc);
 assert.ok(winner.player>=0&&winner.player<4);
 assert.equal(auctionState.properties[propertyId].owner,winner.player);
 assert.equal(auctionState.players[winner.player].cash,beforeBids[winner.player]-winner.bid);

 const tradeState=R.createMatch(board,raw,{seed,length:'standard'});
 R.roll(tradeState,spaces);
 const traded=spaces.find(t=>t.id!==propertyId&&R.isOwnable(t));
 assert.ok(traded);
 tradeState.properties[traded.id]={owner:1,stage:1};
 const price=Math.ceil(traded.price_sc*(1.13+.28));
 const buyerBefore=tradeState.players[0].cash,sellerBefore=tradeState.players[1].cash;
 R.trade(tradeState,spaces,traded.id,price);
 assert.equal(tradeState.properties[traded.id].owner,0);
 assert.equal(tradeState.players[0].cash,buyerBefore-price);
 assert.equal(tradeState.players[1].cash,sellerBefore+price);
 assert.equal(tradeState.players[0].stats.trades,1);

 tradeState.phase='over';tradeState.winner=0;
 const fact=R.careerFacts(tradeState,spaces);
 assert.equal(fact.board,board);
 assert.equal(fact.ruleset,R.ID);
 assert.equal(fact.challenges[0]?.tag,'negotiation');
 assert.equal(fact.won,true);
 console.log(board,'PASS','rent, GO, auction, trade, old save isolation and Career receipts');
}
