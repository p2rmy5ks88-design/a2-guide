// Game routes require explicit service composition; default lobby behavior is unchanged.
const GAME_ROUTES=Object.freeze({
 "/v2/game/start":["start","startGame"],
 "/v2/game/seat":["start","selectSeat"],
 "/v2/game/lobby":["start","readLobby"],
 "/v2/game/asset":["admission","assetAction"],
 "/v2/game/purchase-assets":["turns","purchaseAsset"],
 "/v2/game/operation/settle":["operations","settle"],
 "/v2/game/roll/reserve": [
  "plans",
  "reserveRoll"
 ],
 "/v2/game/roll/load": [
  "plans",
  "loadRoll"
 ],
 "/v2/game/roll/recover": [
  "plans",
  "recoverRoll"
 ],
 "/v2/game/roll/commit": [
  "turns",
  "commitRoll"
 ],
 "/v2/game/jail-roll/reserve": [
  "plans",
  "reserveJailRoll"
 ],
 "/v2/game/jail-roll/load": [
  "plans",
  "loadJailRoll"
 ],
 "/v2/game/jail-roll/recover": [
  "plans",
  "recoverJailRoll"
 ],
 "/v2/game/jail-roll/commit": [
  "turns",
  "commitJailRoll"
 ],
 "/v2/game/reroll/reserve": [
  "plans",
  "reserveReroll"
 ],
 "/v2/game/reroll/load": [
  "plans",
  "loadReroll"
 ],
 "/v2/game/reroll/recover": [
  "plans",
  "recoverReroll"
 ],
 "/v2/game/reroll/commit": [
  "turns",
  "commitReroll"
 ],
 "/v2/game/read": [
  "views",
  "readGame"
 ],
 "/v2/game/decision": [
  "turns",
  "readDecision"
 ],
 "/v2/game/result": [
  "turns",
  "readResult"
 ],
 "/v2/game/choice": [
  "turns",
  "choose"
 ],
 "/v2/game/auction-bid": [
  "turns",
  "auctionBid"
 ],
 "/v2/game/debt": [
  "turns",
  "debtAction"
 ],
 "/v2/game/end": [
  "turns",
  "endTurn"
 ],
 "/v2/game/trade/propose": [
  "turns",
  "proposeTrade"
 ],
 "/v2/game/trade/reply": [
  "turns",
  "replyTrade"
 ]
});
const {ServiceError}=require('./admission.cjs');
function createHttpHandler(service,{allowedOrigins=new Set(),gameServices=null}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const origin=req.headers.origin;if(origin&&!allowedOrigins.has(origin)){res.writeHead(403).end();return}
  if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin')}
  if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','GET, POST');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');res.writeHead(204).end();return}
  try{
   const match=/^Bearer ([^\s]+)$/.exec(req.headers.authorization||''),token=match?.[1];let result;
   if(req.method==='GET'&&/^\/v2\/rooms\/[A-Z0-9]{5}$/.test(req.url))result=await service.readRoom(token,req.url.slice(-5));
   else if(req.method==='POST'&&(/^\/v2\/rooms\/(create|join|leave|start|action)$/.test(req.url)||gameServices&&Object.hasOwn(GAME_ROUTES,req.url))){
    if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw new ServiceError(415,'json-required');
    const body=await new Promise((resolve,reject)=>{let data='',size=0,failed=false;req.on('data',chunk=>{size+=chunk.length;if(size>8192){if(!failed){failed=true;reject(new ServiceError(413,'body-too-large'))}return}data+=chunk});req.on('error',reject);req.on('end',()=>{if(failed)return;try{resolve(JSON.parse(data))}catch{reject(new ServiceError(400,'invalid-json'))}})});
    if(Object.hasOwn(GAME_ROUTES,req.url)){const [group,method]=GAME_ROUTES[req.url];const target=group==='admission'?service:gameServices?.[group];if(typeof target?.[method]!=='function')throw new ServiceError(501,'game-route-not-enabled');result=await target[method](token,body)}else if(req.url==='/v2/rooms/start'&&typeof gameServices?.start?.startGame==='function')result=await gameServices.start.startGame(token,body);else result=await service.execute(token,req.url.split('/').pop(),body);
   }else throw new ServiceError(404,'not-found');
   res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify(result));
  }catch(e){const status=e instanceof ServiceError?e.status:503;res.writeHead(status,{'Content-Type':'application/json'}).end(JSON.stringify({error:e instanceof ServiceError?e.code:'temporarily-unavailable'}))}
 };
}
module.exports={createHttpHandler};
