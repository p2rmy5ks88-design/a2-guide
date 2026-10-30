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
const {compose}=require('./compose.js');

// Owner-provided App Store Connect "In-App Purchase" key (not the build upload key).
const IAP_KEY=defineSecret('SKYLINE_APPLE_IAP_KEY');
const IAP_KEY_ID=defineSecret('SKYLINE_APPLE_IAP_KEY_ID');
const IAP_ISSUER=defineSecret('SKYLINE_APPLE_IAP_ISSUER_ID');
const ENVIRONMENT=defineString('SKYLINE_ENVIRONMENT',{default:'sandbox'});
const APP_APPLE_ID=defineString('SKYLINE_APP_APPLE_ID',{default:'6828220714'});

let handler=null;
function build(){
 initializeApp();
 const library=require('@apple/app-store-server-library');
 const roots=fs.readdirSync(path.join(__dirname,'apple-roots')).filter(f=>f.endsWith('.cer')).map(f=>fs.readFileSync(path.join(__dirname,'apple-roots',f)));
 return compose({db:getFirestore(),auth:getAuth(),environment:ENVIRONMENT.value(),iapKey:IAP_KEY.value(),iapKeyId:IAP_KEY_ID.value(),iapIssuer:IAP_ISSUER.value(),appAppleId:APP_APPLE_ID.value(),library,roots}).handler;
}
exports.skylinePlayer=onRequest({region:'europe-west1',serviceAccount:'skyline-player@eko-estates.iam.gserviceaccount.com',secrets:[IAP_KEY,IAP_KEY_ID,IAP_ISSUER],maxInstances:10,concurrency:40,memory:'256MiB',timeoutSeconds:30,cors:false,invoker:'public'},(req,res)=>{
 if(!handler)handler=build();
 return handler(req,res);
});
