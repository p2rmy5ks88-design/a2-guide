/* Saved, earned SC pays for permanent buildings. Coins and live match cash never move. */
(()=>{'use strict';
 const ledger=SkylineSCWallet.create(localStorage),costs=Object.freeze([0,0,200,600,1600,4000]);
 const cost=level=>costs[level]??null;
 const valid=t=>t.source==='estate-upgrade'&&Object.hasOwn(CITY_DATA,t.city)&&Number.isInteger(t.square)&&SQ[t.square]?.t==='prop'&&Number.isInteger(t.from)&&t.from>=1&&t.to===t.from+1&&t.to<=5&&t.amount===-cost(t.to);
 function repair(){
  const paid=ledger.view().transactions.filter(valid).sort((a,b)=>a.to-b.to);
  let changed=false;
  for(const t of paid){if(propertyRarity(t.city,t.square)>=t.to)continue;
   PREF.estateRarity||={};PREF.estateRarity[t.city]||={};PREF.estateRarity[t.city][t.square]=t.to;
   PREF.estateOwned||={};PREF.estateOwned[t.city]=[...new Set([...(PREF.estateOwned[t.city]||[]),t.square])];changed=true;
  }
  PREF.scReserve=ledger.view().balance;if(changed)savePref();return changed;
 }
 const original=upgradeCollection;
 upgradeCollection=async function(kind,key,expected,city){
  if(kind!=='estate')return original.apply(this,arguments);
  const run=()=>{
   repair();
   if(!Object.hasOwn(CITY_DATA,city)||!Number.isInteger(key)||SQ[key]?.t!=='prop'||!Number.isInteger(expected)||expected<1||expected>4)throw Error('Invalid building upgrade');
   if(propertyRarity(city,key)!==expected)throw Error('This upgrade changed. Review the current stage.');
   const owner=G&&!G.sim&&G.set?.city===city&&G.players.find(p=>!p.ai&&(!G.online||p.uid===NET.me));
   if(!PREF.estateOwned?.[city]?.includes(key)&&!(owner&&G.own[key]?.o===owner.id))throw Error('Own this property in a game first');
   if(careerWins()<ESTATE_UPGRADE[expected+1].wins)throw Error('More career wins needed. Assisted practice does not count.');
   const amount=cost(expected+1);if(ledger.view().balance<amount)throw Error('Not enough saved SC');
   const id='estate-upgrade:'+city+':'+key+':'+expected+':'+(expected+1);
   const tx=ledger.record(id,-amount,'estate-upgrade','Building rarity upgrade',{city,square:key,from:expected,to:expected+1});
   if(!tx)throw Error('This building upgrade was already paid. Reopen Portfolio.');
   // The immutable debit is also the recovery receipt. A backup rollback or failed
   // profile write restores only the paid rarity; it cannot debit SC a second time.
   repair();savePref();refreshCashHeader();
   return {id,kind,key,city,from:expected,to:expected+1,sc:amount,coins:0,at:tx.at};
  };
  return navigator.locks?.request?navigator.locks.request('skyline-collection-upgrade',run):run();
 };
 window.SkylineEstateSC=Object.freeze({cost,balance:()=>ledger.view().balance,repair});
 try{repair()}catch(e){toast('Building upgrade recovery: '+e.message)}
})();
