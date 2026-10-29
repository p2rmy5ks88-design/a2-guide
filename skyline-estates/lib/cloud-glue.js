/* Connects the game's local save (PREF) to the unified cloud profile and the
   App Store. Does nothing unless window.SKYLINE_CLOUD.enabled is true.
   Mapping rules match security/UNIFIED-PROFILE-DESIGN.md. */
(function(){
'use strict';
const CFG=window.SKYLINE_CLOUD||{},Engine=window.SkylineCloudEngine;
const KINDS=['tok','fin','dice','surr','country','city','frame','char','roof'],ID=/^[a-z0-9_-]{1,40}$/i,KEY=/^[a-z0-9_.:-]{1,64}$/i;
const STAT_KEYS=['wins','games','deals','quiz','onlineGames','onlineWins','streakBest','auctions','cards'];
const n=v=>Number.isSafeInteger(v)&&v>=0?v:0,keys=o=>Object.keys(o||{}).filter(k=>KEY.test(k));
function bag(src,valid=KEY){const o={};for(const [k,v] of Object.entries(src||{}))if(valid.test(k)&&Number.isSafeInteger(v)&&v>=0)o[k]=v;return o}
// ---------- PREF <-> normalized cloud state
function extract(){
 const P=PREF,S=P.season||null,items={},max={},flags={},eq={};
 for(const k of KINDS)items[k]=Object.keys(P.inv?.[k]||{}).filter(id=>ID.test(id));
 max.tokLv=bag(P.tokLv,ID);max.tokWins=bag(P.tokWins,ID);
 const tm=P.tokenMastery?.tokens||{};max.tokXp={};max.tokGames={};for(const [t,r] of Object.entries(tm))if(ID.test(t)){if(n(r?.xp))max.tokXp[t]=n(r.xp);if(n(r?.games))max.tokGames[t]=n(r.games)}
 max.stat={};for(const k of STAT_KEYS)if(n(P.stats?.[k]))max.stat[k]=n(P.stats[k]);
 max.league={best:n(P.leagueBest)};
 if(S&&Number.isSafeInteger(S.n)){max.sxp={[String(S.n)]:n(S.sxp)};flags.sf=keys(S.cf).map(t=>S.n+'.'+t);flags.sp=keys(S.cp).map(t=>S.n+'.'+t);flags.pass=S.prem?[String(S.n)]:[]}
 flags.ach=keys(P.ach);flags.champ=keys(P.champ);flags.cach=[];for(const [c,b] of Object.entries(P.cach||{}))if(ID.test(c))for(const id of keys(b))flags.cach.push(c+'.'+id);
 flags.camp=keys(P.spot?.flags); // City Spotlight receipts and claims: a union never double counts
 eq.tok=ID.test(P.tok||'')?P.tok:null;for(const s of ['fin','dice','surr','frame','char','roof'])eq[s]=ID.test(P.eq?.[s]||'')?P.eq[s]:null;
 return{coins:Math.max(0,Math.round(P.coins||0)),xp:Math.max(0,Math.round(P.xp||0)),items,max,flags,eq};
}
function apply(t,{debt=0}={}){
 const P=PREF,now=Date.now();
 P.coins=t.coins;P.xp=t.xp;P.cloudDebt=debt||0;
 for(const k of KINDS){const old=P.inv[k]||{};P.inv[k]=Object.fromEntries((t.items[k]||[]).map(id=>[id,old[id]||now]))}
 const raise=(obj,vals)=>{for(const [k,v] of Object.entries(vals||{}))if(!((obj[k]||0)>=v))obj[k]=v};
 P.tokLv=P.tokLv||{};raise(P.tokLv,t.max.tokLv);P.tokWins=P.tokWins||{};raise(P.tokWins,t.max.tokWins);
 if(t.max.tokXp||t.max.tokGames){P.tokenMastery=P.tokenMastery&&P.tokenMastery.version===1?P.tokenMastery:{version:1,tokens:{},receipts:{}};P.tokenMastery.tokens||={};
  for(const [tk,v] of Object.entries(t.max.tokXp||{})){const r=P.tokenMastery.tokens[tk]||={};if(!((r.xp||0)>=v))r.xp=v}
  for(const [tk,v] of Object.entries(t.max.tokGames||{})){const r=P.tokenMastery.tokens[tk]||={};if(!((r.games||0)>=v))r.games=v}}
 P.stats=P.stats||{};raise(P.stats,t.max.stat);if((t.max.league?.best||0)>(P.leagueBest||0))P.leagueBest=t.max.league.best;
 const S=P.season;if(S&&Number.isSafeInteger(S.n)){const sn=String(S.n);if((t.max.sxp?.[sn]||0)>(S.sxp||0))S.sxp=t.max.sxp[sn];S.cf=S.cf||{};S.cp=S.cp||{};
  for(const f of t.flags.sf||[]){const [a,b]=f.split('.');if(a===sn&&!S.cf[b])S.cf[b]=now}for(const f of t.flags.sp||[]){const [a,b]=f.split('.');if(a===sn&&!S.cp[b])S.cp[b]=now}if((t.flags.pass||[]).includes(sn))S.prem=true}
 P.ach=P.ach||{};for(const id of t.flags.ach||[])P.ach[id]=P.ach[id]||now;P.champ=P.champ||{};for(const id of t.flags.champ||[])P.champ[id]=P.champ[id]||now;
 P.cach=P.cach||{};for(const f of t.flags.cach||[]){const i=f.indexOf('.'),c=f.slice(0,i),id=f.slice(i+1);(P.cach[c]=P.cach[c]||{})[id]=P.cach[c][id]||now}
 P.spot=P.spot&&typeof P.spot==='object'?P.spot:{};P.spot.flags=P.spot.flags||{};for(const id of t.flags.camp||[])P.spot.flags[id]=P.spot.flags[id]||now;
 if('tok' in t.eq&&t.eq.tok)P.tok=t.eq.tok;P.eq=P.eq||{};for(const s of ['fin','dice','surr','frame','char','roof'])if(s in t.eq)P.eq[s]=t.eq[s];
 rawSave();try{refreshCoins();railProfile();if(typeof applyDiceSkin==='function')applyDiceSkin()}catch(e){}
}
const BACKUP='skylinePrefs.backup.';
function backups(){const out=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(BACKUP))try{const v=JSON.parse(localStorage.getItem(k));out.push({key:k,at:v.at,reason:v.reason,coins:v.prefs?.coins||0,xp:v.prefs?.xp||0})}catch(e){}}return out.sort((a,b)=>b.at-a.at)}
function backup(reason){try{const at=Date.now();localStorage.setItem(BACKUP+at,JSON.stringify({at,reason,prefs:PREF}));for(const old of backups().slice(3))localStorage.removeItem(old.key)}catch(e){toast('Could not save a device backup. Check device storage.');throw Object.assign(Error('storage-unavailable'),{code:'storage-unavailable'})}}
let origSave=null;const rawSave=()=>(origSave||savePref)();
// ---------- HTTPS client (errors carry {status, code}; no secrets)
function http(){const base=String(CFG.service||'').replace(/\/$/,'');return{async request(method,path,body,token){
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),15000);
 try{const r=await fetch(base+path,{method,signal:ctl.signal,headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  const value=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(Error(value.error||'unavailable'),{status:r.status,code:value.error||'unavailable'});return value}
 finally{clearTimeout(timer)}}}}
