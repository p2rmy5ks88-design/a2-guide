const {ServiceError}=require('./admission.cjs');
function createHttpHandler(service,{allowedOrigins=new Set()}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const origin=req.headers.origin;if(origin&&!allowedOrigins.has(origin)){res.writeHead(403).end();return}
  if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin')}
  if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','GET, POST');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');res.writeHead(204).end();return}
  try{
   const match=/^Bearer ([^\s]+)$/.exec(req.headers.authorization||''),token=match?.[1];let result;
   if(req.method==='GET'&&/^\/v2\/rooms\/[A-Z0-9]{5}$/.test(req.url))result=await service.readRoom(token,req.url.slice(-5));
   else if(req.method==='POST'&&/^\/v2\/rooms\/(create|join|leave|start|action)$/.test(req.url)){
    if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw new ServiceError(415,'json-required');
    const body=await new Promise((resolve,reject)=>{let data='',size=0,failed=false;req.on('data',chunk=>{size+=chunk.length;if(size>8192){if(!failed){failed=true;reject(new ServiceError(413,'body-too-large'))}return}data+=chunk});req.on('error',reject);req.on('end',()=>{if(failed)return;try{resolve(JSON.parse(data))}catch{reject(new ServiceError(400,'invalid-json'))}})});
    result=await service.execute(token,req.url.split('/').pop(),body);
   }else throw new ServiceError(404,'not-found');
   res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify(result));
  }catch(e){const status=e instanceof ServiceError?e.status:503;res.writeHead(status,{'Content-Type':'application/json'}).end(JSON.stringify({error:e instanceof ServiceError?e.code:'temporarily-unavailable'}))}
 };
}
module.exports={createHttpHandler};
