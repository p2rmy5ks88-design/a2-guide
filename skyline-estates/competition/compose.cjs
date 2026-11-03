'use strict';
// Separate competition function. It never imports Apple, wallet or profile IAP.
const {Readable}=require('node:stream');
const {createAdmissionService,ServiceError}=require('../security/service/admission.cjs');
const {createStartService}=require('../security/service/start-service.cjs');
const {createTurnService}=require('../security/service/turn-service.cjs');
const {createRollPlanService}=require('../security/service/roll-plans.cjs');
const {createGameViewService}=require('../security/service/game-view.cjs');
const {createOperationService}=require('../security/service/operation-service.cjs');
const {createHttpHandler}=require('../security/service/http.cjs');
const {createCompetitionService,settings,CITIES}=require('./service.cjs');
const TOKENS=['🚌','🛺','🏍️','🥁','🍲','🦅'],COLORS=['#f6c400','#ff5d73','#41c8ff','#6be38b','#c08bff','#ff9a3c'];
function composeCompetition({db,verifyIdToken,clock=Date.now,allowedOrigins=new Set(['https://p2rmy5ks88-design.github.io','capacitor://localhost','http://localhost','https://localhost']),randomBytes,operationLimit=30}){
 const options={db,verifyIdToken,clock,operationLimit,...(randomBytes?{randomBytes}:{})},competition=createCompetitionService(options),admission=createAdmissionService({...options,maxPlayers:2,invitationLifetimeMs:7*864e5});
 const original=admission.execute;admission.execute=async(token,action,b)=>{if(action==='create'){const city=b?.settings?.city;if(!CITIES.includes(city)||Object.keys(b.settings).length!==Object.keys(settings(city)).length||Object.entries(settings(city)).some(([k,v])=>b.settings[k]!==v))throw new ServiceError(400,'standard-settings-required')}return original(token,action,b)};
 const resolveRoster=(_root,room)=>Object.values(room.seats).sort((a,b)=>a.seat-b.seat).map((s,i)=>({uid:s.uid,name:s.name,tok:TOKENS[i],col:COLORS[i],ai:false,tl:1,fin:null,ch:null,estate:{}}));
 const start=createStartService({...options,resolveRoster}),originalStart=start.startGame;
 start.startGame=async(token,b)=>{const lobby=await start.readLobby(token,{code:b.code});if(lobby.seats.length!==2)throw new ServiceError(409,'exactly-two-players-required');return originalStart(token,b)};
 const gameServices={start,turns:createTurnService(options),plans:createRollPlanService(options),views:createGameViewService(options),operations:createOperationService(options)};
 const gameHandler=createHttpHandler(admission,{allowedOrigins,gameServices});
 const routes={'/v1/competition/me':'getProfile','/v1/competition/profile':'updateProfile','/v1/competition/ingest':'ingest','/v1/competition/rankings':'rankings','/v1/competition/community':'community','/v1/competition/project/claim':'claimProject'};
 async function handler(req,res){
  const path=(req.url||'/').split('?')[0].replace(/^\/skylineCompetition(?=\/)/,'');
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const origin=req.headers.origin;if(origin&&!allowedOrigins.has(origin))return res.writeHead(403).end();if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin')}
  if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','GET, POST');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');return res.writeHead(204).end()}
  const send=(status,data)=>res.writeHead(status,{'Content-Type':'application/json'}).end(JSON.stringify(data));
  if(req.method==='GET'&&path==='/v1/competition/capabilities')return send(200,competition.capabilities());
  if(req.method==='POST'&&routes[path]){try{
   if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw new ServiceError(415,'json-required');
   let body;if(req.body&&typeof req.body==='object')body=req.body;else{let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>8192)throw new ServiceError(413,'body-too-large')}try{body=JSON.parse(raw)}catch{throw new ServiceError(400,'invalid-json')}}
   if(Buffer.byteLength(JSON.stringify(body))>8192)throw new ServiceError(413,'body-too-large');const token=/^Bearer ([^\s]+)$/.exec(req.headers.authorization||'')?.[1]||'';
   return send(200,await competition[routes[path]](token,body));
  }catch(e){return send(e instanceof ServiceError?e.status:503,{error:e instanceof ServiceError?e.code:'temporarily-unavailable'})}}
  // Cloud Functions parses request bodies before the framework-independent
  // audited HTTP handler sees them. Recreate its bounded input stream exactly.
  if(req.body&&typeof req.body==='object'){const raw=Buffer.from(JSON.stringify(req.body));if(raw.length>8192)return send(413,{error:'body-too-large'});const stream=Readable.from([raw]);Object.assign(stream,{headers:req.headers,url:path,method:req.method,socket:req.socket});return gameHandler(stream,res)}
  req.url=path;return gameHandler(req,res);
 }
 return {handler,competition,admission,...gameServices};
}
module.exports={composeCompetition};
