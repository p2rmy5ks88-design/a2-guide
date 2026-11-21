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
