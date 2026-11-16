#!/usr/bin/env node
'use strict';
// Private QA sign-in for the Phase 4 competition production acceptance test.
//
// Signs in to the TWO EXISTING, approved email-and-password QA accounts and writes their Firebase sessions to a
// mode-0600 file in the operator's home directory, in the format competition-production.cjs reads through
// COMPETITION_ACCEPTANCE_SESSIONS_FILE ({version:1, accounts:[{uid,idToken,refreshToken,expires}], matches:{}}).
//
// - Uses only accounts:signInWithPassword and accounts:lookup. It never calls signUp, so it cannot create an account.
// - The operator types the emails and passwords into this terminal; passwords are not echoed. Nothing is passed on the
//   command line, so nothing lands in shell history.
// - Prints only that each account signed in, the last 4 characters of its user ID and whether its email is verified.
//   Emails, passwords and tokens are never printed or logged.
// - Refuses to overwrite an existing file unless --replace is given.
//
// Usage (Cloud Shell, repo root):
//   node skyline-estates/tools/qa-session-signin.cjs [file] [--replace]
// Default file: ~/.skyline-qa/competition-sessions.json
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),readline=require('node:readline');

const args=process.argv.slice(2),replace=args.includes('--replace');
const target=path.resolve(args.find(a=>!a.startsWith('--'))||path.join(os.homedir(),'.skyline-qa','competition-sessions.json'));
// The identity endpoint can be pointed at a local mock for the offline test only.
const BASE=process.env.QA_SIGNIN_BASE||'https://identitytoolkit.googleapis.com';

function apiKey(){
  const root=path.resolve(__dirname,'../..'),f=path.join(root,'eko-estates/firebase-config.js');
  const src=fs.existsSync(f)?fs.readFileSync(f,'utf8'):require('node:child_process').execFileSync('git',['show','HEAD:eko-estates/firebase-config.js'],{cwd:root,encoding:'utf8'});
  const k=/apiKey:\s*"([^"]+)"/.exec(src)?.[1];if(!k)throw Error('Firebase web API key not found in eko-estates/firebase-config.js');return k}

// Line reader that works for a terminal (hidden password) and for piped input (offline test).
const lines=[];let waiting=null,closed=false;
const rl=readline.createInterface({input:process.stdin,terminal:false});
rl.on('line',l=>{if(waiting){const w=waiting;waiting=null;w(l)}else lines.push(l)});
rl.on('close',()=>{closed=true;if(waiting){const w=waiting;waiting=null;w(null)}});
function ask(prompt,hidden){
  process.stderr.write(prompt);
  const tty=process.stdin.isTTY&&hidden;
  if(tty){try{require('node:child_process').execSync('stty -echo',{stdio:['inherit','ignore','ignore']})}catch(e){}}
  return new Promise(res=>{const done=v=>{if(tty){try{require('node:child_process').execSync('stty echo',{stdio:['inherit','ignore','ignore']})}catch(e){}process.stderr.write('\n')}res(v)};
    if(lines.length)done(lines.shift());else if(closed)done(null);else waiting=done})}

const SAFE={INVALID_LOGIN_CREDENTIALS:'email or password not accepted',INVALID_PASSWORD:'email or password not accepted',EMAIL_NOT_FOUND:'email or password not accepted',
  USER_DISABLED:'this account is disabled',TOO_MANY_ATTEMPTS_TRY_LATER:'too many attempts; wait and try later',PASSWORD_LOGIN_DISABLED:'email/password sign-in is disabled for this project',INVALID_EMAIL:'that is not a valid email address'};
async function post(p,body,key){const r=await fetch(BASE+'/v1/'+p+'?key='+encodeURIComponent(key),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  let v={};try{v=await r.json()}catch(e){}
  if(!r.ok){const code=String(v?.error?.message||r.status).split(' ')[0];throw Error(SAFE[code]||('sign-in refused ('+code.replace(/[^A-Z_0-9]/g,'').slice(0,40)+')'))}return v}

(async()=>{
  if(fs.existsSync(target)&&!replace)throw Error('A session file already exists there. Use --replace to sign in again and overwrite it.');
  const key=apiKey(),accounts=[];
  for(const n of [1,2]){
    const email=(await ask(`QA account ${n} email: `,false)||'').trim();
    const password=await ask(`QA account ${n} password (hidden): `,true)||'';
    if(!email||!password)throw Error('Email and password are both required');
    const v=await post('accounts:signInWithPassword',{email,password,returnSecureToken:true},key);
    if(!v.localId||!v.idToken||!v.refreshToken)throw Error('Sign-in did not return a complete session');
    if(accounts.some(a=>a.uid===v.localId))throw Error('Both entries are the same account; use the two different approved QA accounts');
    let verified='unknown';try{const l=await post('accounts:lookup',{idToken:v.idToken},key);verified=l.users?.[0]?.emailVerified?'yes':'no'}catch(e){}
    accounts.push({uid:v.localId,idToken:v.idToken,refreshToken:v.refreshToken,expires:Date.now()+Number(v.expiresIn||3600)*1000});
    console.log(`QA account ${n}: signed in (user ID …${v.localId.slice(-4)}), email verified: ${verified}`);
  }
  const dir=path.dirname(target);fs.mkdirSync(dir,{recursive:true,mode:0o700});
  const tmp=path.join(dir,'.'+path.basename(target)+'.'+process.pid+'.tmp');
  fs.writeFileSync(tmp,JSON.stringify({version:1,accounts,matches:{}}),{mode:0o600});fs.chmodSync(tmp,0o600);fs.renameSync(tmp,target);
  console.log('Saved both sessions (mode 600) to: '+target);
  console.log('Next:  export PRIVATE_QA_SESSION_FILE="'+target+'"');
})().catch(e=>{console.error('QA sign-in stopped: '+e.message);process.exitCode=1}).finally(()=>rl.close());
