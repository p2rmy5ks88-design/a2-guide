// Owner switch: stop or resume NEW coin purchases without a new app build.
//   node scripts/store-pause.cjs on      (new purchases refused before Apple's payment sheet; takes effect within ~30 s)
//   node scripts/store-pause.cjs off
//   node scripts/store-pause.cjs status
// Already-paid purchases are still delivered and refunds still processed while paused.
const {initializeApp}=require('firebase-admin/app'),{getFirestore}=require('firebase-admin/firestore');
const env=process.env.SKYLINE_ENVIRONMENT||'production',cmd=process.argv[2];
initializeApp({projectId:process.env.GCLOUD_PROJECT||'eko-estates'});const ref=getFirestore().doc('skylineConfig/'+env);
(async()=>{if(cmd==='on'||cmd==='off')await ref.set({purchasesPaused:cmd==='on',changedAt:Date.now()},{merge:true});else if(cmd!=='status'){console.error('Usage: on | off | status');process.exit(2)}
 console.log(env+' purchasesPaused =',(await ref.get()).data()?.purchasesPaused===true)})().catch(e=>{console.error(e.message);process.exit(1)});
