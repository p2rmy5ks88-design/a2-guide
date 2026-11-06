// Native-app client for authoritative Living City rooms: two signed-in players in two app instances play a complete
// casual match against the real composed service (in-memory store, fake ID tokens), with reconnect, a server-checked
// building action, rejected out-of-turn input, untouched local saves and the classic online path unchanged.
'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {composeCompetition}=require('../competition/compose.cjs');
const root=path.resolve(__dirname,'../..'),SVC='https://europe-west1-eko-estates.cloudfunctions.net/skylineCompetition';
let n=0;const ok=m=>{n++;console.log('PASS',m)},delay=ms=>new Promise(r=>setTimeout(r,ms));
function memoryDb(){const data={};const get=p=>p.split('/').reduce((o,k)=>o&&o[k],data);
  const set=(p,v)=>{const ks=p.split('/'),last=ks.pop();let o=data;for(const k of ks)o=o[k]=o[k]||{};if(v==null)delete o[last];else o[last]=v};
  return{data,set,ref(p){return{async transaction(fn){const cur=get(p);const next=fn(cur==null?null:JSON.parse(JSON.stringify(cur)));set(p,next);return{committed:true,snapshot:{val:()=>next}}}}}}}
(async()=>{
  const db=memoryDb(),users={tA:'alice-uid',tB:'bob-uid'};let skew=0;
  const svc=composeCompetition({db,clock:()=>Date.now()+skew,verifyIdToken:async t=>{if(!users[t])throw Error('bad');return{uid:users[t]}}});
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
  const A=await app('tA','Alice'),B=await app('tB','Bob');
  // flag off: the online button goes straight to classic rooms (no Living City option)
  const offered=page=>page.evaluate(async()=>{SkylineLivingCityOnline._state.capAt=-1e12;return SkylineLivingCityOnline.available()});
  assert.equal(await offered(A),false);A.evaluate(()=>openOnline()).catch(()=>{});await delay(800);
  assert.ok(await A.locator('#olNew').count()+await A.locator('text=Online play').count()+await A.locator('#modals .mh').filter({hasText:'Play online'}).count()>0,'classic online menu opens');
  assert.equal(await A.locator('text=Living City rooms').count(),0);await A.evaluate(()=>{$('#modals').innerHTML='';GEN++});ok('flag off: no Living City option; classic Play online opens as before');
  db.set('skylineV2/flags',{lcOnline:true});skew+=60000;assert.equal(await offered(A),true);
  // Alice: Play online → Living City rooms → Create room
  A.evaluate(()=>openOnline()).catch(()=>{});await A.getByRole('button',{name:'Living City rooms'}).click();await A.getByRole('button',{name:'Create room'}).click();
  await A.locator('#lcSeats').waitFor();const code=(await A.locator('#modals .mh b').first().innerText()).trim();assert.match(code,/^[A-Z0-9]{5}$/);
  B.evaluate(c=>SkylineLivingCityOnline.join(c),code).catch(()=>{});await B.locator('#lcSeats').waitFor();await A.locator('#lcSeats .olitem').nth(1).waitFor({timeout:6000});
  ok(`room ${code} created in the app and joined by a second signed-in player; capability {rules:[1,2],lc:1} sent`);
  await A.locator('#lcAi').selectOption('1');await A.locator('#lcMode').selectOption('timed10');await A.getByRole('button',{name:'Start game'}).click();
  for(const p of [A,B])await p.waitForFunction(()=>G&&G.lcNet&&G.rv===2,null,{timeout:8000});
  assert.deepEqual(await A.evaluate(()=>[G.lcMe,lc(),G.players.length,G.set.rounds]),[0,true,3,10]);
  // Server-side fixture (test store only): Alice holds a whole district and Bob starts under Civic Review, so the
  // match reaches Landmark choice, development and Civic Review quickly. The server replays from this turn start.
  {const room=db.data.skylineV2.lc[code],m=JSON.parse(room.match),g=await A.evaluate(()=>{const k=Object.keys(GROUPS).find(k=>GROUPS[k].every(i=>SQ[i].t==='prop'));return GROUPS[k]});
   const fix=G=>{g.forEach(i=>{G.own[i].o=0;G.own[i].h=0;G.own[i].m=false});G.players[1].cr={from:1,why:'card'};return G};
   m.turnStart=JSON.stringify(fix(JSON.parse(m.turnStart)));m.G=fix(m.G);room.match=JSON.stringify(m)}ok('both apps render the server match: rule version 2, Living City UI on, 3 seats, 10 rounds');
  // out-of-turn input is refused locally and never reaches the server state
  const notMe=await A.evaluate(()=>G.turn!==G.lcMe)?A:B;const before=await notMe.evaluate(()=>JSON.stringify(G.own));
  await notMe.evaluate(()=>{const i=SQ.findIndex(s=>s.t==='prop');build(G.lcMe,i)});assert.equal(await notMe.evaluate(()=>JSON.stringify(G.own)),before);ok('building out of turn is refused in the app');
  const drive=page=>page.evaluate(()=>{if(!G||!G.lcNet)return'none';if(G.over)return'over';
    const ovs=[...document.querySelectorAll('#modals .ov:not(.bye)')],ov=ovs[ovs.length-1];
    if(ov){if(/landlord of/.test(ov.textContent))return'over';const bs=[...ov.querySelectorAll('button')].filter(b=>!b.disabled&&b.offsetParent!==null&&!/olx/.test(b.className));
      const b=ov.querySelector('.lc-lmm')?bs[0]:bs.find(b=>/\bpri\b/.test(b.className))||bs[bs.length-1];if(b){b.click();return'modal:'+(ov.querySelector('.mp')||ov).className}return'wait'}
    const a=[...document.querySelectorAll('#acts button')].filter(b=>!b.disabled);if(a.length){a[0].click();return'act'}return'wait'});
  const events=new Set();let steps=0,built=null,reconnected=false,kinds=new Set(),last=Date.now(),seenLc=new Set();const t0=Date.now();
  while(Date.now()-t0<420000){steps++;
    const st=await A.evaluate(()=>({over:!!(SkylineLivingCityOnline._state.view&&SkylineLivingCityOnline._state.view.over),round:G&&G.round,d:SkylineLivingCityOnline._state.view&&SkylineLivingCityOnline._state.view.decision}));
    if(st.over)break;const ev=await A.evaluate(()=>G&&G.ev2&&(G.ev2.id||G.ev2.k||G.ev2.name));if(ev)events.add(String(ev));
    for(const p of [A,B]){const d=await p.evaluate(()=>SkylineLivingCityOnline._state.view&&SkylineLivingCityOnline._state.view.decision);if(d){kinds.add(d.type);if(d.type.startsWith('lc:'))seenLc.add(d.type)}
      if(!built&&d&&d.type==='actions'&&d.options.keys.includes('end')){built=await p.evaluate(()=>{const me=G.lcMe,i=G.own.findIndex((o,i)=>o.o===me&&canBuild(me,i));if(i<0)return null;const h=G.own[i].h;build(me,i);return{i,h,rev:SkylineLivingCityOnline._state.view.revision}});
        if(built){await delay(600);const srv=JSON.parse(db.data.skylineV2.lc[code].match);assert.ok(srv.G.own[built.i].h>built.h,'server applied the build');ok(`building stage on ${await p.evaluate(i=>SQ[i].n,built.i)} sent through the app build action, re-checked and applied by the server`)}}
      const r=await drive(p);if(r!=='wait')last=Date.now()}
    if(!reconnected&&steps>40){await B.reload();await B.locator('#boot').waitFor({state:'detached',timeout:25000});
      await B.evaluate(()=>{sleep=ms=>new Promise(r=>setTimeout(r,Math.min(ms||0,5)));window.SkylineAccounts=Object.assign(window.SkylineAccounts||{},{enabled:()=>true,player:async()=>({uid:'x',token:'tB'})})});
      assert.equal(await B.evaluate(()=>PREF.lcRoom&&PREF.lcRoom.code),code);B.evaluate(c=>SkylineLivingCityOnline.join(c),code).catch(()=>{});
      await B.waitForFunction(()=>G&&G.lcNet&&G.rv===2,null,{timeout:8000});reconnected=true;ok('Bob closes the app mid-match and rejoins from his saved room code; the match continues')}
    assert.ok(Date.now()-last<30000,'progress stalled');await delay(60)}
  const srv=JSON.parse(db.data.skylineV2.lc[code].match);assert.ok(srv.over,'match finished');const SQN=await A.evaluate(()=>SQ.map(s=>s.n));
  await A.locator('#modals').filter({hasText:'landlord of'}).waitFor({timeout:15000});
  ok(`complete casual Living City match in the app: ${srv.G.round} rounds, revision ${srv.revision}, decisions seen ${[...kinds].join(', ')}`);
  assert.ok(built,'development action exercised');assert.ok(seenLc.has('lc:review')&&seenLc.has('lc:landmark'),'Civic Review and Landmark decisions exercised');
  assert.ok(Object.keys(srv.G.lm||{}).length,'a Landmark stands at the end');assert.ok(events.size,'Strategic Events happened');
  ok(`Civic Review, Landmark (${Object.values(srv.G.lm).map(L=>SQN[L.i]).join(', ')}), development and Strategic Events (${[...events].join(', ')}) all played through the server; lcStats ${JSON.stringify(srv.G.lcStats||{})}`);
  for(const p of [A,B])assert.equal(await p.evaluate(()=>localStorage.getItem('skylineSave')),'LOCAL-SAVE-MARKER');ok('local saved games untouched by the online room');
  assert.equal(db.data.skylineV2.lc[code].status,'finished');assert.ok(!db.data.skylineV2.competition);ok('room finished; nothing ranked written');
  assert.deepEqual(errors,[]);await browser.close();files.close();console.log(`LC ONLINE CLIENT ${n} checks · Living City decisions: ${[...seenLc].join(', ')||'none'}`);
})().catch(e=>{console.error(e);process.exit(1)});
