'use strict';
// Package the exact audited source and transitive server dependencies. No native
// app, purchases, credentials, unrelated project files or test fixtures included.
const fs=require('node:fs'),path=require('node:path');
const from=path.resolve(__dirname,'..'),to=path.join(__dirname,'runtime'),seen=new Set(),check=process.argv.includes('--check');
function copy(relative){if(seen.has(relative))return;seen.add(relative);const source=path.join(from,relative),dest=path.join(to,relative),data=fs.readFileSync(source);
 if(check){if(!fs.existsSync(dest)||!fs.readFileSync(dest).equals(data))throw Error('Stale packaged source: '+relative)}else{fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,data)}
 if(relative.endsWith('.cjs'))for(const m of data.toString().matchAll(/require\(['"](\.[^'"]+)['"]\)/g)){const target=path.resolve(path.dirname(source),m[1]);const rel=path.relative(from,target);if(rel.startsWith('..')||path.isAbsolute(rel))throw Error('Dependency outside game source');copy(rel)}
}
copy('game.html');copy('competition/compose.cjs');
console.log((check?'Verified ':'Packaged ')+seen.size+' audited server files');
