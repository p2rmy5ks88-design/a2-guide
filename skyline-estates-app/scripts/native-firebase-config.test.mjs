import fs from 'node:fs';
import assert from 'node:assert/strict';
import {options,applePlist,androidJson,registeredApps} from './native-firebase-config.mjs';
const c={apiKey:'AIza'+'x'.repeat(35),projectId:registeredApps.projectId,messagingSenderId:registeredApps.sender,databaseURL:'https://fixture.invalid',storageBucket:'fixture.invalid'};
const ios=options(c,'ios'),android=options(c,'android');
assert.equal(ios.appId,registeredApps.ios);assert.equal(android.appId,registeredApps.android);assert.notEqual(ios.appId,android.appId);
assert.throws(()=>options({...c,projectId:'wrong-project'},'ios'));assert.throws(()=>options({...c,messagingSenderId:'wrong'},'ios'));assert.throws(()=>options({...c,apiKey:'invalid'},'ios'));assert.throws(()=>options(c,'web'));
const plist=applePlist(ios);assert.ok(plist.includes('<key>BUNDLE_ID</key><string>com.kenstylez.skylineestates</string>'));assert.ok(plist.includes('<key>IS_ANALYTICS_ENABLED</key><false/>'));assert.ok(!plist.includes('PRIVATE KEY'));assert.ok(applePlist({...ios,storageBucket:'a&b'}).includes('a&amp;b'));
const json=androidJson(android);assert.equal(json.client[0].client_info.mobilesdk_app_id,registeredApps.android);assert.equal(json.client[0].client_info.android_client_info.package_name,registeredApps.bundle);assert.deepEqual(json.client[0].oauth_client,[]);
console.log('PASS native configuration identity, project guards and platform isolation');

for(const script of ['patch-ios.sh','patch-android.sh'])assert.ok(!fs.readFileSync(new URL(script,import.meta.url),'utf8').includes('\r'),'native shell scripts require LF endings');
