'use strict';
// Server-only REST transactions use acknowledged values and ETags. No local SDK
// cache can replace a parent with a partially cached child or an initial null.
// https://firebase.google.com/docs/database/rest/save-data#section-conditional-requests
function createTransactionStore({databaseURL,getAccessToken,fetchImpl=fetch,timeoutMs=2400,maxAttempts=8}){
 const base=new URL(databaseURL);if(base.protocol!=='https:'||base.hostname!=='eko-estates-default-rtdb.europe-west1.firebasedatabase.app'||base.pathname!=='/')throw Error('Unsupported competition database');
 return {ref(path){if(path!=='skylineV2'&&path!=='skylineV2/flags'&&!/^skylineV2\/(rooms|lc)\/[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/.test(path))throw Error('Unsupported competition path');
  return {async transaction(update){const deadline=Date.now()+timeoutMs;const token=await getAccessToken();
   const request=async(method,headers={},body)=>{const left=deadline-Date.now();if(left<=0)throw Error('Database transaction deadline');const r=await fetchImpl(base.href+path+'.json',{method,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(left),headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',...headers},...(body===undefined?{}:{body})});const value=await r.json();if(![200,412].includes(r.status))throw Error('Database request rejected');return {status:r.status,value,etag:r.headers.get('etag')}};
   let current=await request('GET',{'X-Firebase-ETag':'true'});
   for(let attempt=0;attempt<maxAttempts;attempt++){
    const before=JSON.stringify(current.value),next=update(JSON.parse(before));
    if(next===undefined)return {committed:false,snapshot:{val:()=>current.value}};
    const body=JSON.stringify(next);if(body===before)return {committed:true,snapshot:{val:()=>JSON.parse(before)}};
    if(next===null)throw Error('Competition transactions cannot delete a subtree');
    if(!current.etag)throw Error('Database ETag missing');
    const response=await request('PUT',{'if-match':current.etag},body);
    if(response.status===200)return {committed:true,snapshot:{val:()=>response.value}};
    current=response;
   }
   throw Error('Database transaction contention');
  }};
 }};
}
module.exports={createTransactionStore};
