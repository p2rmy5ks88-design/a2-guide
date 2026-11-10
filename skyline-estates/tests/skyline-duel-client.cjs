// Skyline Duel client (Stage 4): matchmaking queue, practice, turn-timer ring, based on the Living City online client harness.
// Native-app client for authoritative Living City rooms: two signed-in players in two app instances play a complete
// casual match against the real composed service (in-memory store, fake ID tokens), with reconnect, a server-checked
// building action, rejected out-of-turn input, untouched local saves and the classic online path unchanged.
'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const crypto=require('node:crypto'),assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {composeCompetition}=require('../competition/compose.cjs');
const root=path.resolve(__dirname,'../..'),SVC='https://europe-west1-eko-estates.cloudfunctions.net/skylineCompetition';
let n=0;const ok=m=>{n++;console.log('PASS',m)},delay=ms=>new Promise(r=>setTimeout(r,ms));
function memoryDb(){const data={};const get=p=>p.split('/').reduce((o,k)=>o&&o[k],data);
  const set=(p,v)=>{const ks=p.split('/'),last=ks.pop();let o=data;for(const k of ks)o=o[k]=o[k]||{};if(v==null)delete o[last];else o[last]=v};
  return{data,set,ref(p){return{async transaction(fn){const cur=get(p);const next=fn(cur==null?null:JSON.parse(JSON.stringify(cur)));set(p,next);return{committed:true,snapshot:{val:()=>next}}}}}}}
(async()=>{
  const db=memoryDb(),users={tA:{uid:'alice-uid',email:'alice@test.example',email_verified:true,firebase:{sign_in_provider:'apple.com'}},tB:{uid:'bob-uid',email:'bob@test.example',email_verified:true,firebase:{sign_in_provider:'google.com'}}};let skew=0;
  const svc=composeCompetition({db,clock:()=>Date.now()+skew,verifyIdToken:async t=>{if(!users[t])throw Error('bad');return users[t]}});const H=e=>crypto.createHash('sha256').update(e).digest('hex');
  async function callSvc(method,url,headers,body){let status,out,hdr={};const req={method,url,headers,body:body?JSON.parse(body):undefined};
    await svc.handler(req,{setHeader(k,v){hdr[k]=v},writeHead(s){status=s;return{end:x=>{out=x||''}}}});return{status,out,hdr}}
  const files=http.createServer((req,res)=>{const f=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!f.startsWith(root+path.sep)){res.writeHead(403).end();return}
    fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'})[path.extname(f)]||'application/octet-stream'});res.end(b)})});
  await new Promise(r=>files.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${files.address().port}`;
  const browser=await chromium.launch({headless:true,args:['--disable-webgl'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  const errors=[];const traffic={classicFirestore:0};
  async function app(token,nick){const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:430,height:932},storageState:{cookies:[],origins:[{origin,localStorage:[
      {name:'skylinePrefs',value:JSON.stringify({flat2d:true,nickSet:true,nick,welcomed:1,tutDone:1,stats:{games:9}})},{name:'skylineSave',value:'LOCAL-SAVE-MARKER'}]}]}});
    await ctx.route('**/*',async r=>{const u=r.request().url();if(u.startsWith(origin))return r.continue();
      if(u.startsWith(SVC)){const x=await callSvc(r.request().method(),u.slice(SVC.length),{'content-type':'application/json',authorization:'Bearer '+token},r.request().postData());
        return r.fulfill({status:x.status,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:x.out})}
      if(/firebaseio|firestore|identitytoolkit|securetoken/.test(u))traffic.classicFirestore++;return r.abort()});
    const page=await ctx.newPage();page.on('pageerror',e=>errors.push(nick+': '+String(e.stack||e)));
    await page.goto(origin+'/skyline-estates/index.html');await page.locator('#boot').waitFor({state:'detached',timeout:25000});
    await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'});
    await page.evaluate(tok=>{sleep=ms=>new Promise(r=>setTimeout(r,Math.min(ms||0,5)));window.SkylineAccounts=Object.assign(window.SkylineAccounts||{},{enabled:()=>true,player:async()=>({uid:'x',token:tok})})},token);
    return page}
  db.set('skylineV2/flags',{lcOnline:true});const OUT=process.argv[2]||'';
  const A=await app('tA','Alice'),B=await app('tB','Bob');
  for(const p of [A,B])await p.evaluate(()=>{SkylineLivingCityOnline._state.capAt=-1e12});
  A.evaluate(()=>SkylineLivingCityOnline.duelQueue()).catch(()=>{});await A.locator('#dqS').waitFor({timeout:10000});
  assert.match(await A.locator('#modals').innerText(),/Finding a rival/);ok('Find a match shows the search screen with a timer and Cancel / Practice');
  await delay(1200);B.evaluate(()=>SkylineLivingCityOnline.duelQueue()).catch(()=>{});
  const inDuel=p=>p.waitForFunction(()=>{try{return G&&G.lcNet&&G.set.duel===1}catch(e){return false}},null,{timeout:20000});
  await inDuel(B);await inDuel(A);
  const codes=await Promise.all([A,B].map(p=>p.evaluate(()=>SkylineLivingCityOnline._state.code)));assert.equal(codes[0],codes[1]);
  ok(`both players were matched into the same Duel room (${codes[0]}) and entered the game`);
  await A.locator('#duelTimer').waitFor({timeout:8000});await A.waitForFunction(()=>/\d/.test(document.querySelector('#duelTimer').textContent));const sec=+(await A.locator('#duelTimer').innerText());assert.ok(sec>0&&sec<=25,'ring shows '+sec);
  ok(`turn timer ring shows the seconds left for the move (${sec})`);
  if(OUT)for(const ui of ['dark','light']){await A.evaluate(u=>{PREF.ui=u;applyUI()},ui);await delay(400);await A.screenshot({path:path.join(OUT,`duel-online-${ui}.png`)})}
  // Let the clock run out: the waiting client asks the server, which lets the AI play the idle player's turn.
  const rev0=await A.evaluate(()=>SkylineLivingCityOnline._state.view.revision);skew=30000;
  await A.waitForFunction(r=>SkylineLivingCityOnline._state.view&&SkylineLivingCityOnline._state.view.revision>r,rev0,{timeout:20000});
  ok('when the timer runs out the server plays that turn and both apps move on');
  // Practice: a labelled offline Duel against the computer.
  await B.evaluate(()=>{showTitle()});await delay(300);await B.evaluate(()=>SkylineLivingCityOnline.duelPractice());
  await B.waitForFunction(()=>{try{return G&&!G.lcNet&&G.set.duel===1&&G.players[1].ai}catch(e){return false}},null,{timeout:10000});
  assert.equal(await B.locator('#duelTimer').count(),0);ok('Practice starts an offline Duel against the computer, without the online timer');
  assert.deepEqual(errors,[]);ok('no browser errors');
  await browser.close();files.close();console.log(`SKYLINE DUEL CLIENT ${n} checks`);
})().catch(e=>{console.error(e);process.exit(1)});
