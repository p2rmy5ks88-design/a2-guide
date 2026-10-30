'use strict';
// HTTPS routes for accounts, the unified profile and store delivery. Works as a
// plain Node (req,res) handler and inside a Cloud Functions v2 onRequest wrapper.
// Only error codes are returned to clients, never stack traces or messages.
const STATUS={'unauthenticated':401,'recent-sign-in-required':401,'persistent-account-required':403,'unsupported-identity':403,'purchase-owner-conflict':409,'sandbox-purchase-not-allowed':403,'test-account-retired':403,'tester-import-blocked':403,'store-paused':503,'test-account-real-purchase-blocked':403,'idempotency-conflict':409,'account-removed':410,'deletion-not-configured':503,'wallet-spending-not-configured':503,'delivery-not-configured':503,'rate-limited':429,'payload-too-large':413,'not-found':404};
const LIMIT=64*1024;
function readBody(req){
 if(req.body!==undefined&&req.body!==null&&typeof req.body==='object'&&!Buffer.isBuffer(req.body))return Promise.resolve(req.body);
 if(Buffer.isBuffer(req.rawBody)||Buffer.isBuffer(req.body)){const raw=req.rawBody||req.body;if(raw.length>LIMIT)return Promise.reject(Object.assign(Error('payload-too-large'),{code:'payload-too-large'}));return Promise.resolve(raw.length?JSON.parse(raw.toString('utf8')):{})}
 return new Promise((resolve,reject)=>{let size=0;const parts=[];req.on('data',c=>{size+=c.length;if(size>LIMIT)reject(Object.assign(Error('payload-too-large'),{code:'payload-too-large'}));else parts.push(c)});req.on('end',()=>{if(size>LIMIT)return;try{const s=Buffer.concat(parts).toString('utf8');resolve(s?JSON.parse(s):{})}catch{reject(Object.assign(Error('invalid-json'),{code:'invalid-json'}))}});req.on('error',reject)});
}
function createRateLimiter({perMinute=60,clock=Date.now}={}){const seen=new Map();return key=>{const now=clock(),win=Math.floor(now/60000);const v=seen.get(key);if(!v||v.win!==win){seen.set(key,{win,n:1});if(seen.size>5000)for(const [k,x] of seen)if(x.win!==win)seen.delete(k);return}if(++v.n>perMinute)throw Object.assign(Error('rate-limited'),{code:'rate-limited'})}}
function createPlayerHandler({profile,wallet=null,bindings=null,allowedOrigins=new Set(),limiter=createRateLimiter(),storePaused=async()=>false}){
 if(!profile)throw Error('Profile service required');
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const origin=req.headers.origin,url=new URL(req.url||'/','http://local'),path=url.pathname.replace(/^\/api(?=\/)/,'');
  const notifications=path==='/v1/store/apple-notifications';
  if(origin&&!notifications){if(!allowedOrigins.has(origin)){res.writeHead(403).end();return}res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin')}
  if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','GET, POST, DELETE');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');res.setHeader('Access-Control-Max-Age','600');res.writeHead(204).end();return}
  const send=(status,value)=>{res.setHeader('Content-Type','application/json');res.writeHead(status).end(JSON.stringify(value))};
  try{
   const token=/^Bearer ([^\s]{1,8192})$/.exec(req.headers.authorization||'')?.[1]||'';
   limiter((token?token.slice(-32):'anon')+':'+(req.headers['x-forwarded-for']||req.socket?.remoteAddress||''));
   const need=(x,name)=>{if(!x)throw Object.assign(Error(name+'-not-configured'),{code:'delivery-not-configured'});return x};
   let result;const m=req.method;
   if(m==='GET'&&path==='/v1/profile')result=await profile.get(token);
   else if(m==='POST'&&path==='/v1/profile/migrate')result=await profile.migrate(token,await readBody(req));
   else if(m==='POST'&&path==='/v1/profile/sync')result=await profile.sync(token,await readBody(req));
   else if(m==='DELETE'&&path==='/v1/account')result=await profile.remove(token);
   // The app asks for its store binding before it opens Apple's payment sheet, so a pause here stops new
   // purchases before anyone is charged. Delivery of already-paid purchases and refunds keep working.
   else if(m==='POST'&&path==='/v1/store/binding'){if(await storePaused())throw Object.assign(Error('store-paused'),{code:'store-paused',status:503});result=await need(bindings,'bindings').forPlayer(token)}
   else if(m==='POST'&&path==='/v1/store/purchase'){const body=await readBody(req);result=await need(wallet,'wallet').purchase(token,body?.proof)}
   else if(m==='GET'&&/^\/v1\/store\/delivery\/[a-f0-9]{64}$/.test(path))result=await need(wallet,'wallet').delivery(token,path.slice(-64));
   else if(m==='GET'&&path==='/v1/wallet/history'){const cursor=url.searchParams.get('cursor');result=await need(wallet,'wallet').history(token,cursor?{cursor}:{})}
   else if(m==='POST'&&notifications){const body=await readBody(req);await need(wallet,'wallet').notification(body?.signedPayload);result={ok:true}}
   else throw Object.assign(Error('not-found'),{code:'not-found'});
   send(200,result);
  }catch(error){
   const code=typeof error?.code==='string'&&/^[a-z0-9-]{1,60}$/.test(error.code)?error.code:'unavailable';
   // Apple retries notifications on non-2xx; permanent validation failures are acknowledged.
   if(notifications&&error?.permanent){send(200,{ok:false,code});return}
   send(error?.status||STATUS[code]||(code==='unavailable'?503:400),{error:code});
  }
 };
}
module.exports={createPlayerHandler,createRateLimiter,readBody};