// ---------- player prompts (game modal; the account dialog is closed first so it can't cover them)
const nf=v=>Math.round(v||0).toLocaleString('en-US');
async function ask(kind,profile){
 try{window.SkylineAccounts?.close?.()}catch(e){}
 const here=extract();
 if(kind==='first')return modal({html:`<div class="mh">Save your progress to your account?</div><div class="mtxt">Your coins (up to 1,000,000), XP and collection on this device move to your account, so they stay safe and follow you to your other devices. A full copy of this device's save is kept on this device.</div>`,btns:[{k:'import',label:'Move my progress',primary:true},{k:null,label:'Not now'}]});
 if(kind==='merge')return modal({html:`<div class="mh">Your account already has progress</div><div class="mtxt">Account: <b>${nf(profile.coins)}</b> coins, <b>${nf(profile.xp)}</b> XP.<br>This device: <b>${nf(here.coins)}</b> coins, <b>${nf(here.xp)}</b> XP.<br><br>You can add this device's collection to your account; the higher XP and token levels are kept. This device's coins are <b>not</b> added, because a balance can only live in one place. They stay in a saved backup on this device.</div>`,btns:[{k:'import',label:"Add this device's collection",primary:true},{k:'cloud-only',label:'Use my account progress only'},{k:null,label:'Not now'}]});
 return modal({html:`<div class="mh">This device is linked to another account</div><div class="mtxt">This device's progress belongs to the account you used before, so it can't be added to this one. Use this account's progress here? The current save is kept as a backup on this device, and your other account is not changed.</div>`,btns:[{k:'cloud-only',label:'Use this account',primary:true},{k:null,label:'Not now'}]});
}
const NOTES={'daily-coin-limit':'Daily cloud earning limit reached. Extra coins earned today were not added to your account.','daily-xp-limit':'Daily cloud XP limit reached.','promo-used':'That promo code was already used on your account.','promo-expired':'That promo code has expired.','promo-invalid':'That promo code could not be confirmed by the server.','insufficient-coins':'Your account balance was lower than this device showed. Your balance has been corrected.','refund-deficit':'A refunded purchase left your account below zero. New coins pay that back first.','device-coins-kept-locally':"This device's coins stay in its backup.",'device-coins-above-limit-kept-locally':'Coins above 1,000,000 stay in this device’s backup.','item-limit':'Your collection is full.'};
function notify(kind,detail){
 if(kind==='note'&&NOTES[detail])toast(NOTES[detail]);
 else if(kind==='migrated')toast(detail.mode==='first'?'Your progress is now saved to your account.':'Your account progress is now on this device.');
 else if(kind==='account-removed')toast('This account was removed. Your progress stays on this device.');
 else if(kind==='dropped')toast('One change could not be saved to your account.');
 else if(kind==='error'&&detail==='persistent-account-required')toast('Verify your email address to use cloud saves.');
 else if((kind==='error'||kind==='dropped')&&detail==='test-account-retired')toast('This is a closed test account. Its test coins can’t be used. Sign in with your own account.');
 status.last=kind+(detail?':'+(typeof detail==='string'?detail:''):'');
}
const status={last:''};
// ---------- start
if(!CFG.enabled||!Engine||typeof PREF==='undefined')return;
const engine=Engine.createCloudProfile({storage:localStorage,http:http(),account:()=>window.SkylineAccounts?.player?.()||null,
 adapter:{extract,apply,backup,owner:()=>PREF.cloudOwner||null,setOwner:v=>{PREF.cloudOwner=v||undefined;rawSave()}},ask,notify});
