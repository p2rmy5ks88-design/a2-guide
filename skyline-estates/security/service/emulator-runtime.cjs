// This entry point cannot initialize a real Firebase project.
function createEmulatorRuntime(name='admission-prototype'){
 const db=/^127\.0\.0\.1:(\d+)$/.exec(process.env.FIREBASE_DATABASE_EMULATOR_HOST||''),auth=/^127\.0\.0\.1:(\d+)$/.exec(process.env.FIREBASE_AUTH_EMULATOR_HOST||'');
 if(!db||!auth||process.env.GCLOUD_PROJECT!=='demo-skyline-phase1')throw Error('Both loopback emulators and the exact demo project are required');
 const {initializeApp,deleteApp}=require('firebase-admin/app'),{getAuth}=require('firebase-admin/auth'),{getDatabase}=require('firebase-admin/database');
 let firestore=null;
 const projectId='demo-skyline-phase1',app=initializeApp({projectId,databaseURL:`http://${process.env.FIREBASE_DATABASE_EMULATOR_HOST}/?ns=${projectId}`},name);
 return{db:getDatabase(app),auth:getAuth(app),projectId,get firestore(){if(!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST||''))throw Error('Loopback Firestore emulator required');return firestore||(firestore=require('firebase-admin/firestore').getFirestore(app))},close:async()=>{if(firestore)await firestore.terminate();await deleteApp(app)}};
}
module.exports={createEmulatorRuntime};
