/* Firebase SDK adapter. SDK modules are loaded only when the player opens accounts. */
(function(scope){
'use strict';
function within(promise,ms,code){let t;return Promise.race([promise,new Promise((_,reject)=>{t=setTimeout(()=>reject(Object.assign(Error(code),{code})),ms)})]).finally(()=>clearTimeout(t))}
async function createFirebaseAccountAdapter({appSdk,authSdk:sdk,config,native=false,nativeCredential=null,nativeProviders=[],emulator=null,appName='skyline-player-account'}){
 const app=appSdk.getApps().find(a=>a.name===appName)||appSdk.initializeApp(config,appName);
 // In the iOS app's web view getAuth() never becomes ready (its default popup/iframe and
 // IndexedDB setup hang under capacitor://). Native builds use initializeAuth with IndexedDB
 // persistence and no popup resolver; sign-in there goes through the native Apple/Google bridge.
 let auth;if(native&&sdk.initializeAuth&&sdk.indexedDBLocalPersistence){try{auth=sdk.initializeAuth(app,{persistence:sdk.indexedDBLocalPersistence})}catch{auth=sdk.getAuth(app)}}else auth=sdk.getAuth(app);
 if(emulator){const u=new URL(emulator);if(config.projectId!=='demo-skyline-phase1'||u.hostname!=='127.0.0.1'||u.protocol!=='http:')throw Error('Loopback demo Auth emulator only');sdk.connectAuthEmulator(auth,emulator,{disableWarnings:true})}
 if(!native)await sdk.setPersistence(auth,sdk.browserLocalPersistence);
 await within(auth.authStateReady(),20000,'account/auth-timeout');
 const provider=p=>{const value=p==='google.com'?new sdk.GoogleAuthProvider():new sdk.OAuthProvider('apple.com');if(p==='apple.com'){value.addScope('email');value.addScope('name')}return value};
 const emailCredential=values=>sdk.EmailAuthProvider.credential(String(values?.email||'').trim(),String(values?.password||''));
 async function credential(p,keep){
  if(!nativeCredential||!nativeProviders.includes(p))throw Object.assign(Error('Native sign-in setup is not complete'),{code:'account/native-setup-required'});
  const r=await nativeCredential(p),idToken=r?.credential?.idToken||r?.idToken;if(keep)keep.authorizationCode=r?.credential?.authorizationCode||null;
  if(p==='google.com')return sdk.GoogleAuthProvider.credential(idToken,r?.credential?.accessToken||r?.accessToken);
  const rawNonce=r?.credential?.nonce||r?.nonce;if(typeof rawNonce!=='string'||!rawNonce||typeof idToken!=='string'||!idToken)throw Object.assign(Error('Apple nonce or identity token missing'),{code:'auth/missing-or-invalid-nonce'});
  return provider(p).credential({idToken,rawNonce});
 }
 async function oauth(p,link){if(native){const c=await credential(p);return link?sdk.linkWithCredential(auth.currentUser,c):sdk.signInWithCredential(auth,c)}return link?sdk.linkWithPopup(auth.currentUser,provider(p)):sdk.signInWithPopup(auth,provider(p))}
 return {
  current:()=>auth.currentUser,
  available:p=>p==='password'||!native||!!nativeCredential&&nativeProviders.includes(p),
  subscribe:fn=>sdk.onAuthStateChanged(auth,fn),
  signIn:async(p,values)=>p==='password'?sdk.signInWithEmailAndPassword(auth,String(values?.email||'').trim(),String(values?.password||'')):oauth(p,false),
  register:values=>sdk.createUserWithEmailAndPassword(auth,String(values?.email||'').trim(),String(values?.password||'')),
  link:async(p,values)=>p==='password'?sdk.linkWithCredential(auth.currentUser,emailCredential(values)):oauth(p,true),
  verify:()=>sdk.sendEmailVerification(auth.currentUser),
  refresh:async()=>{if(auth.currentUser){await sdk.reload(auth.currentUser);await auth.currentUser.getIdToken(true)}},
  reset:email=>sdk.sendPasswordResetEmail(auth,String(email||'').trim()),
  signOut:()=>sdk.signOut(auth),
  getIdToken:force=>auth.currentUser.getIdToken(force),
  async remove(values){
   const user=auth.currentUser,providers=user.providerData.map(p=>p.providerId);
   // Never delete Auth first and orphan a wallet or cloud save: the server removes
   // data and then the Auth user. Apple-linked accounts revoke their Apple token
   // first (TN3194) with the authorization code from a fresh Apple sign-in.
   if(typeof config.deletePlayer!=='function')throw Object.assign(Error('Account deletion requires the secure player service'),{code:'account/deletion-service-required'});
   const apple=providers.includes('apple.com');let code=null;
   if(apple){if(native){const keep={};await sdk.reauthenticateWithCredential(user,await credential('apple.com',keep));code=keep.authorizationCode}
    else{const result=await sdk.reauthenticateWithPopup(user,provider('apple.com'));code=sdk.OAuthProvider.credentialFromResult(result)?.accessToken||null}
    if(typeof code!=='string'||!code)throw Object.assign(Error('Apple did not return a revocation code'),{code:'account/apple-revoke-unavailable'});
    await sdk.revokeAccessToken(auth,code)}
   else if(providers.includes('password'))await sdk.reauthenticateWithCredential(user,emailCredential({email:user.email,password:values?.password}));
   else if(native)await sdk.reauthenticateWithCredential(user,await credential('google.com'));
   else await sdk.reauthenticateWithPopup(user,provider('google.com'));
   await config.deletePlayer(await user.getIdToken(true));
   try{await sdk.signOut(auth)}catch{}
  }
 };
}
if(typeof module!=='undefined'&&module.exports)module.exports={createFirebaseAccountAdapter};else scope.createSkylineFirebaseAccountAdapter=createFirebaseAccountAdapter;
})(typeof window!=='undefined'?window:globalThis);
