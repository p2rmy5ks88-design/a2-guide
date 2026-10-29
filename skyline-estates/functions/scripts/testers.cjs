// Owner tool for TestFlight / App Review tester accounts on the production service.
// Uses your own Google login (gcloud auth application-default login); no key files.
//   node scripts/testers.cjs list
//   node scripts/testers.cjs add <firebase-uid> "<note, e.g. App Review demo>"   allow free Sandbox purchases; flags the account as a test account for good
//   node scripts/testers.cjs retire <firebase-uid>                              lock the test account (its free coins can no longer be used)
//   node scripts/testers.cjs reset <firebase-uid>                               wipe it to an empty normal account (coins, XP, items cleared)
// Run `npm run prepare-service` first so ../service holds the tested modules.
const {initializeApp}=require('firebase-admin/app'),{getFirestore}=require('firebase-admin/firestore');
const {createProfileService}=require('../service/profile-service.cjs');
const env=process.env.SKYLINE_ENVIRONMENT||'production',[cmd,uid,note='']=process.argv.slice(2);
initializeApp({projectId:process.env.GCLOUD_PROJECT||'eko-estates'});const db=getFirestore();
const svc=createProfileService({db,environment:env,verifyIdToken:async()=>{throw Error('not used')}});
(async()=>{
 if(cmd==='list'){const s=await db.collection('skylineAccounts/'+env+'/testers').get();s.docs.forEach(d=>console.log(d.id.slice(0,12),JSON.stringify(d.data())));console.log(s.size+' tester record(s) in '+env)}
 else if(cmd==='add'&&uid)console.log(await svc.markTester(uid,note));
 else if(cmd==='retire'&&uid)console.log(await svc.retireTester(uid));
 else if(cmd==='reset'&&uid)console.log(await svc.resetTester(uid));
 else{console.error('Usage: list | add <uid> "<note>" | retire <uid> | reset <uid>');process.exit(2)}
})().catch(e=>{console.error(e.code||e.message);process.exit(1)});
