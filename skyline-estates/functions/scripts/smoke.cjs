// Loads every copied module and composes the service with fakes (no network, no credentials).
for(const f of ['player-http.cjs','profile-service.cjs','profile.cjs','firestore-wallet.cjs','wallet.cjs','wallet-auth.cjs','account-bindings.cjs','store-adapters.cjs','notification-replay.cjs'])require('../service/'+f);
const {compose}=require('../compose.js');
const {createFakeFirestore}=require('../../security/service/firestore-fake.cjs');
class Client{constructor(...a){this.args=a}getTransactionInfo(){}getNotificationHistory(){}}class Verifier{constructor(...a){this.args=a}verifyAndDecodeTransaction(){}verifyAndDecodeNotification(){}}
const out=compose({db:createFakeFirestore(),auth:{verifyIdToken:async()=>({uid:'u',firebase:{sign_in_provider:'apple.com'}})},environment:'production',iapKey:'k',iapKeyId:'i',iapIssuer:'s',appAppleId:'6828220714',
 library:{AppStoreServerAPIClient:Client,SignedDataVerifier:Verifier,Environment:{SANDBOX:'Sandbox',PRODUCTION:'Production'}},roots:[Buffer.from('root')]});
if(typeof out.handler!=='function'||!out.clients.production||!out.clients.sandbox||out.clients.production.args[4]!=='Production')throw Error('compose failed');
const src=require('node:fs').readFileSync(require('node:path').join(__dirname,'..','index.js'),'utf8');
if(!src.includes("serviceAccount:'skyline-player@eko-estates.iam.gserviceaccount.com'"))throw Error('function must run as the dedicated skyline-player service account');
console.log('Function runs as the dedicated skyline-player service account');
console.log('Function service modules load and compose (production + sandbox Apple clients)');
