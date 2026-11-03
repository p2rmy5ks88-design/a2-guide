/* Saved, earned Skyline Cash (SC) is the only currency for permanent Collection upgrades:
   token rarity levels and property (building) rarity. Coins stay for the Shop, unlocks and
   cosmetics; live match cash is never touched. Wins remain an eligibility requirement only.

   SC prices keep the previous per-win pace. A win earns 400 Coins or SC 60M (completion 20M +
   win 40M), so each former Coin price is multiplied by 0.15 and rounded to a round SC amount.
   The number of wins needed to afford each step is therefore unchanged. */
(()=>{'use strict';
 const ledger=SkylineSCWallet.create(localStorage);
 const PRICE=Object.freeze({
  token:Object.freeze([null,0,45,135,360,900,1800]),   // was 300/900/2400/6000/12000 Coins
  estate:Object.freeze([null,0,30,90,240,600])         // was 200/600/1600/4000 Coins
 });
 // Earlier TestFlight candidates recorded building receipts at 1 Coin = SC 1M. Honour them.
 const LEGACY_ESTATE=Object.freeze([null,0,200,600,1600,4000]);
 const REQ={token:TOKEN_UPGRADE,estate:ESTATE_UPGRADE};
 const cost=(level,kind='estate')=>PRICE[kind]?.[level]??null;
 for(const kind of ['token','estate'])REQ[kind].forEach((r,i)=>{if(r)r.sc=cost(i,kind)});
 const balance=()=>ledger.view().balance;
 const tokenLevel=(key,profile=PREF)=>earnedTokenStage(key,profile);
 const refStageName=lv=>(TOKEN_LV[lv]||TOKEN_LV[1]).name;
 const validEstate=t=>t.source==='estate-upgrade'&&Object.hasOwn(CITY_DATA,t.city)&&Number.isInteger(t.square)&&SQ[t.square]?.t==='prop'&&Number.isInteger(t.from)&&t.from>=1&&t.to===t.from+1&&t.to<=5&&(t.amount===-cost(t.to,'estate')||t.amount===-LEGACY_ESTATE[t.to]);
 const validToken=t=>t.source==='token-upgrade'&&typeof t.token==='string'&&Object.hasOwn(TOKEN_INFO,t.token)&&Number.isInteger(t.from)&&t.from>=1&&t.to===t.from+1&&t.to<=6&&t.amount===-cost(t.to,'token');
 /* The immutable debit is also the recovery receipt: if a profile write fails or a backup is
    restored, the paid level is re-applied from it, and a retry can never debit it again. */
 function repair(){
  const rows=ledger.view().transactions;let changed=false;
  for(const t of rows.filter(validEstate).sort((a,b)=>a.to-b.to)){if(propertyRarity(t.city,t.square)>=t.to)continue;
   PREF.estateRarity||={};PREF.estateRarity[t.city]||={};PREF.estateRarity[t.city][t.square]=t.to;
   PREF.estateOwned||={};PREF.estateOwned[t.city]=[...new Set([...(PREF.estateOwned[t.city]||[]),t.square])];changed=true}
  for(const t of rows.filter(validToken).sort((a,b)=>a.to-b.to)){if(tokenLevel(t.token)>=t.to)continue;
   PREF.tokLv||={};PREF.tokLv[t.token]=t.to;changed=true}
  // Mirror the balance only once the earned wallet owns it (it migrates the legacy reserve first).
  if(window.SkylineEarnedCash)PREF.scReserve=ledger.view().balance;if(changed)savePref();return changed;
 }
 /* One read model for every upgrade card: level, next level, benefits, SC cost, SC balance and
    the exact reason it is unavailable. Used by the Collection screens and their tests. */
 function status(kind,key,city){
  const have=balance();
  if(kind==='token'){
   const owned=Object.hasOwn(TOKEN_INFO,key)&&tokenUnlocked(key),level=tokenLevel(key),next=TOKEN_UPGRADE[level+1],wins=tokenMastery(key).wins;
   const price=next?cost(level+1,'token'):null;
   const now=tokenPower(key,level),then=next?tokenPower(key,level+1):now,pct=v=>Math.round(v*100)+'%';
   const fields=[['pay',v=>'Payday +'+pct(v)],['rr',v=>v+' re-roll'+(v>1?'s':'')+' per game'],['pass',v=>v+' Lucky Pass'+(v>1?'es':'')],['shield',()=>'First rent bill halved'],['surge',()=>'First Start payday tripled'],['coinX',v=>'Game coins +'+pct(v)],['xpX',v=>'Player XP +'+pct(v)]];
   const benefits=next?fields.filter(([k])=>(then[k]||0)>(now[k]||0)).map(([k,f])=>f(then[k])+((now[k]||0)?' (now '+f(now[k]).replace(/^[^0-9+]*/,'')+')':'')):[];
   if(next&&!benefits.length)benefits.push(refStageName(level+1)+' finish and rarity badge');
   const reason=!owned?'Unlock this token first':!next?'Highest rarity reached':wins<next.wins?`Needs ${next.wins} wins with this token (you have ${wins})`:have<price?`Needs ${SkylineCurrency.formatCash(price-have)} more saved SC`:'';
   return{kind,key,owned,level,next:next?level+1:null,price,balance:have,wins,winsNeeded:next?.wins??null,benefits,ready:!reason,reason};
  }
  const level=propertyRarity(city,key),next=ESTATE_UPGRADE[level+1],wins=careerWins(),price=next?cost(level+1,'estate'):null;
  const owner=G&&!G.sim&&G.set?.city===city&&G.players.find(p=>!p.ai&&(!G.online||p.uid===NET.me));
  const collected=!!(PREF.estateOwned?.[city]?.includes(key)||(owner&&G.own[key]?.o===owner.id));
  const boost=[0,0,5,10,15,25];
  const benefits=next?[`Rent +${boost[level+1]}% in future matches with Collection perks (now +${boost[level]}%)`]:[];
  const reason=!collected?'Own this property in a completed match first':!next?'Highest rarity reached':wins<next.wins?`Needs ${next.wins} career wins (you have ${wins}). Assisted practice does not count`:have<price?`Needs ${SkylineCurrency.formatCash(price-have)} more saved SC`:'';
  return{kind,key,city,owned:collected,level,next:next?level+1:null,price,balance:have,wins,winsNeeded:next?.wins??null,benefits,ready:!reason,reason};
 }
 const original=upgradeCollection;
 upgradeCollection=async function(kind,key,expected,city){
  if(kind!=='estate'&&kind!=='token')return original.apply(this,arguments);
  const run=()=>{
   repair();
   if(!Number.isInteger(expected)||expected<1)throw Error('Invalid upgrade');
   if(kind==='estate'&&(!Object.hasOwn(CITY_DATA,city)||!Number.isInteger(key)||SQ[key]?.t!=='prop'||expected>4))throw Error('Invalid building upgrade');
   if(kind==='token'&&(!Object.hasOwn(TOKEN_INFO,key)||expected>5))throw Error('Invalid token upgrade');
   const s=status(kind,key,city);
   if(s.level!==expected)throw Error('This upgrade changed. Review the current stage.');
   if(!s.ready)throw Error(s.reason);
   const id=kind==='token'?'token-upgrade:'+key+':'+expected+':'+(expected+1):'estate-upgrade:'+city+':'+key+':'+expected+':'+(expected+1);
   const meta=kind==='token'?{token:key,from:expected,to:expected+1}:{city,square:key,from:expected,to:expected+1};
   const tx=ledger.record(id,-s.price,kind==='token'?'token-upgrade':'estate-upgrade',kind==='token'?'Token rarity upgrade':'Building rarity upgrade',meta);
   if(!tx)throw Error('This upgrade was already paid. Reopen Collection.');
   repair();
   PREF.collectionUpgrades=[{id,kind,key,city:city||null,from:expected,to:expected+1,sc:s.price,coins:0,at:tx.at},...(PREF.collectionUpgrades||[])].slice(0,128);
   savePref();try{refreshCoins()}catch{}
   document.querySelector('#tbSkylineCash')&&window.SkylineEarnedCash?.view&&(document.querySelector('#tbSkylineCash b').textContent=SkylineCurrency.formatCash(balance()).replace(/^SC /,''));
   return {id,kind,key,city:city||null,from:expected,to:expected+1,sc:s.price,coins:0,at:tx.at};
  };
  return navigator.locks?.request?navigator.locks.request('skyline-collection-upgrade',run):run();
 };
 const api=Object.freeze({cost,price:cost,balance,repair,status,PRICE});
 window.SkylineCollectionSC=api;window.SkylineEstateSC=api;
 try{repair()}catch(e){toast('Collection upgrade recovery: '+e.message)}
})();
