// Home screen redesign: every control reaches the existing screen or action, values come from real
// game state, the bottom dock replaces the side rail, and nothing overlaps at desktop or phone sizes.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');let checks=0;const check=(name,ok,detail)=>{assert.ok(ok,name+(detail!==undefined?' '+JSON.stringify(detail):''));checks++;console.log('PASS',name)};
const types={'.html':'text/html','.js':'text/javascript','.jpg':'image/jpeg','.png':'image/png','.json':'application/json','.woff2':'font/woff2','.mp3':'audio/mpeg','.glb':'model/gltf-binary','.webmanifest':'application/manifest+json'};
(async()=>{
 const server=http.createServer((q,r)=>{const f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(!f.startsWith(root)){r.writeHead(403);return r.end()}fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end()}r.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'});r.end(d)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port+'/skyline-estates/index.html';
 const browser=await chromium.launch({headless:true,args:['--disable-webgl'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});const errors=[];
 async function open(viewport,prefs){const ctx=await browser.newContext({viewport,hasTouch:viewport.width<1000,serviceWorkers:'block'}),page=await ctx.newPage();page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(p=>{if(!localStorage.getItem('skylinePrefs'))localStorage.setItem('skylinePrefs',JSON.stringify(p))},{nick:'PowerLi',nickSet:true,welcomed:1,tutDone:1,coach:{pre:1,post:1},flat2d:true,rig:false,riders:false,coins:4205,xp:5200,trophies:22,...prefs});
  await page.route('https://**/*',r=>r.abort());await page.goto(url);await page.waitForFunction(()=>!document.getElementById('boot')&&document.querySelector('#title .hd-stage'),null,{timeout:20000});return{ctx,page}}
 const home=async page=>{await page.evaluate(()=>homeTab('play'));await page.waitForSelector('#title .hd-stage')};
 const tab=page=>page.evaluate(()=>setup.tab);

 let {ctx,page}=await open({width:1920,height:1080});
 const st=await page.evaluate(()=>({name:document.querySelector('#tbWho .ri b')?.childNodes[0]?.textContent.trim(),lvl:document.querySelector('#tbWho .ri b small')?.textContent,want:`Level ${lvlOf(PREF.xp)} ${rankOf(lvlOf(PREF.xp))}`,coins:document.querySelector('#tbCoins')?.textContent.replace(/\D/g,''),pc:String(Math.round(PREF.coins)),league:document.querySelector('#tbLeague')?.textContent,tr:PREF.trophies,
  city:document.querySelector('.hd-city h1')?.textContent,eyebrow:document.querySelector('.hd-city small')?.textContent,blurb:document.querySelector('.hd-city p')?.textContent,cityWant:CITY_DATA[setup.city].name,
  aw:document.querySelector('#hdAwards b')?.textContent,awWant:`${cityDone(setup.city)} / ${CT.length}`,season:document.querySelector('#qSeason b')?.textContent,seasonWant:seasonName(season().n),spot:!!document.querySelector('#hdSpot'),spotWant:!!spotNow(),
  dock:[...document.querySelectorAll('.hd-di')].map(b=>b.textContent.trim()),on:document.querySelector('.hd-di.on')?.textContent.trim(),rail:getComputedStyle(document.querySelector('#title .rail')).position,gems:/gem|💎/i.test(document.querySelector('#rprof').innerHTML)}));
 check('header shows the saved player name and real level',st.name==='PowerLi'&&st.lvl===st.want,st);
 check('coin and league pills show real balances (no invented currency)',st.coins===st.pc&&st.league.includes(String(st.tr))&&!st.gems,st);
 check('city block, awards and season come from game state',st.city===st.cityWant&&/City 1 of \d+/.test(st.eyebrow)&&st.blurb.length>0&&st.aw===st.awWant&&st.season===st.seasonWant,st);
 check('City Spotlight panel matches the live spotlight',st.spot===st.spotWant,st);
 check('bottom dock replaces the side rail, six items in the approved order, City selected',st.rail==='absolute'&&JSON.stringify(st.dock)===JSON.stringify(['City','Portfolio','Collection','Shop','Awards','Progress'])&&st.on==='City',st);

 // Live game state: change the real values and confirm the home screen follows them (nothing is hardcoded).
 const live=await page.evaluate(()=>{const sp=spotNow();PREF.coins+=777;PREF.trophies+=5;PREF.xp=xpFor(lvlOf(PREF.xp)+2);cach(setup.city)[CT[0].id||CT[0][0]||'t0']=1;if(sp)spotFlags()[sp.id+'.m.test']=1;savePref();homeTab('play');
  const lv=lvlOf(PREF.xp);return{coins:document.querySelector('#tbCoins').textContent.replace(/\D/g,'')===String(Math.round(PREF.coins)),league:document.querySelector('#tbLeague').textContent.includes(String(PREF.trophies)),
   level:document.querySelector('#tbWho .ri b small').textContent===`Level ${lv} ${rankOf(lv)}`,awards:document.querySelector('#hdAwards b').textContent===`${cityDone(setup.city)} / ${CT.length}`&&cityDone(setup.city)>=1,
   spot:!sp||document.querySelector('#hdSpot').textContent.includes(`${Math.min(SPOT_GOAL,spotCount(sp.id))} / ${SPOT_GOAL}`)}});
 check('header, awards and Spotlight follow live game state after it changes',Object.values(live).every(Boolean),live);
 for(const [label,want] of [['Portfolio','portfolio'],['Collection','collection'],['Shop','shop'],['Awards','ach'],['Progress','progress'],['City','play']]){
  // Collection auto-hides the dock behind its accessible Menu handle; reveal it first.
  if(!await page.locator('.hd-di',{hasText:label}).isVisible())await page.locator('.collection-nav-handle').click();
  await page.locator('.hd-di',{hasText:label}).click();await page.waitForTimeout(150);const t=await tab(page),sec=await page.evaluate(()=>SEC_OF[setup.tab]||setup.tab),on=await page.evaluate(()=>document.querySelector('.hd-di.on')?.textContent.trim());
  const ok=want==='ach'?t==='ach':want==='progress'?sec==='progress'&&t!=='ach':sec===want;
  check(`dock ${label} opens the existing ${want} section (${t}) and stays highlighted`,ok&&on===label,{t,sec,on})}
 for(const [sel,want] of [['#pCity','world'],['#qSeason','season'],['#hdAwards','ach'],['#qCustom','custom'],['#hdGear','settings']]){
  await home(page);await page.click(sel);await page.waitForTimeout(150);check(`${sel} opens ${want}`,await tab(page)===want)}
 if(st.spotWant){await home(page);await page.click('#hdSpot');check('City Spotlight opens the spotlight screen',await tab(page)==='spotlight')}
 await home(page);await page.click('#qPP');const pp=await page.evaluate(()=>({t:setup.tab,h:setup.slots.filter(s=>s.type==='human').length}));check('Pass & Play opens custom setup with two human seats',pp.t==='custom'&&pp.h>=2,pp);
 await home(page);await page.evaluate(()=>{window.__online=0;openOnline=()=>{window.__online++}});await page.click('#tOnline');check('Play Online calls the existing online flow',await page.evaluate(()=>window.__online)===1);
 await home(page);await page.evaluate(()=>{window.__solo=null;const real=startFromSetup;startFromSetup=(T,slots)=>{window.__solo=slots.map(s=>s.type)}});await page.click('#qAI');
 const solo=await page.evaluate(()=>window.__solo);check('Play Solo starts the existing solo flow (you plus AI opponents)',Array.isArray(solo)&&solo[0]==='human'&&solo.slice(1).includes('ai'),solo);
 // City switch updates text and artwork.
 const other=await page.evaluate(()=>{const k=CITY_ORDER.find(c=>c!=='lagos'&&cityUnlocked(c));if(!k)return null;setup.city=k;homeTab('play');return{k,name:CITY_DATA[k].name}});
 if(other){const now=await page.evaluate(()=>({h:document.querySelector('.hd-city h1').textContent,bg:document.querySelector('.hd-bg .hd-photo').getAttribute('style')}));check('changing city updates the name and background artwork',now.h===other.name&&now.bg.includes(other.k),{other,now})}
 await page.evaluate(()=>{setup.city='lagos';homeTab('play')});
 // Other sections keep their screens and gain the dock.
 for(const k of ['portfolio','shop','season','settings']){await page.evaluate(k=>homeTab(k),k);await page.waitForTimeout(200);const s=await page.evaluate(()=>({dock:document.querySelectorAll('.hd-di').length,stage:!!document.querySelector('.hd-stage'),pane:document.querySelector('#pane').children.length,dockBox:document.querySelector('#title .rail').getBoundingClientRect().top,paneBottom:document.querySelector('#pane').getBoundingClientRect().bottom,handle:(()=>{const h=document.querySelector('.collection-nav-handle');if(!h)return null;const r=h.getBoundingClientRect();return r.width>=44&&r.height>=40&&getComputedStyle(h).display!=='none'})()}));
  // Collection categories auto-hide the dock behind a visible Menu handle (owner request).
  if(k==='cast')check(`${k} hides the dock behind a visible, touch-sized Menu handle`,s.dock===6&&!s.stage&&s.pane>0&&s.handle===true,s);
  else check(`${k} keeps its own screen above the dock`,s.dock===6&&!s.stage&&s.pane>0&&s.paneBottom<=s.dockBox+1,s)}
 await ctx.close();

 // A saved game shows Continue.
 ({ctx,page}=await open({width:1280,height:720}));const cont=await page.evaluate(()=>{const g=loadSave();return !!g===!!document.querySelector('#tCont')});check('Continue appears exactly when a saved game exists',cont);await ctx.close();

 // Layout: no overlap between key boxes, all inside the viewport, touch targets at phone size.
 for(const vp of [{width:1920,height:1080},{width:1280,height:720},{width:1024,height:768},{width:844,height:390},{width:667,height:375}]){({ctx,page}=await open(vp));
  await page.evaluate(()=>{if(!loadSave()){const g={round:3,set:{city:'lagos'}};window.loadSave=()=>g}homeTab('play')});
  const L=await page.evaluate(()=>{const R=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return{s,x:r.left,y:r.top,r:r.right,b:r.bottom}};
   const boxes=['#tCont','#tbWho','#tbCoins','#tbLeague','#hdGear','.hd-city','#hdSpot','.hd-modes','#hdAwards','#pCity','#qSeason','#title .rail'].map(R).filter(Boolean);
   const hit=(a,b)=>a.x<b.r-1&&b.x<a.r-1&&a.y<b.b-1&&b.y<a.b-1,over=[];for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)if(hit(boxes[i],boxes[j]))over.push(boxes[i].s+' × '+boxes[j].s);
   const out=boxes.filter(b=>b.x<-1||b.y<-1||b.r>innerWidth+1||b.b>innerHeight+1).map(b=>b.s);
   const small=[...document.querySelectorAll('.hd-mode,.hd-di,#pCity,#hdAwards,#qSeason,#hdSpot')].map(e=>e.getBoundingClientRect()).filter(r=>r.height<40||r.width<40).length;
   return{over,out,small}});
  check(`layout ${vp.width}×${vp.height}: no overlaps, inside the screen, touch targets ≥ 40 px`,!L.over.length&&!L.out.length&&!L.small,L);await ctx.close()}
 check('no page errors',errors.length===0,errors);
 console.log('HOME REDESIGN SUMMARY',JSON.stringify({checks}));await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
