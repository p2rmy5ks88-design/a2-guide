'use strict';
const crypto=require('node:crypto');
const {createWalletIdentity}=require('./wallet-auth.cjs');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
function createAccountBindings({db,verifyIdToken,environment,clock=Date.now}){
 if(!db||!['sandbox','production'].includes(environment))throw Error('Explicit server bindings environment required');
 const identity=createWalletIdentity(verifyIdToken),base='skylineAccounts/'+environment;
 return{
  async forPlayer(token){const uid=await identity(token),ref=db.doc(base+'/bindings/'+hash(uid)),apple=crypto.randomUUID(),google=crypto.randomBytes(32).toString('hex');
   return db.runTransaction(async tx=>{
    const old=await tx.get(ref);if(old.exists){const record=old.data();if(record.status==='deleted')throw Object.assign(Error('account-removed'),{code:'account-removed'});return{appAccountToken:record.apple,obfuscatedAccountId:record.google}}
    const record={uid,apple,google,status:'active',createdAt:clock()};tx.create(ref,record);tx.create(db.doc(base+'/appleBindings/'+apple),{uid});tx.create(db.doc(base+'/googleBindings/'+google),{uid});return{appAccountToken:apple,obfuscatedAccountId:google};
   });
  },
  async resolveApple(value){if(typeof value!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value))return null;return(await db.doc(base+'/appleBindings/'+value).get()).data()?.uid||null},
  async resolveGoogle(value){if(typeof value!=='string'||!/^[a-f0-9]{64}$/.test(value))return null;return(await db.doc(base+'/googleBindings/'+value).get()).data()?.uid||null}
 };
}
module.exports={createAccountBindings};
