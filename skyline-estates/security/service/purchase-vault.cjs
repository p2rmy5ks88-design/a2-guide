'use strict';
const crypto=require('node:crypto');
function createPurchaseVault(key,environment){
 if(!Buffer.isBuffer(key)||key.length!==32||!['sandbox','production'].includes(environment))throw Error('A 256-bit server key and explicit environment are required');
 key=Buffer.from(key);
 const aad=Buffer.from('skyline-purchase-proof-v1:'+environment);
 return{
  seal(value){if(value.environment!==environment)throw Error('Proof environment mismatch');const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(aad);const body=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return ['v1',iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),body.toString('base64url')].join('.')},
  open(sealed){if(typeof sealed!=='string'||sealed.length>16000)throw Error('Invalid sealed proof');const [version,nonce,tag,body,...extra]=sealed.split('.');if(version!=='v1'||extra.length||!nonce||!tag||!body)throw Error('Invalid sealed proof');const decipher=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(nonce,'base64url'));decipher.setAAD(aad);decipher.setAuthTag(Buffer.from(tag,'base64url'));const value=JSON.parse(Buffer.concat([decipher.update(Buffer.from(body,'base64url')),decipher.final()]).toString('utf8'));if(value.environment!==environment)throw Error('Proof environment mismatch');return value}
 };
}
module.exports={createPurchaseVault};