let tick=null;const later=()=>{clearTimeout(tick);tick=setTimeout(()=>engine.capture(),0)};
origSave=savePref;savePref=function(){origSave();later()};
const origAdd=addCoins;addCoins=function(n,why){if(n&&why)engine.reason(String(why));return origAdd(n,why)};
if(typeof redeemPromo==='function'){const orig=redeemPromo;redeemPromo=async function(raw){const r=await orig(raw);if(r?.ok)engine.promo(String(raw||'').toUpperCase().replace(/[^A-Z0-9]/g,''));return r}}
const run=o=>engine.sync(o).then(r=>{status.state=r.state;return r});
addEventListener('online',()=>run({refresh:true}));document.addEventListener('visibilitychange',()=>{if(!document.hidden)run({refresh:true})});
setInterval(()=>{if(!document.hidden)run()},30000);
window.SkylineAccounts?.subscribe?.(()=>setTimeout(()=>run({refresh:true}),300)).catch?.(()=>{});
// First sync (and any migration question) waits for the loading screen to finish.
const firstRun=()=>setTimeout(()=>run({refresh:true}),600);if(document.getElementById('boot'))document.addEventListener('sk-booted',firstRun,{once:true});else firstRun();
// ---------- App Store coin packs (iOS only; needs purchases switch, sign-in and the deployed service)
const cap=window.Capacitor,bridge=cap?.isNativePlatform?.()&&cap.getPlatform?.()==='ios'&&cap.isPluginAvailable?.('SkylineStoreKit')?cap.Plugins.SkylineStoreKit:null;
let store=null,prices=new Map();
if(CFG.purchases===true&&bridge&&window.createSkylineStoreKitClient){
 const api=http();
 store=window.createSkylineStoreKitClient({bridge,enabled:()=>CFG.enabled===true&&CFG.purchases===true,account:()=>window.SkylineAccounts.player(),
  wallet:{purchase:(t,proof)=>api.request('POST','/v1/store/purchase',{proof},t),delivery:(t,k)=>api.request('GET','/v1/store/delivery/'+k,null,t),history:t=>api.request('GET','/v1/wallet/history',null,t),binding:t=>api.request('POST','/v1/store/binding',{},t)},
  onWallet:()=>run({refresh:true}),onError:e=>toast(STORE_ERR[e.code]||STORE_ERR.default)});
 const load=()=>store.products().then(r=>{prices=new Map(r.products.map(p=>[p.id,p.displayPrice]));return r}).catch(()=>null);
 setTimeout(async()=>{if(await window.SkylineAccounts.player().catch(()=>null)){await load();store.recover().catch(()=>{})}},4000);
 window.SkylineStoreLoad=load;
}
const STORE_ERR={'store/sign-in-required':'Sign in to your Skyline account before buying coins.','store/payments-restricted':'Purchases are turned off on this device (Screen Time or device restrictions).','store/products-unavailable':'The App Store is not reachable right now. Try again when connected.','store/product-unavailable':'This coin pack is not available right now.','store/busy':'A purchase is already in progress.',default:'The purchase could not be completed yet. If you were charged, your coins are delivered automatically the next time the app connects.'};
window.SkylineCloud={
 status:()=>({...engine.status(),last:status.last,state:status.state}),sync:()=>run({refresh:true}),
 purchasesReady:()=>!!store,price:id=>prices.get(id)||null,
 async buyPack(productId){
  if(!store)return false;
  if(!await window.SkylineAccounts.player().catch(()=>null)){toast(STORE_ERR['store/sign-in-required']);window.SkylineAccounts.open();return true}
  if(!prices.size&&!(await window.SkylineStoreLoad())){toast(STORE_ERR['store/products-unavailable']);return true}
  try{const r=await store.buy(productId);if(r?.state==='pending')toast('Your purchase is waiting for approval. Coins arrive automatically once it is approved.');else if(r?.state==='delivered')toast('Coins added to your account.')}catch(e){toast(STORE_ERR[e?.code]||STORE_ERR.default)}
  return true;
 },
 async deletePlayer(token){const api=http();const r=await api.request('DELETE','/v1/account',null,token);const owner=PREF.cloudOwner;if(owner)engine.detach(owner);try{await store?.stop()}catch(e){}return r},
 accountSection(body,user,{el,button,act}){
  const s=engine.status(),box=el('div',null,{className:'sky-cloud'});
  box.append(el('h3','Cloud save'));
  if(s.owner===user.uid&&s.migrated){box.append(el('p',s.pending?`${s.pending} change${s.pending===1?'':'s'} waiting to sync. Your progress is safe on this device meanwhile.`:'Your coins, XP and collection are saved to this account.'));if(s.profile?.debt)box.append(el('p',`A refunded purchase left ${nf(s.profile.debt)} coins to pay back. New coins pay this first.`));button(box,'Sync now',()=>act(()=>run({refresh:true}),'Synced.'))}
  else{box.append(el('p','This device is not saving to your account yet.'));button(box,'Set up cloud save',()=>act(async()=>{engine.forgetDecline(user.uid);await run({refresh:true})},'Cloud save updated.'))}
  const list=backups();if(list.length){box.append(el('p','Device backups (kept on this device only):'));for(const b of list){const row=el('div',null,{className:'sky-account-actions'});row.append(el('span',`${new Date(b.at).toLocaleString()} · ${nf(b.coins)} coins`));button(row,'Restore',()=>restore(b.key));box.append(row)}}
  body.append(box);
 }
};
async function restore(key){
 const ok=await modal({html:`<div class="mh">Restore this backup?</div><div class="mtxt">This device goes back to the saved copy and stops saving to your account until you set up cloud save again. Your account itself is not changed.</div>`,btns:[{k:true,label:'Restore backup',primary:true,danger:true},{k:false,label:'Cancel'}]});
 if(!ok)return;try{const v=JSON.parse(localStorage.getItem(key));const prefs={...v.prefs};delete prefs.cloudOwner;localStorage.setItem(PKEY,JSON.stringify(prefs));location.reload()}catch(e){toast('That backup could not be restored.')}
}
})();
