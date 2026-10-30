'use strict';
// Re-applies Apple App Store Server Notifications from Apple's notification history (up to 180 days),
// for example after the backend was paused by a spend cap or an outage. Every notification goes through
// the normal verified, idempotent wallet path, so replaying one that was already handled changes nothing.
async function replayHistory({fetchPage,notify,startDate,endDate,maxPages=200}){
 if(typeof fetchPage!=='function'||typeof notify!=='function')throw Error('replay dependencies required');
 if(!Number.isSafeInteger(startDate)||!Number.isSafeInteger(endDate)||startDate>=endDate)throw Error('valid time window required');
 const out={seen:0,applied:0,ignored:0,acknowledged:0,retry:[]};let token=null,pages=0;
 do{
  const page=await fetchPage({startDate,endDate,paginationToken:token});pages++;
  for(const item of page?.notificationHistory||[]){out.seen++;
   try{const r=await notify(item.signedPayload);if(r?.ignored)out.ignored++;else out.applied++}
   catch(e){if(e?.permanent)out.acknowledged++;else out.retry.push(String(e?.code||'error'))}}
  token=page?.hasMore?page.paginationToken:null;
 }while(token&&pages<maxPages);
 return out;
}
module.exports={replayHistory};
