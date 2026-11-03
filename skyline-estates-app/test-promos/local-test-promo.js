/* Included only by an explicitly requested internal TestFlight build. */
(function(){
 'use strict';
 if(window.SKYLINE_LOCAL_TEST_BUILD!==true||!window.Capacitor?.isNativePlatform?.()||window.Capacitor.getPlatform()!=='ios')return;
 const HASH='def2f0d8c7f0e0ce72c7d943aad3282794bf43299b312dffff616b702d94fa5b',UNTIL=1794156247000;
 // A test save is treated as belonging to another owner, including after the
 // existing restore flow removes cloudOwner. Existing migration rules then
 // allow cloud-only switching, never importing these coins, XP or purchases.
 const engine=window.SkylineCloudEngine;
 if(engine)window.SkylineCloudEngine={...engine,createCloudProfile(options){
   const adapter=options.adapter;
   return engine.createCloudProfile({...options,adapter:{...adapter,owner:()=>adapter.owner()||(PREF.localTestReward?'local-test-only':null)}});
 }};
 window.SkylineLocalTestRewards={install(){
   const previous=redeemPromo;
   redeemPromo=async function(raw){
     const normalized=String(raw||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
     if(sha256hex('skyline:'+normalized)!==HASH)return previous(raw);
     const grant=async()=>{
       let player;try{player=await window.SkylineAccounts?.player?.()}catch{return{ok:false,msg:'Could not confirm sign-out. Open Account & recovery, sign out, then try again.'}};
       let fresh;try{const saved=localStorage.getItem(PKEY);fresh=saved?JSON.parse(saved):JSON.parse(JSON.stringify(PREF));if(!fresh||typeof fresh!=='object'||Array.isArray(fresh))throw Error('profile')}catch{return{ok:false,msg:'Your saved profile could not be read.'}};
       if(fresh.promos?.[HASH])return{ok:false,msg:'This device has already used this code.'};
       if(player||fresh.cloudOwner||PREF.cloudOwner)return{ok:false,msg:'Sign out first. This reward is for your local phone save only.'};
       if(Date.now()>=UNTIL)return{ok:false,msg:'This code has expired.'};
       const coins=fresh.coins??0,xp=fresh.xp??0;
       if(!Number.isSafeInteger(coins)||coins<0||!Number.isSafeInteger(xp)||xp<0||!Number.isSafeInteger(coins+1000000)||!Number.isSafeInteger(xp+500000))return{ok:false,msg:'Your saved balances need checking. No reward was added.'};
       const next={...fresh,coins:coins+1000000,xp:xp+500000,localTestReward:HASH,cloudOwner:'local-test-only:'+HASH,promos:{...fresh.promos,[HASH]:Date.now()}};
       try{localStorage.setItem(PKEY,JSON.stringify(next))}catch{return{ok:false,msg:'Reward not saved. Check device storage and try again.'}};
       Object.assign(PREF,next);refreshCoins();xpFloat(500000);sfx('win');toast('Local testing reward added. This test save stays on this phone.');
       return{ok:true,msg:'Added 1,000,000 coins and 500,000 profile XP to this phone only.'};
     };
     return navigator.locks?.request?navigator.locks.request('skyline-collection-upgrade',grant):grant();
   };
 }};
})();
