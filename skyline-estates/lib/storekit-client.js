/* iOS StoreKit 2 orchestration. The caller supplies an authenticated server
   wallet. This module never mutates local coins or invents product prices. */
(function(scope){
'use strict';
const SALE_IDS=Object.freeze(['coins_600','coins_1500','coins_4000','coins_10000'].map(id=>'com.kenstylez.skylineestates.'+id));
function createStoreKitClient({bridge,wallet,account,enabled=()=>false,onWallet=()=>{},onError=()=>{},createDelivery=scope.createSkylinePurchaseDelivery}){
 if(!bridge||!wallet||typeof account!=='function'||typeof createDelivery!=='function')throw Error('StoreKit client dependencies required');
 let listener=null,starting=null,generation=0,buying=false,products=new Map();
 const fail=code=>{throw Object.assign(Error(code),{code})};
 const guard=()=>{if(!enabled())fail('store/not-enabled')};
 async function owner(){guard();const value=await account();if(!value?.uid||!value?.token)fail('store/sign-in-required');return value}
 async function still(uid){const value=await owner();if(value.uid!==uid)fail('store/account-changed');return value}
 const delivery=createDelivery({account:owner,verify:(token,proof)=>wallet.purchase(token,proof),delivery:(token,key)=>wallet.delivery(token,key),finish:transaction=>{guard();return bridge.finish({transactionId:transaction.id,durablyDelivered:true})}});
 function safeError(error){const allowed=new Set(['store/not-enabled','store/sign-in-required','store/account-changed','store/payments-restricted','store/busy','store/products-unavailable','store/product-unavailable','store/purchase-unavailable','store/unverified-transaction','purchase-sign-in-required','purchase-account-changed']);const code=allowed.has(error?.code)?error.code:'store/delivery-unavailable';onError({code})}
 async function refresh(){const who=await owner(),value=await wallet.history(who.token);await still(who.uid);onWallet(value);return value}
 async function deliver(transaction){guard();const result=await delivery.deliver(transaction);await refresh();return result}
 async function start(){guard();if(listener)return;if(starting)return starting;const current=++generation;
  starting=(async()=>{const handle=await bridge.addListener('purchaseUpdated',transaction=>{if(current!==generation||!enabled())return;deliver(transaction).catch(safeError)});if(current!==generation){await handle.remove();return}listener=handle})().finally(()=>{if(current===generation)starting=null});return starting;
 }
 return{
  async products(){await owner();const value=await bridge.products();guard();const entries=value?.products;if(!Array.isArray(entries))fail('store/invalid-products');
   products=new Map(entries.filter(p=>SALE_IDS.includes(p.id)&&typeof p.displayPrice==='string'&&p.displayPrice.length>0&&p.displayPrice.length<100).map(p=>[p.id,{id:p.id,title:typeof p.title==='string'?p.title:'Coin pack',displayPrice:p.displayPrice}]));return{products:Array.from(products.values()),canMakePayments:value.canMakePayments===true};
  },
  async buy(productId){if(buying)fail('store/busy');buying=true;
   try{const who=await owner();if(!SALE_IDS.includes(productId)||!products.has(productId))fail('store/product-unavailable');await start();const binding=await wallet.binding(who.token);await still(who.uid);if(typeof binding?.appAccountToken!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(binding.appAccountToken))fail('store/invalid-binding');
    const result=await bridge.purchase({productId,appAccountToken:binding.appAccountToken});await still(who.uid);
    if(result?.state==='cancelled'||result?.state==='pending')return{state:result.state};
    if(result?.state!=='purchased'||result.transaction?.store!=='apple'||result.transaction.productId!==productId||result.transaction.appAccountToken?.toLowerCase()!==binding.appAccountToken.toLowerCase())fail('store/invalid-transaction');
    return deliver(result.transaction);
   }finally{buying=false}
  },
  async recover(){await owner();await start();const value=await bridge.unfinished();guard();const results=await delivery.recover(value?.transactions);await refresh();return results},
  refresh,
  start,
  async stop(){++generation;starting=null;products.clear();const handle=listener;listener=null;if(handle)await handle.remove()}
 };
}
if(typeof module!=='undefined'&&module.exports)module.exports={createStoreKitClient,SALE_IDS};else scope.createSkylineStoreKitClient=createStoreKitClient;
})(typeof window!=='undefined'?window:globalThis);
