'use strict';
function createWalletIdentity(verifyIdToken){
 if(typeof verifyIdToken!=='function')throw Error('Verified authentication required');
 const fail=(code,status)=>{throw Object.assign(new Error(code),{code,status})};
 return async function(token){
  if(typeof token!=='string'||!token||token.length>8192)fail('unauthenticated',401);
  let user;try{user=await verifyIdToken(token,true)}catch{fail('unauthenticated',401)}
  if(!/^[A-Za-z0-9_-]{1,128}$/.test(user?.uid||'')||['__proto__','prototype','constructor'].includes(user.uid))fail('unsupported-identity',403);
  if(!['apple.com','google.com','password'].includes(user.firebase?.sign_in_provider)||user.firebase.sign_in_provider==='password'&&user.email_verified!==true)fail('persistent-account-required',403);
  return user.uid;
 };
}
module.exports={createWalletIdentity};
