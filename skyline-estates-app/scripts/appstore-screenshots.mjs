// Uploads skyline-estates-app/appstore/screenshots/*.png (2868x1320, iPhone 6.9") to the en-US
// localization of the iOS version that is being prepared for submission. Uses the App Store Connect
// API key from GitHub secrets (ASC_KEY_B64 / ASC_KEY_ID / ASC_ISSUER); prints no secrets.
// Replaces the screenshots in that set so reruns are safe.
import crypto from 'node:crypto';import fs from 'node:fs';import path from 'node:path';
const APP='6828220714',dir=path.resolve(path.dirname(new URL(import.meta.url).pathname),'../appstore/screenshots');
const key=Buffer.from(process.env.ASC_KEY_B64||'','base64').toString('utf8'),kid=process.env.ASC_KEY_ID,iss=process.env.ASC_ISSUER;
if(!key.includes('PRIVATE KEY')||!kid||!iss)throw Error('App Store Connect API key secrets are missing');
const b64=o=>Buffer.from(typeof o==='string'?o:JSON.stringify(o)).toString('base64url');
function token(){const now=Math.floor(Date.now()/1000),head=b64({alg:'ES256',kid,typ:'JWT'}),body=b64({iss,iat:now,exp:now+900,aud:'appstoreconnect-v1'});
 const sig=crypto.sign('sha256',Buffer.from(head+'.'+body),{key,dsaEncoding:'ieee-p1363'});return head+'.'+body+'.'+sig.toString('base64url')}
async function api(method,p,body){const r=await fetch('https://api.appstoreconnect.apple.com'+p,{method,headers:{Authorization:'Bearer '+token(),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
 const t=await r.text();if(!r.ok){const e=Error(method+' '+p.split('?')[0]+' -> '+r.status+' '+t.slice(0,400));e.status=r.status;throw e}return t?JSON.parse(t):{}}
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.png')).sort();if(!files.length)throw Error('no screenshots');
const versions=await api('GET',`/v1/apps/${APP}/appStoreVersions?filter[platform]=IOS&limit=10`);
const version=versions.data.find(v=>['PREPARE_FOR_SUBMISSION','DEVELOPER_REJECTED','REJECTED','METADATA_REJECTED'].includes(v.attributes.appStoreState||v.attributes.appVersionState));
if(!version)throw Error('no editable iOS version: '+versions.data.map(v=>v.attributes.versionString+':'+(v.attributes.appStoreState||v.attributes.appVersionState)).join(', '));
console.log('version',version.attributes.versionString,version.attributes.appStoreState||version.attributes.appVersionState);
const locs=await api('GET',`/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations`);const loc=locs.data.find(l=>l.attributes.locale==='en-US')||locs.data[0];console.log('locale',loc.attributes.locale);
const sets=await api('GET',`/v1/appStoreVersionLocalizations/${loc.id}/appScreenshotSets`);
let set=null;for(const type of ['APP_IPHONE_69','APP_IPHONE_67']){set=sets.data.find(s=>s.attributes.screenshotDisplayType===type);if(set)break;
 try{set=(await api('POST','/v1/appScreenshotSets',{data:{type:'appScreenshotSets',attributes:{screenshotDisplayType:type},relationships:{appStoreVersionLocalization:{data:{type:'appStoreVersionLocalizations',id:loc.id}}}}})).data;break}catch(e){console.log('display type',type,'not accepted:',e.status)}}
if(!set)throw Error('could not find or create an iPhone 6.9" screenshot set');console.log('set',set.attributes.screenshotDisplayType);
const old=await api('GET',`/v1/appScreenshotSets/${set.id}/appScreenshots`);for(const s of old.data){await api('DELETE','/v1/appScreenshots/'+s.id);console.log('removed old',s.attributes.fileName)}
for(const f of files){const buf=fs.readFileSync(path.join(dir,f));
 const shot=(await api('POST','/v1/appScreenshots',{data:{type:'appScreenshots',attributes:{fileName:f,fileSize:buf.length},relationships:{appScreenshotSet:{data:{type:'appScreenshotSets',id:set.id}}}}})).data;
 for(const op of shot.attributes.uploadOperations){const r=await fetch(op.url,{method:op.method,headers:Object.fromEntries(op.requestHeaders.map(h=>[h.name,h.value])),body:buf.subarray(op.offset,op.offset+op.length)});if(!r.ok)throw Error('upload part failed '+r.status)}
 await api('PATCH','/v1/appScreenshots/'+shot.id,{data:{type:'appScreenshots',id:shot.id,attributes:{uploaded:true,sourceFileChecksum:crypto.createHash('md5').update(buf).digest('hex')}}});console.log('uploaded',f)}
for(let i=0;i<30;i++){const s=await api('GET',`/v1/appScreenshotSets/${set.id}/appScreenshots`);const states=s.data.map(x=>x.attributes.assetDeliveryState?.state);console.log('states',states.join(','));if(states.every(x=>x==='COMPLETE'))break;if(states.some(x=>x==='FAILED'))throw Error('Apple rejected a screenshot: '+JSON.stringify(s.data.map(x=>x.attributes.assetDeliveryState)));await new Promise(r=>setTimeout(r,10000))}
