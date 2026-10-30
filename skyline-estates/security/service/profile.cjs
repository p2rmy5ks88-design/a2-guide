'use strict';
// Unified player profile: pure validation and reducers. The SAME account document
// that holds purchased coins (firestore-wallet.cjs) holds earned coins, XP and
// collection progress, so there is exactly one balance per account.
// No function here trusts a client-supplied balance, owner or purchase.
const {createHash}=require('node:crypto');
const hash=x=>createHash('sha256').update(x).digest('hex');
const fail=code=>{throw Object.assign(new Error(code),{code})};
const POLICY=Object.freeze({dayCoins:50000,dayXp:150000,migrateCoins:1000000,migrateXp:5000000,maxItems:2000,maxFlags:5000,maxMaxKeys:2000,maxValue:1e9,reasons:20});
// Owned collection kinds. Unknown kinds are rejected rather than stored.
const KINDS=Object.freeze(['tok','fin','dice','surr','country','city','frame','char','roof']);
// Monotonic values: field -> key. Merged by maximum, never summed.
const MAX_FIELDS=Object.freeze(['tokLv','tokWins','tokXp','tokGames','stat','league','sxp','contract']);
// One-way flags (claimed rewards). Merged by union, never removed.
const FLAG_NS=Object.freeze(['sf','sp','pass','ach','cach','champ','camp']);
const EQ_SLOTS=Object.freeze(['tok','fin','dice','surr','frame','char','roof']);
const ID=/^[a-z0-9_-]{1,40}$/i,KEY=/^[a-z0-9_.:-]{1,64}$/i,REQ=/^[A-Za-z0-9_-]{16,64}$/;
// Promo table is server-owned (hashes of 'skyline:'+normalized code). Plaintext never stored.
const PROMOS=Object.freeze({
 '3eb64b641a84925181c72446845c5e300a9e2d75cb27bd64276c2b74fe286ba5':{coins:20000,xp:0,until:Date.UTC(2026,9,27,20,13)},
 'a1e5403bee438785a3c349ed76b096e3bf93bcbab1f76bc93ad4b7c73872a80d':{coins:500000,xp:100000,until:Date.UTC(2026,10,4,11,15)}
});
const promoHash=code=>hash('skyline:'+String(code||'').toUpperCase().replace(/[^A-Z0-9]/g,''));
const utcDay=at=>new Date(at).toISOString().slice(0,10);
const int=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const SAFE=k=>!['__proto__','prototype','constructor'].includes(k);

