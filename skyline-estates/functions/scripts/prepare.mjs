// Copies the tested service modules into the deployable function folder.
// With --check, fails when the copy differs from ../security/service.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const here=path.dirname(path.dirname(fileURLToPath(import.meta.url))),from=path.join(here,'..','security','service'),to=path.join(here,'service');
const files=['player-http.cjs','profile-service.cjs','profile.cjs','firestore-wallet.cjs','wallet.cjs','wallet-auth.cjs','account-bindings.cjs','store-adapters.cjs'];
const check=process.argv.includes('--check');let stale=[];
fs.mkdirSync(to,{recursive:true});
for(const f of files){const src=fs.readFileSync(path.join(from,f));const dst=path.join(to,f);if(check){if(!fs.existsSync(dst)||!fs.readFileSync(dst).equals(src))stale.push(f)}else fs.writeFileSync(dst,src)}
for(const f of fs.readdirSync(to))if(!files.includes(f)){if(check)stale.push(f+' (unexpected)');else fs.rmSync(path.join(to,f))}
if(stale.length){console.error('Service copy is stale: '+stale.join(', ')+'. Run npm run prepare-service.');process.exit(1)}
console.log(check?'Service copy matches the tested modules':'Copied '+files.length+' service modules');
