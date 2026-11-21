/* Skyline Estates — approved replacement boards: independent 48/32-space rules.
   ES module, deterministic state, no mutation of older Career save schemas.
   Property prices/types and next-space order are taken from the approved asset board_data.json.
   Game balance here is review-only until the owner approves play-testing. */
export const ID='skyline-approved-board-v1';
const lengths={dominion:{quick:12,standard:18,extended:24},empire:{quick:12,standard:20,extended:28}};
export const cashFormat=n=>(n<0?'-$':'$')+Math.abs(Math.round(n)).toLocaleString('en-US');
export const propertyKinds=new Set(['property','palace','tower','market','garden','transit','utility']);
const ownable=t=>t.kind==='property'||(t.board==='empire'&&propertyKinds.has(t.kind)&&t.price_sc>0);
const rand=s=>{let v=s.rng|0;v^=v<<13;v^=v>>>17;v^=v<<5;s.rng=v>>>0;return s.rng/4294967296};
const dice=s=>1+Math.floor(rand(s)*6);
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const roundTo=(v,n=1000)=>Math.round(v/n)*n;
export const MAX_STAGE={dominion:4,empire:5};
export function createMatch(board,source,{seed=20261121,length='standard',seatCount=4,career=false,matchId}={}){
 if(!['dominion','empire'].includes(board)||!Array.isArray(source.spaces))throw Error('Unsupported board');
 const expected=board==='dominion'?48:32;
 if(source.spaces.length!==expected||source.spaces.some((t,i)=>t.id!==i||t.neighbors?.[1]!==((i+1)%expected)))throw Error('Approved board route is not sequential and complete');
 const rng=Number.isInteger(seed)?seed>>>0:20261121;
 const playerNames=['You','Olivia (CPU)','Marcus (CPU)','Ethan (CPU)'];
 const initial=board==='dominion'?1500000:2500000;
 const players=playerNames.slice(0,seatCount).map((name,id)=>({id,name,token:['lion','eagle','horse','ship'][id],pos:0,cash:initial,skip:0,bankrupt:false,ai:id!==0,stats:{buys:0,builds:0,trades:0,auctions:0},lap:0}));
 return {ruleset:ID,version:1,board,seed:rng,rng:rng||1,matchId:matchId||`${board}-${rng.toString(36)}-${Date.now().toString(36)}`,
 startedAt:Date.now(),career,length,round:1,turn:0,phase:'roll',players,properties:{},selected:0,lastDice:null,lastMove:null,
 event:null,log:[{turn:0,message:'Welcome to the '+(board==='dominion'?'Hex Ring':'Crown Plaza')+'!'}],
 maxRounds:lengths[board][length]||lengths[board].standard,winner:null,endReason:null};
}
export function preserveRules(source,board){if(!source||source.playable_spaces!==(board==='dominion'?48:32))throw Error('Wrong approved board package');return source.spaces.map(t=>({...t,board}));}
export const isOwnable=t=>propertyKinds.has(t?.kind)&&t.price_sc>0;
export const rent=(t,p)=>roundTo(t.price_sc*(p?.stage>=5?.32:p?.stage===4?.24:p?.stage===3?.18:p?.stage===2?.135:p?.stage===1?.09:.052),100);
export const buildCost=(t,p)=>roundTo(t.price_sc*(.28+.06*(p?.stage||0)),1000);
export const propertyValue=(s,spaces,pid)=>Object.entries(s.properties).reduce((sum,[i,p])=>sum+(p.owner===pid?(spaces[+i].price_sc+(p.stage?Array.from({length:p.stage},(_,k)=>buildCost(spaces[+i],{stage:k})).reduce((a,b)=>a+b,0):0)):0),0);
export const worth=(s,spaces,pid)=>(s.players[pid]?.cash||0)+propertyValue(s,spaces,pid);
export const addLog=(s,message)=>{s.log.push({turn:s.round,message});if(s.log.length>70)s.log.shift()};
function transfer(s,from,to,amount){const pay=Math.max(0,Math.min(s.players[from].cash,amount));s.players[from].cash-=pay;if(to!==null)s.players[to].cash+=pay;return pay}
function finish(s,spaces){s.phase='over';const ranking=s.players.map(p=>({id:p.id,worth:worth(s,spaces,p.id)})).sort((a,b)=>b.worth-a.worth);s.winner=ranking[0].id;s.endReason='highest-value';addLog(s,`${s.players[s.winner].name} wins with ${cashFormat(ranking[0].worth)} total value`)}
export function roll(s,spaces){
 if(s.phase!=='roll'||s.turn!==0)throw Error('It is not your dice turn');return rollSeat(s,spaces);
}
function rollSeat(s,spaces){
 if(s.phase!=='roll')throw Error('Dice not ready');
 const p=s.players[s.turn];if(p.skip){p.skip--;s.lastDice=null;s.phase='decide';addLog(s,`${p.name} misses a turn`);return {from:p.pos,to:p.pos,dice:[0,0],steps:[]}}
 const a=dice(s),b=dice(s),prev=p.pos,N=spaces.length,path=Array.from({length:a+b},(_,i)=>(prev+i+1)%N);
 const passes=path.filter(i=>i===0).length;const salary=s.board==='dominion'?220000:350000;
 p.cash+=passes*salary;p.lap+=passes;
 p.pos=path.at(-1);s.lastDice=[a,b];s.lastMove={player:p.id,from:prev,to:p.pos,steps:path.slice(),dice:[a,b]};s.selected=p.pos;
 addLog(s,`${p.name} rolled ${a}+${b} and landed on ${spaces[p.pos].name}${passes?' · GO +'+cashFormat(salary):''}`);
 resolveLanding(s,spaces,p);if(p.id===0&&p.bankrupt)finish(s,spaces);else s.phase='decide';return s.lastMove;
}
function resolveLanding(s,spaces,p){const t=spaces[p.pos],own=s.properties[p.pos];
 if(own&&own.owner!==p.id){const amount=rent(t,own),paid=transfer(s,p.id,own.owner,amount);addLog(s,`${p.name} paid ${cashFormat(paid)} rent to ${s.players[own.owner].name}`)}
 else if(t.kind==='tax'){const amount=Math.min(p.cash,t.price_sc);p.cash-=amount;addLog(s,`${p.name} paid ${cashFormat(amount)} in tax`)}
 else if(t.kind==='chance'||t.kind==='event'||(s.board==='dominion'&&t.kind==='market')){
  const v=roundTo(Math.floor(rand(s)*9-4)*(s.board==='empire'?25000:15000),1000);p.cash=Math.max(0,p.cash+v);s.event=`${t.name}: ${v>=0?'+':''}${cashFormat(v)}`;addLog(s,`${p.name}: ${s.event}`)}
 else if(t.kind==='review'){p.skip=1;addLog(s,`${p.name} is under Civic Review — next turn skipped`)}
 else if(t.kind==='rest'){p.cash+=35000;addLog(s,`${p.name} rested and collected ${cashFormat(35000)}`)}
 else if(t.kind==='gate'&&s.board==='dominion'){p.cash+=50000;addLog(s,`${p.name} crossed a district gateway (+${cashFormat(50000)})`)}
 if(p.cash===0&&!p.bankrupt){p.bankrupt=true;for(const [id,v] of Object.entries(s.properties))if(v.owner===p.id)delete s.properties[id];addLog(s,`${p.name} is insolvent`)}
}
export function buy(s,spaces){
 if(s.phase!=='decide'||s.turn!==0)throw Error('Wait for your landing decision');
 const t=spaces[s.players[0].pos],id=t.id,p=s.players[0];if(!isOwnable(t)||s.properties[id])throw Error('This landing space is not available for purchase');
 if(p.cash<t.price_sc)throw Error('Not enough Skyline Cash to buy this property');
 p.cash-=t.price_sc;s.properties[id]={owner:0,stage:0};p.stats.buys++;addLog(s,`You bought ${t.name} for ${cashFormat(t.price_sc)}`);return true
}
export function build(s,spaces,id=s.selected){
 if(s.phase!=='decide'||s.turn!==0)throw Error('Wait for your turn');
 const p=s.properties[id],t=spaces[id];if(!p||p.owner!==0)throw Error('Select a property you own');
 if(p.stage>=MAX_STAGE[s.board])throw Error('Maximum building stage already reached');
 const price=buildCost(t,p);if(s.players[0].cash<price)throw Error('Not enough Skyline Cash to upgrade');
 s.players[0].cash-=price;p.stage++;s.players[0].stats.builds++;addLog(s,`You upgraded ${t.name} to stage ${p.stage} for ${cashFormat(price)}`);return p.stage
}
export function auction(s,spaces,offer){
 if(s.phase!=='decide'||s.turn!==0)throw Error('Not your turn');const t=spaces[s.players[0].pos];
 if(!isOwnable(t)||s.properties[t.id])throw Error('No unowned property to auction here');
 const budget=clamp(Math.round(Number(offer)||0),0,s.players[0].cash),bids=s.players.filter(p=>!p.bankrupt&&p.ai).map(p=>({player:p.id,bid:Math.min(p.cash,roundTo(t.price_sc*(.45+rand(s)*.67),1000))}));
 bids.push({player:0,bid:budget});bids.sort((a,b)=>b.bid-a.bid||a.player-b.player);const win=bids[0];
 if(win.bid<=0)throw Error('No valid bid');
 s.players[win.player].cash-=win.bid;s.properties[t.id]={owner:win.player,stage:0};s.players[0].stats.auctions++;
 addLog(s,`${s.players[win.player].name} won auction for ${t.name} at ${cashFormat(win.bid)}`);return win
}
export function trade(s,spaces,propertyId,offer){
 if(s.phase!=='decide'||s.turn!==0)throw Error('Not your turn');
 const t=spaces[propertyId],owner=s.properties[propertyId];if(!owner||owner.owner===0||owner.owner<0)throw Error('Choose a rival-owned property');
 const sum=clamp(Math.round(Number(offer)||0),0,s.players[0].cash);const floor=t.price_sc*(1.13+owner.stage*.28);
 if(sum<floor)throw Error('Offer too low: owner requests at least '+cashFormat(floor));
 s.players[0].cash-=sum;s.players[owner.owner].cash+=sum;owner.owner=0;s.players[0].stats.trades++;
 addLog(s,`Trade accepted: you acquired ${t.name} for ${cashFormat(sum)}`);return true
}
export function endTurn(s,spaces){if(s.phase!=='decide'||s.turn!==0)throw Error('Cannot end this turn');return advance(s,spaces)}
function aiDecision(s,spaces){let p=s.players[s.turn],t=spaces[p.pos],owned=s.properties[p.pos];
 if(isOwnable(t)&&!owned&&p.cash>t.price_sc*1.2&&rand(s)>.2){p.cash-=t.price_sc;s.properties[t.id]={owner:p.id,stage:0};p.stats.buys++;addLog(s,`${p.name} bought ${t.name}`)}
 const available=Object.keys(s.properties).map(Number).filter(id=>s.properties[id].owner===p.id&&s.properties[id].stage<MAX_STAGE[s.board]);
 if(available.length&&rand(s)>.52){const id=available[Math.floor(rand(s)*available.length)],price=buildCost(spaces[id],s.properties[id]);if(p.cash>price+150000){p.cash-=price;s.properties[id].stage++;p.stats.builds++;addLog(s,`${p.name} upgraded ${spaces[id].name}`)}}
}
function advance(s,spaces){
 for(let tries=0;tries<s.players.length;tries++){
  s.turn++;if(s.turn>=s.players.length){s.turn=0;s.round++}
  if(s.round>s.maxRounds){finish(s,spaces);return []}
  if(!s.players[s.turn].bankrupt)break;
 }
 const movement=[];
 for(let turns=0;turns<s.players.length*2&&s.turn!==0&&s.phase!=='over';turns++){
  s.phase='roll';const movementEvent=rollSeat(s,spaces);movement.push(movementEvent);aiDecision(s,spaces);
  s.turn++;if(s.turn>=s.players.length){s.turn=0;s.round++}
  if(s.round>s.maxRounds){finish(s,spaces);break}
 }
 if(s.phase!=='over')s.phase='roll';s.selected=s.players[0].pos;return movement;
}
export function score(s,spaces){return s.players.map(p=>({id:p.id,name:p.name,cash:p.cash,worth:worth(s,spaces,p.id)})).sort((a,b)=>b.worth-a.worth)}
export function careerFacts(s,spaces){
 const me=s.players[0],ai=s.players.filter(p=>p.ai).length;return{
  board:s.board,length:s.length,ruleset:ID,matchId:s.matchId,startedAt:s.startedAt,endedAt:Date.now(),
  sim:false,fast:false,online:false,assisted:false,over:s.phase==='over',ownerHuman:!me.ai,
  rounds:s.round,activity:me.stats.buys+me.stats.builds+me.stats.auctions+me.stats.trades,
  won:s.winner===0,score:worth(s,spaces,0),aiOpponents:ai,aiLevel:'normal',players:s.players.length,experimental:s.length==='quick',
  challenges: (me.stats.trades>0?[{id:s.matchId+':trade',tag:'negotiation'}]:[]).concat(s.board==='empire'&&me.stats.builds>0?[{id:s.matchId+':build',tag:'investment'}]:[]),
  tags:[s.board==='dominion'?'negotiation':'investment'],source:'approved-3d-board',saveKey:s.board
 }};
export function restore(raw,spaces,board){try{const s=typeof raw==='string'?JSON.parse(raw):raw;
 if(s?.ruleset!==ID||s?.board!==board||s?.version!==1||s.phase==='over'||!Array.isArray(s.players)||s.players.length<2||s.players.length>4)return null;
 if(!Number.isFinite(s.round)||s.round<1||s.round>100||s.players.some(p=>!Number.isInteger(p.pos)||p.pos<0||p.pos>=spaces.length||!Number.isFinite(p.cash)||p.cash<0))return null;
 if(Object.entries(s.properties).some(([id,p])=>!isOwnable(spaces[id])||!Number.isInteger(p.owner)||p.owner>=s.players.length||p.owner<0||!Number.isInteger(p.stage)||p.stage<0||p.stage>MAX_STAGE[board]))return null;
 return s;
 }catch{return null}}
