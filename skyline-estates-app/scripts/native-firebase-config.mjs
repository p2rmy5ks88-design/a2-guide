import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const app=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// Public Firebase app IDs verified in the owner's console, 29 October 2026.
export const registeredApps=Object.freeze({projectId:'eko-estates',sender:'668368365590',bundle:'com.kenstylez.skylineestates',ios:'1:668368365590:ios:03e33bfa0fd85930a32d37',android:'1:668368365590:android:22176da5b1b292a9a32d37'});
export function options(config,platform){
 if(config.projectId!==registeredApps.projectId||config.messagingSenderId!==registeredApps.sender||!/^AIza[\w-]{35}$/.test(config.apiKey||''))throw Error('Unexpected Firebase project options');
 if(!['ios','android'].includes(platform))throw Error('Unknown native platform');
 return {apiKey:config.apiKey,projectId:config.projectId,sender:config.messagingSenderId,appId:registeredApps[platform],bundle:registeredApps.bundle,databaseURL:config.databaseURL,storageBucket:config.storageBucket};
}
const xml=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function applePlist(o){const entries={API_KEY:o.apiKey,GCM_SENDER_ID:o.sender,PLIST_VERSION:'1',BUNDLE_ID:o.bundle,PROJECT_ID:o.projectId,STORAGE_BUCKET:o.storageBucket,GOOGLE_APP_ID:o.appId,DATABASE_URL:o.databaseURL,IS_ADS_ENABLED:false,IS_ANALYTICS_ENABLED:false,IS_APPINVITE_ENABLED:false,IS_GCM_ENABLED:false,IS_SIGNIN_ENABLED:true,FIREBASE_ANALYTICS_COLLECTION_ENABLED:false};return '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict>\n'+Object.entries(entries).map(([key,v])=>'<key>'+key+'</key>'+ (typeof v==='boolean'?'<'+v+'/>':'<string>'+xml(v)+'</string>')).join('\n')+'\n</dict></plist>\n'}
export function androidJson(o){return {project_info:{project_number:o.sender,project_id:o.projectId,firebase_url:o.databaseURL,storage_bucket:o.storageBucket},client:[{client_info:{mobilesdk_app_id:o.appId,android_client_info:{package_name:o.bundle}},oauth_client:[],api_key:[{current_key:o.apiKey}],services:{appinvite_service:{other_platform_oauth_client:[]}}}],configuration_version:'1'}}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const platform=process.argv[2],context={window:{}};
 vm.runInNewContext(fs.readFileSync(path.resolve(app,'../eko-estates/firebase-config.js'),'utf8'),context,{timeout:100});
 const o=options(context.window.EKO_FIREBASE,platform),target=platform==='ios'?path.join(app,'ios/App/App/GoogleService-Info.plist'):path.join(app,'android/app/google-services.json');
 fs.writeFileSync(target,platform==='ios'?applePlist(o):JSON.stringify(androidJson(o),null,2)+'\n');console.log('Prepared public Firebase configuration for '+platform+' '+o.bundle);
}