// ---------- validation of client input (shape only; meaning is decided by the reducer)
function validateChanges(c){
 if(!plain(c))fail('invalid-profile-change');
 for(const k of Object.keys(c))if(!['coins','xp','reasons','promos','items','max','flags','eq','eqRev'].includes(k))fail('invalid-profile-change');
 const out={coins:0,xp:0,reasons:[],promos:[],items:{},max:{},flags:{},eq:null,eqRev:0};
 if(c.coins!=null){if(!int(c.coins,-POLICY.maxValue,POLICY.maxValue))fail('invalid-profile-change');out.coins=c.coins}
 if(c.xp!=null){if(!int(c.xp,0,POLICY.maxValue))fail('invalid-profile-change');out.xp=c.xp}
 if(c.reasons!=null){if(!Array.isArray(c.reasons)||c.reasons.length>POLICY.reasons||c.reasons.some(r=>typeof r!=='string'||r.length>60))fail('invalid-profile-change');out.reasons=c.reasons.map(r=>r.replace(/[^\w .:'’!-]/g,'').slice(0,60))}
 if(c.promos!=null){if(!Array.isArray(c.promos)||c.promos.length>5||c.promos.some(p=>typeof p!=='string'||p.length>40))fail('invalid-profile-change');out.promos=c.promos}
 let n=0;
 if(c.items!=null){if(!plain(c.items))fail('invalid-profile-change');for(const [kind,ids] of Object.entries(c.items)){if(!KINDS.includes(kind)||!Array.isArray(ids)||ids.some(id=>typeof id!=='string'||!ID.test(id)||!SAFE(id)))fail('invalid-profile-item');n+=ids.length;out.items[kind]=[...new Set(ids)]}}
 if(c.max!=null){if(!plain(c.max))fail('invalid-profile-change');for(const [f,vals] of Object.entries(c.max)){if(!MAX_FIELDS.includes(f)||!plain(vals))fail('invalid-profile-max');out.max[f]={};for(const [k,v] of Object.entries(vals)){if(!KEY.test(k)||!SAFE(k)||!int(v,0,POLICY.maxValue))fail('invalid-profile-max');out.max[f][k]=v;n++}}}
 if(c.flags!=null){if(!plain(c.flags))fail('invalid-profile-change');for(const [ns,keys] of Object.entries(c.flags)){if(!FLAG_NS.includes(ns)||!Array.isArray(keys)||keys.some(k=>typeof k!=='string'||!KEY.test(k)||!SAFE(k)))fail('invalid-profile-flag');n+=keys.length;out.flags[ns]=[...new Set(keys)]}}
 if(n>4000)fail('profile-change-too-large');
 if(c.eq!=null){if(!plain(c.eq))fail('invalid-profile-change');out.eq={};for(const [slot,id] of Object.entries(c.eq)){if(!EQ_SLOTS.includes(slot)||!(id===null||typeof id==='string'&&ID.test(id)))fail('invalid-profile-equip');out.eq[slot]=id}
  if(!int(c.eqRev,1,Number.MAX_SAFE_INTEGER))fail('invalid-profile-equip');out.eqRev=c.eqRev}
 return out;
}
function validateRequest(input,{migration=false}={}){
 if(!plain(input))fail('invalid-profile-request');
 const allowed=migration?['requestId','mode','snapshot']:['requestId','changes'];
 if(Object.keys(input).some(k=>!allowed.includes(k))||!REQ.test(input.requestId||''))fail('invalid-profile-request');
 if(migration){if(!['import','cloud-only'].includes(input.mode))fail('invalid-profile-request');return{requestId:input.requestId,mode:input.mode,snapshot:input.mode==='import'?validateChanges(input.snapshot):validateChanges({})}}
 return{requestId:input.requestId,changes:validateChanges(input.changes)};
}
const digest=x=>hash(JSON.stringify(x));

// ---------- reducers
function fresh(uid,now){return{uid,coins:0,debt:0,xp:0,inv:{},max:{},flags:{},eq:{},eqRev:0,rev:0,createdAt:now}}
function count(obj){let n=0;for(const v of Object.values(obj||{}))n+=Object.keys(v||{}).length;return n}
function mergeSets(account,c,note){
 account.inv||={};account.max||={};account.flags||={};
 for(const [kind,ids] of Object.entries(c.items)){const bag=account.inv[kind]||={};for(const id of ids){if(bag[id])continue;if(count(account.inv)>=POLICY.maxItems){note.push('item-limit');break}bag[id]=true}}
 for(const [f,vals] of Object.entries(c.max)){const bag=account.max[f]||={};for(const [k,v] of Object.entries(vals)){if(!(k in bag)&&count(account.max)>=POLICY.maxMaxKeys){note.push('progress-limit');break}if(!(bag[k]>=v))bag[k]=v}}
 for(const [ns,keys] of Object.entries(c.flags)){const bag=account.flags[ns]||={};for(const k of keys){if(bag[k])continue;if(count(account.flags)>=POLICY.maxFlags){note.push('flag-limit');break}bag[k]=true}}
 if(c.eq&&c.eqRev>(account.eqRev||0)){account.eq={...(account.eq||{}),...c.eq};account.eqRev=c.eqRev}
}
function sane(account){
 account.debt||=0;account.xp||=0;
 if(!int(account.coins,0,Number.MAX_SAFE_INTEGER)||!int(account.debt,0,Number.MAX_SAFE_INTEGER)||account.coins&&account.debt||!int(account.xp,0,Number.MAX_SAFE_INTEGER))fail('wallet-balance-conflict');
}
// Earned/spent coins and XP reported by a device, bounded by server-day caps.
function applyChanges(account,c,now,ledger,promos=PROMOS){
 const note=[],day=utcDay(now);sane(account);
 if(account.earn?.day!==day)account.earn={day,coins:0,xp:0};
 let promoCoins=0,promoXp=0;account.promos||={};
 for(const code of c.promos){const h=promoHash(code),p=Object.hasOwn(promos,h)?promos[h]:null;if(!p){note.push('promo-invalid');continue}if(account.promos[h]){note.push('promo-used');continue}if(now>=p.until){note.push('promo-expired');continue}account.promos[h]=now;promoCoins+=p.coins;promoXp+=p.xp}
 let coins=0,xp=0;
 if(c.coins>0){const promo=Math.min(c.coins,promoCoins),earned=Math.min(c.coins-promo,Math.max(0,POLICY.dayCoins-account.earn.coins));account.earn.coins+=earned;coins=promo+earned;if(coins<c.coins)note.push('daily-coin-limit')}
 else if(c.coins<0){if(account.debt>0){note.push('refund-deficit')}else{coins=-Math.min(-c.coins,account.coins);if(-coins<-c.coins)note.push('insufficient-coins')}}
 // A promo grant also counts when the device did not report a positive delta (rare race); never more than the promo.
 if(c.xp>0){const promo=Math.min(c.xp,promoXp),earned=Math.min(c.xp-promo,Math.max(0,POLICY.dayXp-account.earn.xp));account.earn.xp+=earned;xp=promo+earned;if(xp<c.xp)note.push('daily-xp-limit')}
 // Earned coins settle refund debt first (same rule as the wallet reducer).
 {const net=account.coins-account.debt+coins;account.coins=Math.max(0,net);account.debt=Math.max(0,-net)}account.xp+=xp;
 mergeSets(account,c,note);
 if(coins||xp)ledger.push({type:coins<0?'spend':'earn',coins,xp,balance:account.coins,debt:account.debt,reasons:c.reasons.slice(0,5),at:now});
 return{coins,xp,notes:[...new Set(note)]};
}
function applyMigration(account,cmd,now,ledger){
 const note=[];sane(account);
 if(account.migration){
  // Later device: never add coins. Items/flags union; XP and maxima take the higher value.
  if(cmd.mode==='import'){const c=cmd.snapshot;if(c.xp>account.xp){note.push('xp-raised')}account.xp=Math.max(account.xp,Math.min(c.xp,POLICY.migrateXp));mergeSets(account,{...c,eq:null},note);if(c.coins>0)note.push('device-coins-kept-locally')}
  account.migration.devices=(account.migration.devices||1)+1;
  return{mode:'merge',coins:0,notes:note};
 }
 let coins=0,xp=0;
 if(cmd.mode==='import'){const c=cmd.snapshot;coins=Math.max(0,Math.min(c.coins,POLICY.migrateCoins));xp=Math.min(c.xp,POLICY.migrateXp);if(c.coins>coins)note.push('device-coins-above-limit-kept-locally');
  // Refund debt from purchases made before migration is settled first.
  const net=account.coins-account.debt+coins;account.coins=Math.max(0,net);account.debt=Math.max(0,-net);account.xp=Math.max(account.xp,xp);mergeSets(account,c,note)}
 account.migration={mode:cmd.mode,at:now,coins,xp,devices:1};
 ledger.push({type:'migration',coins,xp,balance:account.coins,debt:account.debt,at:now});
 return{mode:cmd.mode==='import'?'first':'cloud-only',coins,notes:note};
}
function publicProfile(account){
 const a=account||{};
 return{coins:a.coins||0,debt:a.debt||0,xp:a.xp||0,inv:a.inv||{},max:a.max||{},flags:a.flags||{},eq:a.eq||{},eqRev:a.eqRev||0,rev:a.rev||0,
  migrated:!!a.migration,migration:a.migration?{mode:a.migration.mode,at:a.migration.at}:null,
  today:{day:a.earn?.day||null,coins:a.earn?.coins||0,xp:a.earn?.xp||0,coinLimit:POLICY.dayCoins,xpLimit:POLICY.dayXp}};
}
module.exports={POLICY,KINDS,MAX_FIELDS,FLAG_NS,EQ_SLOTS,PROMOS,promoHash,utcDay,validateChanges,validateRequest,digest,fresh,applyChanges,applyMigration,publicProfile,hash};
