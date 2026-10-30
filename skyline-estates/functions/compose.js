'use strict';
// Shared wiring for the deployed function and the owner's recovery tools, so both use the same
// verified wallet, profile and Apple clients.
const svc=name=>require('./service/'+name);
const {createPlayerHandler,createRateLimiter}=svc('player-http.cjs');
const {createProfileService}=svc('profile-service.cjs');
const {createFirestoreWallet}=svc('firestore-wallet.cjs');
const {createAccountBindings}=svc('account-bindings.cjs');
const {createAppleStoreAdapter,createAppleSignedVerifier}=svc('store-adapters.cjs');
const {APP}=svc('wallet.cjs');
const ORIGINS=['https://p2rmy5ks88-design.github.io','capacitor://localhost','http://localhost','https://localhost'];
function compose({db,auth,environment,iapKey,iapKeyId,iapIssuer,appAppleId,library,roots}){
 if(!['sandbox','production'].includes(environment))throw Error('SKYLINE_ENVIRONMENT must be sandbox or production');
 const verifyIdToken=(t,c)=>auth.verifyIdToken(t,c),clients={};
 const bindings=createAccountBindings({db,verifyIdToken,environment});
 // Production also verifies Sandbox transactions (TestFlight/App Review); the wallet credits them only to listed testers.
 const storeEnvironments=environment==='production'?['production','sandbox']:['sandbox'];
 const adapters=Object.fromEntries(storeEnvironments.map(env=>{
  const client=new library.AppStoreServerAPIClient(iapKey,iapKeyId,iapIssuer,APP,env==='sandbox'?library.Environment.SANDBOX:library.Environment.PRODUCTION);clients[env]=client;
  return[env,createAppleStoreAdapter({environment:env,verifier:createAppleSignedVerifier({library,roots,environment:env,appAppleId:Number(appAppleId)}),getTransactionInfo:id=>client.getTransactionInfo(id),resolveAccountToken:v=>bindings.resolveApple(v)})];
 }));
 // Pick the verifier from the JWS header claim; the chosen verifier then checks the signature AND environment.
 const claimed=jws=>{try{const env=JSON.parse(Buffer.from(String(jws).split('.')[1],'base64url').toString('utf8')).environment;return env==='Sandbox'?'sandbox':env==='Production'?'production':null}catch{return null}};
 const pick=jws=>{const env=claimed(jws);if(!adapters[env])throw Object.assign(Error('wrong-store-environment'),{code:'wrong-store-environment',permanent:true});return adapters[env]};
 const notificationEnv=payload=>{try{const body=JSON.parse(Buffer.from(String(payload).split('.')[1],'base64url').toString('utf8'));return body?.data?.environment==='Sandbox'?'sandbox':'production'}catch{return null}};
 const wallet=createFirestoreWallet({db,verifyIdToken,environment,storeEnvironments,
  verifyPurchase:proof=>pick(proof?.signedTransaction).verifyPurchase(proof),
  verifyNotification:payload=>{const a=adapters[notificationEnv(payload)];if(!a)throw Object.assign(Error('wrong-store-environment'),{code:'wrong-store-environment',permanent:true});return a.verifyNotification(payload)}});
 const profile=createProfileService({db,verifyIdToken,environment,deleteAuthUser:uid=>auth.deleteUser(uid)});
 // Owner switch (scripts/store-pause.cjs): stops NEW purchases before Apple's payment sheet opens.
 let pause={at:0,value:false};const cfg=db.doc('skylineConfig/'+environment);
 const storePaused=async()=>{if(Date.now()-pause.at<30000)return pause.value;try{pause={at:Date.now(),value:(await cfg.get()).data()?.purchasesPaused===true}}catch{pause={at:Date.now(),value:true}}return pause.value};
 const handler=createPlayerHandler({profile,wallet,bindings,storePaused,allowedOrigins:new Set(ORIGINS),limiter:createRateLimiter({perMinute:90})});
 return{handler,wallet,profile,bindings,clients};
}
module.exports={compose,ORIGINS};
