/* Local escrow journal lives in the SAME profile write as the coin balance.
   No StoreKit calls. Cloud capture uses the existing home profile adapter. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CityForgeWallet=api})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
const copy=x=>JSON.parse(JSON.stringify(x)),owner=p=>p.cloudOwner||'this-device';
function create(F,adapter){
 const fail=error=>({ok:false,error});
 function read(){const p=adapter.read();if(!p||!Number.isSafeInteger(p.coins)||p.coins<0)throw Error('Your saved coin balance is unavailable.');return p}
 function commit(p){adapter.write(copy(p));const check=read();if(check.coins!==p.coins||JSON.stringify(check.cityForgeWallet)!==JSON.stringify(p.cityForgeWallet))throw Error('Could not save the coin transaction. No match was opened.');}
 return{
  status(){try{const p=read();return{ok:true,coins:p.coins,active:p.cityForgeWallet?.active||null}}catch(e){return fail(e.message)}},
  enter(options={}){try{const p=read(),ledger=p.cityForgeWallet||{version:1,active:null,settled:[]};if(ledger.active)return fail('Finish or settle your reserved City Forge match first.');const q=F.quote(options.length,{level:options.level,mode:options.mode,ai:options.ai}),id=String(options.id||'');if(!id||id.length>100||ledger.settled.some(r=>r.id===id))return fail('A fresh match receipt is required.');if(p.coins<q.reserve)return{ok:false,error:'Not enough coins for the full match.',required:q.reserve,balance:p.coins,shortfall:q.reserve-p.coins};
   const state=F.create({...options,funded:true}),config={seed:state.seed,mode:state.mode,ai:state.players.length-1,humans:state.players.length,length:F.lengthOf(state.maxRounds),names:state.players.map(x=>x.name),funded:true};state.id=id;
   const receipt={id,owner:owner(p),config,level:q.level,reserve:q.reserve,winnerBonus:q.winnerBonus,coinsPerCredit:q.coinsPerCredit};p.coins-=q.reserve;p.cityForgeWallet={version:1,active:receipt,settled:ledger.settled||[]};commit(p);return{ok:true,receipt:copy(receipt),state};
  }catch(e){return fail(e.message)}},
  settle(raw,{abandon=false}={}){try{const p=read(),ledger=p.cityForgeWallet,entry=ledger?.active;if(!entry)return fail('This match has already been settled, or has no coin reservation.');if(owner(p)!==entry.owner)return fail('Return to the original player account to collect this city.');let state=null;if(raw){const r=F.restore(raw);if(!r.ok||r.state.id!==entry.id||!r.state.funded||!F.verify(r.state,entry.config))return fail('The saved city does not match its funding receipt. It has not been paid.');state=r.state;}
   if(!abandon&&(!state||state.phase!=='over'))return fail('Finish the match to collect its result.');const complete=!!state&&state.phase==='over'&&!abandon;
   const refund=complete?state.players[0].cash*entry.coinsPerCredit:Math.min(entry.reserve,state?state.players[0].cash*entry.coinsPerCredit:entry.reserve),bonus=complete&&state.winner===0?entry.winnerBonus:0;
   if(!Number.isSafeInteger(refund)||refund<0||!Number.isSafeInteger(p.coins+refund+bonus))return fail('Invalid settlement amount.');p.coins+=refund+bonus;const receipt={id:entry.id,refund,bonus,complete};p.cityForgeWallet={version:1,active:null,settled:[...(ledger.settled||[]),receipt].slice(-64)};commit(p);return{ok:true,...receipt,balance:p.coins};
  }catch(e){return fail(e.message)}}
 };
}
return Object.freeze({create});
});
