'use strict';
const assert=require('node:assert/strict');const {replayHistory}=require('./notification-replay.cjs');
(async()=>{let n=0;
 const pages=[{notificationHistory:[{signedPayload:'a'},{signedPayload:'t'}],hasMore:true,paginationToken:'p2'},{notificationHistory:[{signedPayload:'a'},{signedPayload:'bad'},{signedPayload:'down'}],hasMore:false}];
 const applied=new Set(),seenTokens=[];
 const r=await replayHistory({startDate:1,endDate:2,fetchPage:async q=>{seenTokens.push(q.paginationToken);return pages.shift()},
  notify:async p=>{if(p==='t')return{ok:true,ignored:'TEST'};if(p==='bad')throw Object.assign(Error('x'),{code:'purchase-owner-conflict',permanent:true});if(p==='down')throw Object.assign(Error('x'),{code:'unavailable'});const dup=applied.has(p);applied.add(p);return{duplicate:dup}}});
 assert.deepEqual(seenTokens,[null,'p2']);assert.equal(r.seen,5);assert.equal(r.applied,2);assert.equal(r.ignored,1);assert.equal(r.acknowledged,1);assert.deepEqual(r.retry,['unavailable']);n++;
 await assert.rejects(()=>replayHistory({fetchPage:async()=>({}),notify:async()=>({}),startDate:5,endDate:1}));n++;
 console.log(n+' notification replay checks passed');
})().catch(e=>{console.error(e);process.exitCode=1});
