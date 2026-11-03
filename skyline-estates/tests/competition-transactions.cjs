'use strict';
const assert=require('node:assert/strict');
const {createTransactionStore}=require('../competition-functions/transaction-store.cjs');
const databaseURL='https://eko-estates-default-rtdb.europe-west1.firebasedatabase.app';
let value={rooms:{ABCDE:{members:{host:true}}},competition:{count:0}},revision=1,puts=0,conflict=true;
const options={databaseURL,getAccessToken:async()=>'test-only',fetchImpl:async(url,o)=>{
 assert.equal(o.headers.Authorization,'Bearer test-only');assert(url.endsWith('/skylineV2.json'));
 if(o.method==='GET')return new Response(JSON.stringify(value),{headers:{etag:String(revision)}});
 puts++;if(conflict){conflict=false;value.rooms.ABCDF={members:{guest:true}};revision++}
 if(o.headers['if-match']!==String(revision))return new Response(JSON.stringify(value),{status:412,headers:{etag:String(revision)}});
 value=JSON.parse(o.body);revision++;return new Response(JSON.stringify(value));
}};
(async()=>{
 const a=createTransactionStore(options),b=createTransactionStore(options);
 await a.ref('skylineV2').transaction(r=>{r.competition.count++;return r});
 assert.equal(value.competition.count,1);assert(value.rooms.ABCDF);assert.equal(puts,2);
 const before=puts;await b.ref('skylineV2').transaction(r=>r);assert.equal(puts,before);
 await Promise.all([a,b].map(db=>db.ref('skylineV2').transaction(r=>{r.competition.count++;return r})));
 assert.equal(value.competition.count,3);assert(value.rooms.ABCDE.members.host);
 await assert.rejects(()=>a.ref('skylineV2').transaction(()=>null),/cannot delete/);
 assert.throws(()=>a.ref('skylineWalletV1'),/Unsupported/);
 assert.throws(()=>createTransactionStore({...options,databaseURL:'https://untrusted.invalid'}),/Unsupported/);
 const noTag=createTransactionStore({...options,fetchImpl:async()=>new Response('{}')});await assert.rejects(()=>noTag.ref('skylineV2').transaction(()=>({changed:true})),/ETag missing/);
 const denied=createTransactionStore({...options,fetchImpl:async()=>new Response('{}',{status:403})});await assert.rejects(()=>denied.ref('skylineV2').transaction(r=>r),/rejected/);
 console.log('PASS 8 transaction checks: conflicts, fresh instances, acknowledged reads, concurrent preservation, deletion/path/host guards, missing ETag and access denial');
})().catch(e=>{console.error(e);process.exitCode=1});
