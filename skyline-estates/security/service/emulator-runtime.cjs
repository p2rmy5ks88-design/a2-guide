// This entry point cannot initialize a real Firebase project.
function createEmulatorRuntime(name='admission-prototype'){
 const db=/^127\.0\.0\.1:(\d+)$/.exec(process.env.FIREBASE_DATABASE_EMULATOR_HOST||''),auth=/^127\.0\.0\.1:(\d+)$/.exec(process.env.FIREBASE_AUTH_EMULATOR_HOST||'');
 if(!db||!auth||process.env.GCLOUD_PROJECT!=='demo-skyline-phase1')throw Error('Both loopback emulators and the exact demo project are required');
 const {initializeApp,deleteApp}=require('firebase-admin/app'),{getAuth}=require('firebase-admin/auth'),{getDatabase}=require('firebase-admin/database');
 const projectId='demo-skyline-phase1',app=initializeApp({projectId,databaseURL:`http://${process.env.FIREBASE_DATABASE_EMULATOR_HOST}/?ns=${projectId}`},name);
 return{db:getDatabase(app),auth:getAuth(app),projectId,close:()=>deleteApp(app)};
}
module.exports={createEmulatorRuntime};
