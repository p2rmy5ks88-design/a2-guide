// Owner recovery tool: re-apply Apple notifications (refunds, reversals) from Apple's history after the
// service was paused (spend cap, outage). Safe to run repeatedly: the wallet path is idempotent.
//   SKYLINE_IAP_KEY_FILE=~/secure/SubscriptionKey_XXXX.p8 SKYLINE_IAP_KEY_ID=... SKYLINE_IAP_ISSUER_ID=... \
//   node scripts/replay-notifications.cjs <days-back, max 180> [sandbox|production]
// Uses your own Google login (gcloud auth application-default login). The key file stays on your computer.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {initializeApp}=require('firebase-admin/app'),{getFirestore}=require('firebase-admin/firestore'),{getAuth}=require('firebase-admin/auth');
const {compose}=require('../compose.js'),{replayHistory}=require('../service/notification-replay.cjs');
const days=Math.min(180,Math.max(1,parseInt(process.argv[2]||'7',10))),storeEnv=process.argv[3]||'production';
const keyFile=(process.env.SKYLINE_IAP_KEY_FILE||'').replace(/^~/,os.homedir());
if(!keyFile||!fs.existsSync(keyFile)||!process.env.SKYLINE_IAP_KEY_ID||!process.env.SKYLINE_IAP_ISSUER_ID){console.error('Set SKYLINE_IAP_KEY_FILE, SKYLINE_IAP_KEY_ID and SKYLINE_IAP_ISSUER_ID');process.exit(2)}
initializeApp({projectId:process.env.GCLOUD_PROJECT||'eko-estates'});
const library=require('@apple/app-store-server-library');
const roots=fs.readdirSync(path.join(__dirname,'..','apple-roots')).filter(f=>f.endsWith('.cer')).map(f=>fs.readFileSync(path.join(__dirname,'..','apple-roots',f)));
const {wallet,clients}=compose({db:getFirestore(),auth:getAuth(),environment:process.env.SKYLINE_ENVIRONMENT||'production',iapKey:fs.readFileSync(keyFile,'utf8'),iapKeyId:process.env.SKYLINE_IAP_KEY_ID,iapIssuer:process.env.SKYLINE_IAP_ISSUER_ID,appAppleId:process.env.SKYLINE_APP_APPLE_ID||'6828220714',library,roots});
const client=clients[storeEnv];if(!client){console.error('No client for '+storeEnv);process.exit(2)}
const endDate=Date.now(),startDate=endDate-days*864e5;
replayHistory({startDate,endDate,notify:p=>wallet.notification(p),fetchPage:({paginationToken})=>client.getNotificationHistory(paginationToken||null,{startDate,endDate})})
 .then(r=>{console.log(JSON.stringify(r));if(r.retry.length)process.exitCode=1}).catch(e=>{console.error(e.code||e.message);process.exit(1)});
