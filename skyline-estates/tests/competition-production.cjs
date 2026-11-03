'use strict';
// Explicit production acceptance only. Fresh release-test guest identities stay
// private; credentials live in a mode-0600 Cloud Shell temp file, never reports.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {settings}=require('../competition/service.cjs');
if(process.env.COMPETITION_PRODUCTION_ACCEPT!=='1'){console.log('Production acceptance requires explicit operator opt-in');process.exit(0)}
const BASE='https://europe-west1-eko-estates.cloudfunctions.net/skylineCompetition',DB='https://eko-estates-default-rtdb.europe-west1.firebasedatabase.app';
const configFile=path.resolve(__dirname,'../../eko-estates/firebase-config.js'),configSource=fs.existsSync(configFile)?fs.readFileSync(configFile,'utf8'):require('node:child_process').execFileSync('git',['show','HEAD:eko-estates/firebase-config.js'],{cwd:path.resolve(__dirname,'../..'),encoding:'utf8'});const KEY=/apiKey:\s*"([^"]+)"/.exec(configSource)?.[1];if(!KEY)throw Error('Public Firebase web configuration missing');
const privateFile=path.join(os.tmpdir(),'skyline-competition-acceptance-private.json'),out=process.env.RUNNER_TEMP||path.resolve(__dirname,'../test-results');
const report={production:true,started:new Date().toISOString(),checks:[],matches:[],physicalIPhone:false};let state={version:1,accounts:[],matches:{}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let lastMutation=0;
const check=(n,v)=>{assert.ok(v,n);report.checks.push(n);console.log('PASS production',n)};
function save(){fs.writeFileSync(privateFile,JSON.stringify(state),{mode:0o600});fs.chmodSync(privateFile,0o600)}
async function token(account){if(Date.now()<(account.expires||0)-60000)return account.idToken;const r=await fetch('https://securetoken.googleapis.com/v1/token?key='+KEY,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:account.refreshToken})});const v=await r.json();if(!r.ok)throw Error('Release-test session refresh failed');Object.assign(account,{idToken:v.id_token,refreshToken:v.refresh_token,expires:Date.now()+Number(v.expires_in)*1000});save();return account.idToken}
async function call(route,account,body,{expected=200,origin,mutate=false}={}){if(mutate){const wait=2600-(Date.now()-lastMutation);if(wait>0)await sleep(wait);lastMutation=Date.now()}
 const headers={'Content-Type':'application/json',...(account?{Authorization:'Bearer '+await token(account)}:{}),...(origin?{Origin:origin}:{})};let r;
 for(let attempt=0;attempt<4;attempt++){r=await fetch(BASE+route,{method:body===undefined?'GET':'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000),headers,...(body===undefined?{}:{body:JSON.stringify(body)})});if(expected===200&&[429,503].includes(r.status)&&attempt<3){await r.text();await sleep(65000);continue}break}
 const raw=await r.text();let v;try{v=JSON.parse(raw)}catch{v={}}if(r.status!==expected)throw Error('Acceptance '+route+' caller '+state.accounts.indexOf(account)+': HTTP '+r.status+' '+(v.error||'non-JSON response'));return v;
}
const req=()=> 'release-'+crypto.randomUUID();
const profile=(account,publish=false)=>call('/v1/competition/profile',account,{publish,shareName:publish,community:process.env.COMPETITION_COMMUNITY_ACCEPT==='1',name:account===state.accounts[0]?'Release QA 1':'Release QA 2'},{mutate:true});
(async()=>{
 const cap=await call('/v1/competition/capabilities');check('public capability endpoint is the isolated service',cap.protocol===1&&cap.verified&&cap.version===1&&cap.categories.length===5);
 await call('/v1/competition/me',null,{}, {expected:401});check('unauthenticated personal data denied',true);
 await call('/v1/competition/me',null,{}, {expected:403,origin:'https://untrusted.invalid'});check('foreign origin denied',true);
 if(fs.existsSync(privateFile)){state=JSON.parse(fs.readFileSync(privateFile,'utf8'));if(state.version!==1||state.accounts.length>2)throw Error('Invalid private acceptance cache')}
 while(state.accounts.length<2){const r=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key='+KEY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({returnSecureToken:true})});const v=await r.json();if(!r.ok)throw Error('Release-test guest sign-in failed');state.accounts.push({uid:v.localId,idToken:v.idToken,refreshToken:v.refreshToken,expires:Date.now()+Number(v.expiresIn)*1000});save()}
 for(const a of state.accounts)await profile(a,false);check('two real Firebase test sessions are private',true);
 const dbRead=await fetch(DB+'/skylineV2.json?auth='+encodeURIComponent(await token(state.accounts[0])));check('valid guest cannot read protected database directly',[401,403].includes(dbRead.status));await dbRead.text();
 const dbWrite=await fetch(DB+'/skylineV2/competitionAcceptanceProbe/'+state.accounts[0].uid+'.json?auth='+encodeURIComponent(await token(state.accounts[0])),{method:'PUT',headers:{'Content-Type':'application/json'},body:'{"releaseProbe":true}'});check('valid guest cannot write protected database directly',[401,403].includes(dbWrite.status));await dbWrite.text();
 await call('/v2/rooms/create',state.accounts[0],{requestId:req(),name:'Release QA 1',settings:{...settings('lagos'),perks:true}},{expected:400,mutate:true});check('advantaged setup rejected by live service',true);
 const cities=(process.env.COMPETITION_CITIES||'lagos,stockholm').split(',');
 for(const city of cities){const bridgeBefore=await call('/v1/competition/community',state.accounts[0],{});const [host,guest]=state.accounts;let match=state.matches[city];if(match){try{await call('/v2/game/lobby',host,{code:match.code})}catch(e){if(!e.message.includes('HTTP 403'))throw e;match=null}}if(!match){const created=await call('/v2/rooms/create',host,{requestId:req(),name:'Release QA 1',settings:settings(city)},{mutate:true});match=state.matches[city]={code:created.code,invite:created.invite,joined:false};save()}
  if(!match.joined){await call('/v2/game/lobby',guest,{code:match.code},{expected:403});check(city+': nonmember denied',true);const join={requestId:req(),code:match.code,invite:match.invite,name:'Release QA 2'};await call('/v2/rooms/join',guest,join,{mutate:true});await call('/v2/rooms/join',guest,join,{mutate:true});match.joined=true;save();check(city+': repeated join receipt recovers safely',true)}
  const lobby=await call('/v2/game/lobby',host,{code:match.code});if(lobby.status==='lobby'){const start={requestId:req(),code:match.code,revision:lobby.revision};const first=await call('/v2/game/start',host,start,{mutate:true}),again=await call('/v2/game/start',host,start,{mutate:true});check(city+': start replay keeps one revision',first.revision===again.revision)}
  let view,operations=0,rolls=0;
  for(;operations<1500;operations++){view=await call('/v2/game/read',host,{code:match.code});if(view.status==='over')break;const actor=state.accounts[view.actorSeat];view=await call('/v2/game/read',actor,{code:match.code});const b={requestId:req(),code:match.code,revision:view.revision},d=view.decision,post=(route,body)=>call('/v2/game/'+route,actor,body,{mutate:true});
   if(view.stage==='pre'){const p=await post('roll/reserve',b);await post('roll/commit',{...b,requestId:req(),planId:p.planId});rolls++}
   else if(view.stage==='post')await post('end',b);
   else if(view.stage==='purchase')await post('choice',{...b,kind:d.canBuy&&view.game.players[view.seat].cash-d.price>=350?'buy':'decline'});
   else if(view.stage==='card')await post('choice',{...b,kind:'drawCard'});
   else if(view.stage==='jail'){if(d.passes)await post('choice',{...b,kind:'useBailPass'});else if(d.canPay)await post('choice',{...b,kind:'payBail'});else{const p=await post('jail-roll/reserve',b);await post('jail-roll/commit',{...b,requestId:req(),planId:p.planId});rolls++}}
   else if(view.stage==='auction'){if(!Number.isInteger(d.seat))await post('choice',{...b,kind:'startAuction'});else await post('auction-bid',{...b,amount:0})}
   else if(view.stage==='debt'){const square=view.game.own.findIndex(o=>o.o===view.seat&&!o.m&&o.h===0);await post('debt',{...b,kind:view.game.players[view.seat].cash>=d.amount?'pay':square>=0?'mortgage':'bankrupt',...(view.game.players[view.seat].cash<d.amount&&square>=0?{square}:{})})}
   else throw Error('Unimplemented production acceptance stage '+view.stage);
   if(operations%10===0)console.log('Production match progress',city,view.game.round,operations);
  }
  check(city+': real server-controlled match finishes',view.status==='over'&&view.game.round>=5);
  await call('/v1/competition/ingest',host,{code:match.code,revision:view.revision,score:999999},{expected:400});check(city+': arbitrary browser score rejected',true);
  const result=await call('/v1/competition/ingest',host,{code:match.code,revision:view.revision},{mutate:true});const duplicate=await call('/v1/competition/ingest',guest,{code:match.code,revision:view.revision},{mutate:true});check(city+': completed result accepted and duplicate rejected',result.protocol===1&&duplicate.duplicate===true);
  if(process.env.COMPETITION_COMMUNITY_ACCEPT==='1'){const bridgeAfter=await call('/v1/competition/community',host,{});check(city+': real opt-in contributions credit each participant exactly once',bridgeAfter.total===bridgeBefore.total+2);report.communityDelta=bridgeAfter.total-bridgeBefore.total}
  const final=await call('/v2/game/result',host,{code:match.code,revision:view.revision});check(city+': authenticated result has real standings',final.result.standings.length===2);report.matches.push({city,round:view.game.round,operations,rolls,reason:final.result.reason,standings:final.result.standings.map(p=>({rank:p.rank,netWorth:p.netWorth,cash:p.cash,bankrupt:p.bankrupt}))});
  // Briefly publish clearly named real QA results to exercise ordering/opt-out;
  // these are actual completed matches, never fabricated scores or identities.
  try{for(const a of state.accounts)await profile(a,true);for(const category of cap.categories){const r=await call('/v1/competition/rankings',host,{category,city:category==='city'?city:null});check(city+': '+category+' live ranking contract/order',r.verified&&r.rows.every((x,i)=>x.rank===i+1&&(i===0||x.score<=r.rows[i-1].score)))}
  }finally{for(const a of state.accounts)await profile(a,false)}
  const privateRows=await call('/v1/competition/rankings',host,{category:'worth',city:null});check(city+': opt-out hides the test profile',privateRows.myPosition===null);
 }
 const bridge=await call('/v1/competition/community',state.accounts[0],{});check('live community endpoint reports authoritative unseeded data',bridge.verified&&Number.isSafeInteger(bridge.total)&&bridge.total>=0&&bridge.contributed===(process.env.COMPETITION_COMMUNITY_ACCEPT==='1'?1:0));await call('/v1/competition/project/claim',state.accounts[0],{}, {expected:409});check('unearned community badge denied',true);
 report.community={total:bridge.total,goal:bridge.goal,testContributions:process.env.COMPETITION_COMMUNITY_ACCEPT==='1'?2:0};report.completed=new Date().toISOString();
})().catch(e=>{report.failure=String(e.message||'Acceptance failure').replace(/eyJ[A-Za-z0-9_.-]+/g,'[redacted token]');console.error(report.failure);process.exitCode=1}).finally(()=>{fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'skyline-competition-production.json'),JSON.stringify(report,null,2));console.log('PRODUCTION ACCEPTANCE',report.checks.length,'checks',report.matches.length,'matches')});
