// Explicit public projection; never serialize the authoritative game wholesale.
const crypto=require('node:crypto');
const {ServiceError,identityVerifier}=require('./admission.cjs');
const {sourceHash}=require('./audited-rules.cjs');
const {openingView}=require('./opening-view.cjs');
const {jailView}=require('./turn-kernel.cjs');
const pick=(value,fields)=>Object.fromEntries(fields.filter(k=>Object.hasOwn(value||{},k)).map(k=>[k,value[k]]));
const fail=(status,code)=>{throw new ServiceError(status,code)};
function publicGame(game){
 if(!game||!Array.isArray(game.players)||!Array.isArray(game.own)||game.own.length!==40)fail(409,'invalid-game-state');
 const result=pick(game,['v','tokenPowerVersion','online','code','turn','round','pot','houses','hotels','over','phase','doubles','first','lateBonus','logN']);
 result.players=game.players.map(p=>({...pick(p,['id','name','tok','col','ai','cash','pos','inJail','jailTurns','bankrupt','tl','fin','ch','lapped','rrUsed','passUsed','shieldUsed','surgeUsed']),...(p.estate?{estate:Object.fromEntries(Object.entries(p.estate).filter(([k,v])=>/^([0-9]|[1-3][0-9])$/.test(k)&&Number.isInteger(v)&&v>=1&&v<=5))}:{}),bailPasses:Array.isArray(p.goojf)?p.goojf.length:0}));
 if(game.lastDice)result.lastDice=pick(game.lastDice,['a','b','sv','n']);
 result.own=game.own.map(o=>pick(o,['o','h','m']));
 result.set=pick(game.set,['mode','city','theme','cash','rounds','ai','speed','timer','minigames','perks','ffa','events','speedDie','pot','goDouble','jailRent','auction','even','interest']);
 if(game.event)result.event=pick(game.event,['id','round']);
 result.log=Array.isArray(game.log)?game.log.filter(x=>typeof x==='string').slice(-120):[];
 return JSON.parse(JSON.stringify(result));
}
const decisionFields={
 purchase:['kind','square','price','canBuy'],card:['kind','deck','square'],
 reroll:['kind','dice','remaining'],jail:['kind','seat','bail','canPay','passes','attempt'],
 auction:['kind','square','seat','bid','leader','active'],debt:['kind','payer','amount','to','paymentKind','restorePhase'],
 trade:['kind','seat','offerHash','offer','depth']
};
function publicDecision(boundary){
 const fields=decisionFields[boundary?.kind];if(!fields)return null;
 const result=pick(boundary,fields);
 if(boundary.kind==='trade'&&result.offer){result.offer=pick(result.offer,['from','to','give','get','gc','rc','gcard','rcard']);}
 if(boundary.kind==='reroll'&&result.dice)result.dice=pick(result.dice,['a','b','sv','face']);
 return JSON.parse(JSON.stringify(result));
}
function createGameViewService({db,verifyIdToken,timeoutMs=3000}){
 if(!db||typeof verifyIdToken!=='function')throw Error('Verified authentication and a privileged store are required');
 const identity=identityVerifier(verifyIdToken);
 async function readGame(token,input){
  const uid=await identity(token);
  if(!input||Object.keys(input).join(',')!=='code'||!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/.test(input.code||''))fail(400,'invalid-fields');
  let tx,timer;
  try{tx=await Promise.race([db.ref('skylineV2').transaction(v=>v,undefined,false),new Promise((_,reject)=>timer=setTimeout(()=>reject(new ServiceError(503,'temporarily-unavailable')),timeoutMs))])}
  catch(e){if(e instanceof ServiceError)throw e;fail(503,'temporarily-unavailable')}finally{clearTimeout(timer)}
  if(!tx.committed)fail(503,'temporarily-unavailable');
  const root=tx.snapshot.val(),room=root?.rooms?.[input.code];
  if(room?.members?.[uid]!==true)fail(403,'not-authorized');
  if(!['playing','over'].includes(room.meta?.status)||!Number.isSafeInteger(room.state?.revision))fail(409,'game-not-ready');
  let game;try{if(typeof room.state.gameJson!=='string'||Buffer.byteLength(room.state.gameJson)>262144)throw Error();game=JSON.parse(room.state.gameJson)}catch{fail(409,'invalid-game-state')}
  if(game.code!==input.code||game.phase!==room.state.phase)fail(409,'invalid-game-state');
  const seat=room.seats?.[uid]?.seat;if(!Number.isInteger(seat)||game.players?.[seat]?.uid!==uid)fail(403,'not-authorized');
  const saved=root.service?.turns?.[input.code];let decision=null,actorSeat=game.turn,stage=game.phase;
  if(saved){
   if(saved.version!==1||saved.revision!==room.state.revision||saved.sourceHash!==sourceHash||saved.gameHash!==crypto.createHash('sha256').update(room.state.gameJson).digest('hex'))fail(409,'invalid-turn-checkpoint');
   let boundary;try{boundary=JSON.parse(saved.checkpointJson).boundary;if(typeof boundary?.kind!=='string')throw Error()}catch{fail(409,'invalid-turn-checkpoint')}
   actorSeat=['auction','auction-ai','trade'].includes(boundary.kind)&&Number.isInteger(boundary.seat)?boundary.seat:boundary.kind==='debt'?(boundary.payer??game.turn):game.turn;
   if(!Number.isInteger(actorSeat)||!game.players[actorSeat]||saved.actorUid!==(game.players[actorSeat].uid||''))fail(409,'invalid-turn-checkpoint');
   stage=boundary.kind;
   if(saved.actorUid===uid)decision=publicDecision(boundary.kind==='jail'?jailView(game,uid):boundary);
  }
  return{protocol:2,code:input.code,revision:room.state.revision,status:room.meta.status,seat,actorSeat,stage,game:publicGame(game),decision,...(root.service?.starts?.[input.code]?{opening:openingView(root,room,game)}:{})};
 }
 return{readGame};
}
module.exports={createGameViewService,publicGame,publicDecision};
