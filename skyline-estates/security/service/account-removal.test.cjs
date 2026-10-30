'use strict';
// Order and failure behaviour of account removal with Sign in with Apple revocation.
const assert=require('node:assert/strict');
const {createFirebaseAccountAdapter}=require('../../lib/account-firebase.js');
let count=0;
function fixture({providers=['apple.com'],native=true,code='apple-auth-code',deletePlayer=true}={}){
 const calls=[],user={uid:'u1',email:'p@example.test',providerData:providers.map(providerId=>({providerId})),getIdToken:async force=>{calls.push('token:'+force);return 'fresh-token'}};
 const auth={currentUser:user,authStateReady:async()=>{}};
 class OAuthProvider{constructor(id){this.id=id}addScope(){}credential(v){return{provider:this.id,...v}}static credentialFromResult(){return code?{accessToken:code}:null}}
 const sdk={getAuth:()=>auth,setPersistence:async()=>{},browserLocalPersistence:{},OAuthProvider,GoogleAuthProvider:class{static credential(){return{provider:'google.com'}}},EmailAuthProvider:{credential:(e,p)=>({provider:'password',e,p})},
  reauthenticateWithCredential:async(u,c)=>calls.push('reauth:'+c.provider),reauthenticateWithPopup:async(u,p)=>{calls.push('popup:'+p.id);return{}},revokeAccessToken:async(a,t)=>calls.push('revoke:'+t),signOut:async()=>calls.push('signout')};
 const appSdk={getApps:()=>[],initializeApp:()=>({})};
 const config={projectId:'demo',...(deletePlayer?{deletePlayer:async t=>calls.push('delete:'+t)}:{})};
 const nativeCredential=async()=>({credential:{idToken:'id',nonce:'n',authorizationCode:code}});
 return{calls,make:()=>createFirebaseAccountAdapter({appSdk,authSdk:sdk,config,native,nativeCredential,nativeProviders:['apple.com']})};
}
async function test(name,fn){await fn();count++;console.log('ok - '+name)}
(async()=>{
 await test('native Apple account: fresh Apple sign-in, revoke token, server removal, then sign-out',async()=>{const f=fixture(),a=await f.make();await a.remove();assert.deepEqual(f.calls,['reauth:apple.com','revoke:apple-auth-code','token:true','delete:fresh-token','signout'])});
 await test('web Apple account revokes with the popup credential',async()=>{const f=fixture({native:false}),a=await f.make();await a.remove();assert.deepEqual(f.calls,['popup:apple.com','revoke:apple-auth-code','token:true','delete:fresh-token','signout'])});
 await test('Apple-linked email account still revokes Apple',async()=>{const f=fixture({providers:['password','apple.com']}),a=await f.make();await a.remove({password:'x'});assert.equal(f.calls[1],'revoke:apple-auth-code')});
 await test('missing Apple revocation code stops before any data is removed',async()=>{const f=fixture({code:null}),a=await f.make();await assert.rejects(()=>a.remove(),e=>e.code==='account/apple-revoke-unavailable');assert.equal(f.calls.some(c=>c.startsWith('delete')),false)});
 await test('email-only account re-enters the password and needs no revocation',async()=>{const f=fixture({providers:['password']}),a=await f.make();await a.remove({password:'pw'});assert.deepEqual(f.calls,['reauth:password','token:true','delete:fresh-token','signout'])});
 await test('without the deletion service nothing is attempted',async()=>{const f=fixture({deletePlayer:false}),a=await f.make();await assert.rejects(()=>a.remove(),e=>e.code==='account/deletion-service-required');assert.deepEqual(f.calls,[])});
 console.log(count+' account removal checks passed');
})().catch(e=>{console.error(e);process.exitCode=1});
