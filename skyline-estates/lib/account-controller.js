/* Account operations never read or overwrite device-owned gameplay progress. */
(function(scope){
'use strict';
function createAccountController(adapter){
 if(!adapter||typeof adapter.current!=='function')throw Error('Account adapter required');
 let busy=false;const listeners=new Set();
 function current(){const u=adapter.current();return u?{uid:u.uid,email:u.email||'',verified:!!u.emailVerified,anonymous:!!u.isAnonymous,providers:[...new Set((u.providerData||[]).map(p=>p.providerId))]}:null}
 function emit(){for(const listener of listeners)listener({user:current(),busy})}
 const error=code=>Object.assign(new Error(code),{code});
 function run(action){if(busy)return Promise.reject(error('account/busy'));busy=true;emit();return Promise.resolve().then(action).finally(()=>{busy=false;emit()})}
 const requireUser=()=>{const u=current();if(!u)throw error('account/sign-in-required');return u};
 const requireGuest=()=>{if(current()&&!current().anonymous)throw error('account/sign-out-first')};
 const provider=p=>{if(!['apple.com','google.com','password'].includes(p))throw error('account/unsupported-provider');return p};
 return {
  current,available:p=>adapter.available?.(p)!==false,
  subscribe(fn){listeners.add(fn);fn({user:current(),busy});const off=adapter.subscribe?.(()=>emit());return()=>{listeners.delete(fn);off?.()}},
  signIn(p,credentials){return run(async()=>{provider(p);requireGuest();return adapter.signIn(p,credentials)})},
  register(credentials){return run(async()=>{requireGuest();if(current()?.anonymous)return adapter.link('password',credentials);return adapter.register(credentials)})},
  link(p,credentials){return run(async()=>{provider(p);const uid=requireUser().uid;const result=await adapter.link(p,credentials);if(current()?.uid!==uid){await adapter.signOut();throw error('account/identity-changed')};return result})},
  verify(){return run(()=>{requireUser();return adapter.verify()})},
  refresh(){return run(()=>adapter.refresh())},
  reset(email){return run(()=>adapter.reset(email))},
  signOut(){return run(()=>adapter.signOut())},
  remove(credentials){return run(()=>{requireUser();return adapter.remove(credentials)})},
  async getIdToken(force=false){requireUser();return adapter.getIdToken(force)}
 };
}
if(typeof module!=='undefined'&&module.exports)module.exports={createAccountController};else scope.createSkylineAccountController=createAccountController;
})(typeof window!=='undefined'?window:globalThis);
