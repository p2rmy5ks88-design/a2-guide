// Owner tool: list, add or remove TestFlight/App Review tester accounts. Only listed accounts can
// receive Apple Sandbox purchases on the production service. Runs with your own Google login
// (gcloud auth application-default login); no key files.
//   node scripts/testers.cjs list
//   node scripts/testers.cjs add <firebase-uid> "<note, e.g. App Review demo>"
//   node scripts/testers.cjs remove <firebase-uid>
const {initializeApp}=require('firebase-admin/app'),{getFirestore}=require('firebase-admin/firestore'),{createHash}=require('node:crypto');
const env=process.env.SKYLINE_ENVIRONMENT||'production',[cmd,uid,note='']=process.argv.slice(2);
initializeApp({projectId:process.env.GCLOUD_PROJECT||'eko-estates'});const db=getFirestore(),col=db.collection('skylineAccounts/'+env+'/testers');
const hash=x=>createHash('sha256').update(x).digest('hex');
(async()=>{
 if(cmd==='list'){const s=await col.get();s.docs.forEach(d=>console.log(d.id.slice(0,12),JSON.stringify(d.data())));console.log(s.size+' tester record(s) in '+env)}
 else if(cmd==='add'&&/^[A-Za-z0-9_-]{1,128}$/.test(uid||'')){await col.doc(hash(uid)).set({active:true,note:String(note).slice(0,80),addedAt:Date.now()});console.log('Added tester (sandbox purchases allowed) in '+env)}
 else if(cmd==='remove'&&uid){await col.doc(hash(uid)).delete();console.log('Removed tester in '+env)}
 else{console.error('Usage: list | add <uid> "<note>" | remove <uid>');process.exit(2)}
})().catch(e=>{console.error(e.message);process.exit(1)});
