'use strict';
// Skyline Estates player service (accounts, unified profile, Apple purchases).
// NOT DEPLOYED. See DEPLOY.md. The service modules are copied from
// ../security/service by `npm run prepare` so production and tests run the same code.
const {onRequest}=require('firebase-functions/v2/https');
const {defineSecret,defineString}=require('firebase-functions/params');
const {initializeApp}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');
const {getFirestore}=require('firebase-admin/firestore');
const fs=require('node:fs'),path=require('node:path');
const svc=name=>require('./service/'+name);
const {createPlayerHandler,createRateLimiter}=svc('player-http.cjs');
const {createProfileService}=svc('profile-service.cjs');
const {createFirestoreWallet}=svc('firestore-wallet.cjs');
const {createAccountBindings}=svc('account-bindings.cjs');
const {createAppleStoreAdapter,createAppleSignedVerifier}=svc('store-adapters.cjs');
const {APP}=svc('wallet.cjs');

// Owner-provided App Store Connect "In-App Purchase" key (not the build upload key).
const IAP_KEY=defineSecret('SKYLINE_APPLE_IAP_KEY');
const IAP_KEY_ID=defineSecret('SKYLINE_APPLE_IAP_KEY_ID');
const IAP_ISSUER=defineSecret('SKYLINE_APPLE_IAP_ISSUER_ID');
const ENVIRONMENT=defineString('SKYLINE_ENVIRONMENT',{default:'sandbox'});
const APP_APPLE_ID=defineString('SKYLINE_APP_APPLE_ID',{default:'6828220714'});
const ORIGINS=['https://p2rmy5ks88-design.github.io','capacitor://localhost','http://localhost','https://localhost'];

let handler=null;
function build(){
 const environment=ENVIRONMENT.value();
 if(!['sandbox','production'].includes(environment))throw Error('SKYLINE_ENVIRONMENT must be sandbox or production');
 initializeApp();
 const db=getFirestore(),auth=getAuth(),verifyIdToken=(t,c)=>auth.verifyIdToken(t,c);
 const bindings=createAccountBindings({db,verifyIdToken,environment});
 const library=require('@apple/app-store-server-library');
 const roots=fs.readdirSync(path.join(__dirname,'apple-roots')).filter(f=>f.endsWith('.cer')).map(f=>fs.readFileSync(path.join(__dirname,'apple-roots',f)));
 // Production also accepts Sandbox transactions: App Review and TestFlight purchase in Sandbox.
 const storeEnvironments=environment==='production'?['production','sandbox']:['sandbox'];
 const adapters=Object.fromEntries(storeEnvironments.map(env=>{
  const client=new library.AppStoreServerAPIClient(IAP_KEY.value(),IAP_KEY_ID.value(),IAP_ISSUER.value(),APP,env==='sandbox'?library.Environment.SANDBOX:library.Environment.PRODUCTION);
  return[env,createAppleStoreAdapter({environment:env,verifier:createAppleSignedVerifier({library,roots,environment:env,appAppleId:Number(APP_APPLE_ID.value())}),getTransactionInfo:id=>client.getTransactionInfo(id),resolveAccountToken:v=>bindings.resolveApple(v)})];
 }));
 // Pick the verifier from the JWS header claim; the chosen verifier then checks the signature AND environment.
 const claimed=jws=>{try{const env=JSON.parse(Buffer.from(String(jws).split('.')[1],'base64url').toString('utf8')).environment;return env==='Sandbox'?'sandbox':env==='Production'?'production':null}catch{return null}};
 const pick=jws=>{const env=claimed(jws);if(!adapters[env])throw Object.assign(Error('wrong-store-environment'),{code:'wrong-store-environment',permanent:true});return adapters[env]};
 const notificationEnv=payload=>{try{const body=JSON.parse(Buffer.from(String(payload).split('.')[1],'base64url').toString('utf8'));return body?.data?.environment==='Sandbox'?'sandbox':'production'}catch{return null}};
 const wallet=createFirestoreWallet({db,verifyIdToken,environment,storeEnvironments,
  verifyPurchase:proof=>pick(proof?.signedTransaction).verifyPurchase(proof),
  verifyNotification:payload=>{const a=adapters[notificationEnv(payload)];if(!a)throw Object.assign(Error('wrong-store-environment'),{code:'wrong-store-environment',permanent:true});return a.verifyNotification(payload)}});
 const profile=createProfileService({db,verifyIdToken,environment,deleteAuthUser:uid=>auth.deleteUser(uid)});
 return createPlayerHandler({profile,wallet,bindings,allowedOrigins:new Set(ORIGINS),limiter:createRateLimiter({perMinute:90})});
}
exports.skylinePlayer=onRequest({region:'europe-west1',secrets:[IAP_KEY,IAP_KEY_ID,IAP_ISSUER],maxInstances:10,concurrency:40,memory:'256MiB',timeoutSeconds:30,cors:false,invoker:'public'},(req,res)=>{
 if(!handler)handler=build();
 return handler(req,res);
});
