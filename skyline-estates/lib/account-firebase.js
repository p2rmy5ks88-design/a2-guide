/* Firebase SDK adapter. SDK modules are loaded only when the player opens accounts. */
(function(scope){
'use strict';
async function createFirebaseAccountAdapter({appSdk,authSdk:sdk,config,native=false,nativeCredential=null,nativeProviders=[],emulator=null,appName='skyline-player-account'}){
 const app=appSdk.getApps().find(a=>a.name===appName)||appSdk.initializeApp(config,appName);
 const auth=sdk.getAuth(app);
 if(emulator){const u=new URL(emulator);if(config.projectId!=='demo-skyline-phase1'||u.hostname!=='127.0.0.1'||u.protocol!=='http:')throw Error('Loopback demo Auth emulator only');sdk.connectAuthEmulator(auth,emulator,{disableWarnings:true})}
 await sdk.setPersistence(auth,sdk.browserLocalPersistence);await auth.authStateReady();
 const provider=p=>{const value=p==='google.com'?new sdk.GoogleAuthProvider():new sdk.OAuthProvider('apple.com');if(p==='apple.com'){value.addScope('email');value.addScope('name')}return value};
 const emailCredential=values=>sdk.EmailAuthProvider.credential(String(values?.email||'').trim(),String(values?.password||''));
 async function credential(p){
  if(!nativeCredential||!nativeProviders.includes(p))throw Object.assign(Error('Native sign-in setup is not complete'),{code:'account/native-setup-required'});
  const r=await nativeCredential(p),idToken=r?.credential?.idToken||r?.idToken;
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
   // Deletion remains blocked until server data removal and native Apple revocation
   // are configured. Never delete Auth first and orphan a wallet or cloud save.
   if(typeof config.deletePlayer!=='function')throw Object.assign(Error('Account deletion requires the secure player service'),{code:'account/deletion-service-required'});
   if(providers.includes('password'))await sdk.reauthenticateWithCredential(user,emailCredential({email:user.email,password:values?.password}));
   else if(native)await sdk.reauthenticateWithCredential(user,await credential(providers.includes('apple.com')?'apple.com':'google.com'));
   else await sdk.reauthenticateWithPopup(user,provider(providers.includes('apple.com')?'apple.com':'google.com'));
   await config.deletePlayer(await user.getIdToken(true));
  }
 };
}
if(typeof module!=='undefined'&&module.exports)module.exports={createFirebaseAccountAdapter};else scope.createSkylineFirebaseAccountAdapter=createFirebaseAccountAdapter;
})(typeof window!=='undefined'?window:globalThis);
