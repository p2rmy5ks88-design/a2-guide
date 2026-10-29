'use strict';
// Minimal in-memory Firestore for unit tests only. Transactions run serially and
// buffer writes until the callback resolves, like Firestore. Real concurrency and
// retries are covered by the emulator integration suite in CI.
const clone=x=>x==null?x:structuredClone(x);
function createFakeFirestore(){
 const docs=new Map();let commits=0;
 const fail=code=>{throw Object.assign(new Error(code),{code})};
 function docRef(path){
  const parts=path.split('/');if(parts.length%2)throw Error('Document path required: '+path);
  const ref={path,id:parts.at(-1),
   collection:name=>collRef(path+'/'+name),
   async get(){return snap(ref)},
   async set(v){docs.set(path,clone(v))},
   async create(v){if(docs.has(path))fail('already-exists');docs.set(path,clone(v))},
   async update(v){if(!docs.has(path))fail('not-found');docs.set(path,{...docs.get(path),...clone(v)})},
   async delete(){docs.delete(path)}};
  return ref;
 }
 function snap(ref){const v=docs.get(ref.path);return{id:ref.id,ref,exists:v!==undefined,data:()=>clone(v)}}
 function collRef(path,filters=[],lim=Infinity){
  const self={path,doc:id=>docRef(path+'/'+id),
   where:(f,op,v)=>{if(op!=='==')throw Error('Only == supported');return collRef(path,[...filters,[f,v]],lim)},
   limit:n=>collRef(path,filters,n),
   async get(){const depth=path.split('/').length+1;const rows=[...docs.keys()].filter(k=>k.startsWith(path+'/')&&k.split('/').length===depth).sort().map(k=>snap(docRef(k))).filter(s=>filters.every(([f,v])=>s.data()[f]===v)).slice(0,lim);return{docs:rows,size:rows.length,empty:!rows.length}}};
  return self;
 }
 async function runTransaction(fn){
  const writes=[];let wrote=false;
  const tx={
   async get(ref){if(wrote)throw Error('Reads must precede writes');return snap(ref)},
   async getAll(...refs){if(wrote)throw Error('Reads must precede writes');return refs.map(snap)},
   set(ref,v){wrote=true;writes.push(()=>docs.set(ref.path,clone(v)))},
   create(ref,v){wrote=true;if(docs.has(ref.path))fail('already-exists');writes.push(()=>docs.set(ref.path,clone(v)))},
   update(ref,v){wrote=true;writes.push(()=>{if(!docs.has(ref.path))fail('not-found');docs.set(ref.path,{...docs.get(ref.path),...clone(v)})})},
   delete(ref){wrote=true;writes.push(()=>docs.delete(ref.path))}};
  const result=await fn(tx);writes.forEach(w=>w());commits++;return result;
 }
 return{doc:docRef,collection:p=>collRef(p),runTransaction,dump:()=>Object.fromEntries([...docs].map(([k,v])=>[k,clone(v)])),commits:()=>commits};
}
module.exports={createFakeFirestore};
