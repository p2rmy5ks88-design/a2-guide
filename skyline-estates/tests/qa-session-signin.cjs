'use strict';
// Offline test for tools/qa-session-signin.cjs against a local mock identity service.
// Proves it signs in (never signs up), writes a mode-0600 two-session file the production harness accepts,
// never prints emails, passwords or tokens, rejects the same account twice, and refuses to overwrite by accident.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http');
const {spawn}=require('node:child_process');
const tool=path.join(__dirname,'..','tools','qa-session-signin.cjs');
const USERS={'qa1@example.test':{pw:'Secret-one-111',uid:'UIDQAONE0001'},'qa2@example.test':{pw:'Secret-two-222',uid:'UIDQATWO0002'}};
const calls=[];let n=0;const ok=m=>{n++;console.log('PASS',m)};
const server=http.createServer((q,r)=>{let b='';q.on('data',d=>b+=d);q.on('end',()=>{const p=q.url.split('?')[0];calls.push(p);const j=JSON.parse(b||'{}');r.setHeader('content-type','application/json');
  if(p==='/v1/accounts:signInWithPassword'){const u=USERS[j.email];if(!u||u.pw!==j.password){r.statusCode=400;return r.end(JSON.stringify({error:{message:'INVALID_LOGIN_CREDENTIALS'}}))}
    return r.end(JSON.stringify({localId:u.uid,idToken:'IDTOKEN-'+u.uid,refreshToken:'REFRESH-'+u.uid,expiresIn:'3600'}))}
  if(p==='/v1/accounts:lookup')return r.end(JSON.stringify({users:[{emailVerified:true}]}));
  r.statusCode=404;r.end('{}')})});
function run(file,input,extra=[]){return new Promise(res=>{const c=spawn(process.execPath,[tool,file,...extra],{env:{...process.env,QA_SIGNIN_BASE:'http://127.0.0.1:'+server.address().port}});
  let out='';c.stdout.on('data',d=>out+=d);c.stderr.on('data',d=>out+=d);c.on('close',code=>res({code,out}));c.stdin.end(input.join('\n')+'\n')})}
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const dir=fs.mkdtempSync(path.join(os.tmpdir(),'qa-signin-'));
 try{
  const f=path.join(dir,'sub','sessions.json');
  const a=await run(f,['qa1@example.test','Secret-one-111','qa2@example.test','Secret-two-222']);
  assert.equal(a.code,0,a.out);
  const st=fs.statSync(f);assert.equal(st.mode&0o777,0o600);assert.equal(fs.statSync(path.dirname(f)).mode&0o777,0o700);
  const s=JSON.parse(fs.readFileSync(f,'utf8'));assert.equal(s.version,1);assert.deepEqual(s.matches,{});assert.equal(s.accounts.length,2);
  assert.ok(s.accounts.every(x=>x.uid&&x.idToken&&x.refreshToken&&Number.isFinite(x.expires)&&x.expires>Date.now()));assert.notEqual(s.accounts[0].uid,s.accounts[1].uid);
  ok('two existing accounts signed in; mode-600 file in the harness format');
  for(const secret of ['qa1@example.test','qa2@example.test','Secret-one-111','Secret-two-222','IDTOKEN-','REFRESH-','UIDQAONE0001'])assert.ok(!a.out.includes(secret),'output leaks '+secret);
  ok('no email, password, token or full user ID printed');
  assert.ok(calls.length&&calls.every(p=>p==='/v1/accounts:signInWithPassword'||p==='/v1/accounts:lookup'),'only sign-in and lookup used '+calls);
  ok('never calls sign-up (cannot create accounts)');
  const before=fs.readFileSync(f,'utf8');const b=await run(f,['qa1@example.test','Secret-one-111','qa2@example.test','Secret-two-222']);
  assert.notEqual(b.code,0);assert.match(b.out,/already exists/);assert.equal(fs.readFileSync(f,'utf8'),before);ok('refuses to overwrite without --replace');
  const g=path.join(dir,'same.json');const c=await run(g,['qa1@example.test','Secret-one-111','qa1@example.test','Secret-one-111']);
  assert.notEqual(c.code,0);assert.match(c.out,/same account/);assert.ok(!fs.existsSync(g));ok('same account twice is refused and nothing is written');
  const h=path.join(dir,'bad.json');const d=await run(h,['qa1@example.test','wrong-password']);
  assert.notEqual(d.code,0);assert.match(d.out,/not accepted/);assert.ok(!d.out.includes('wrong-password')&&!fs.existsSync(h));ok('wrong password stops safely without writing');
  const e=await run(f,['qa2@example.test','Secret-two-222','qa1@example.test','Secret-one-111'],['--replace']);assert.equal(e.code,0,e.out);assert.equal(fs.statSync(f).mode&0o777,0o600);ok('--replace signs in again and keeps mode 600');
 }finally{fs.rmSync(dir,{recursive:true,force:true});server.close()}
 console.log(`QA SESSION SIGN-IN ${n} checks`)})().catch(e=>{console.error(e);process.exit(1)});
