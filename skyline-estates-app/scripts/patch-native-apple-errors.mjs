import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const app=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const original='    public static func createErrorCode(error: Error?) -> String? {\n        if let error = error as NSError? {\n';
const insertion='            if let code = SkylineAppleAuthorizationErrors.code(error) { return code }\n';
export function patchHelper(source){
 source=source.replace(/\r\n/g,'\n');
 if(source.includes(original+insertion))return source;
 if(source.split(original).length!==2)throw Error('Pinned native Apple helper changed; review before patching');
 return source.replace(original,()=>original+insertion);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const pkg=path.join(app,'node_modules/@capacitor-firebase/authentication');
 const version=JSON.parse(fs.readFileSync(path.join(pkg,'package.json'),'utf8')).version;
 if(version!=='7.5.0')throw Error('Native Apple error patch requires reviewed authentication 7.5.0');
 const helper=path.join(pkg,'ios/Plugin/FirebaseAuthenticationHelper.swift');
 fs.writeFileSync(helper,patchHelper(fs.readFileSync(helper,'utf8')));
 fs.copyFileSync(path.join(app,'native/AppleAuthorizationErrors.swift'),path.join(pkg,'ios/Plugin/AppleAuthorizationErrors.swift'));
 console.log('Native Apple authorization errors retain fixed codes; credential details stay private');
}
