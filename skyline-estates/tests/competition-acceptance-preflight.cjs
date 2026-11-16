'use strict';
// Safe local preflight: no live competition calls or test-account creation.
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const script=path.join(__dirname,'competition-production.cjs');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'skyline-qa-preflight-'));
function check(name,file){const p=spawnSync(process.execPath,[script],{encoding:'utf8',timeout:15000,env:{...process.env,COMPETITION_PRODUCTION_ACCEPT:'1',COMPETITION_ACCEPTANCE_SESSIONS_FILE:file}});assert.notEqual(p.status,0,name);assert.match(p.stderr,/Existing test-session file not found|Private acceptance session file must|Existing sessions must contain/,name);console.log('PASS',name)}
try{
 check('missing existing sessions refuse to run',path.join(dir,'missing.json'));
 const f=path.join(dir,'sessions.json');fs.writeFileSync(f,JSON.stringify({version:1,accounts:[],matches:{}}),{mode:0o600});check('empty session pair rejected',f);
 fs.writeFileSync(f,JSON.stringify({version:1,accounts:[{uid:'same',idToken:'test',refreshToken:'test',expires:Date.now()+60000},{uid:'same',idToken:'test',refreshToken:'test',expires:Date.now()+60000}],matches:{}}),{mode:0o600});check('duplicate account identities rejected',f);
 fs.chmodSync(f,0o644);check('world-readable sessions rejected',f);
}finally{fs.rmSync(dir,{recursive:true,force:true})}
