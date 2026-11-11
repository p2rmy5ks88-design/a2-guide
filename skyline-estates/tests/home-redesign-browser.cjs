// Home screen (v2 "Cinematic Lagos", approved 11 Nov 2026): one gold main action (Play Solo, or Continue Match when a
// match is saved), a Game Modes panel for the other modes, one Spotlight/Season card, the bottom dock. Every control reaches
// the existing screen or action, values come from real game state, and nothing overlaps at desktop or phone sizes.
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
 const st=await page.evaluate(()=>({name:document.querySelector('#tbWho .ri b')?.childNodes[0]?.textContent.trim(),lvl:document.querySelector('#tbWho .ri b small')?.textContent,want:`Level ${lvlOf(PREF.xp)}`,coins:document.querySelector('#tbCoins')?.textContent.replace(/\D/g,''),pc:String(Math.round(PREF.coins)),leagueShown:!!document.querySelector('#tbLeague')?.offsetParent,
  city:document.querySelector('.hd-city h1')?.textContent,eyebrow:document.querySelector('.hd-city small')?.textContent,countryWant:countryOf(setup.city).name,cityWant:CITY_DATA[setup.city].name,main:document.querySelector('.hd-main b')?.textContent,saved:!!loadSave(),
  season:document.querySelector('#qSeason b')?.textContent,seasonWant:seasonName(season().n),spot:!!document.querySelector('#hdSpot'),spotWant:!!spotNow(),cards:document.querySelectorAll('.hd-card').length,awardsOnHome:!!document.querySelector('#hdAwards'),gmHidden:document.querySelector('#hdGM')?.hidden,
  dock:[...document.querySelectorAll('.hd-di')].map(b=>b.textContent.trim()),on:document.querySelector('.hd-di.on')?.textContent.trim(),rail:getComputedStyle(document.querySelector('#title .rail')).position,gems:/gem|💎/i.test(document.querySelector('#rprof').innerHTML)}));
 check('header shows the saved player name and level (rank lives in the profile)',st.name==='PowerLi'&&st.lvl===st.want,st);
 check('coin pill shows the real balance, league pill stays off the City screen (no invented currency)',st.coins===st.pc&&!st.leagueShown&&!st.gems,st);
 check('city block comes from game state: country above the city name',st.city===st.cityWant&&st.eyebrow===st.countryWant,st);
 check('one gold main action: Play Solo, or Continue Match when a match is saved',st.main===(st.saved?'Continue Match':'Play Solo'),st);
 check('one card in the lower right: the live Spotlight, otherwise the season',st.cards===1&&st.spot===st.spotWant&&(st.spot||st.season===st.seasonWant)&&!st.awardsOnHome,st);
 check('Game Modes panel starts closed',st.gmHidden===true,st);
 check('bottom dock replaces the side rail, six items in the approved order, City selected',st.rail==='absolute'&&JSON.stringify(st.dock)===JSON.stringify(['City','Portfolio','Collection','Shop','Awards','Progress'])&&st.on==='City',st);

 // Live game state: change the real values and confirm the home screen follows them (nothing is hardcoded).
 const live=await page.evaluate(()=>{const sp=spotNow();PREF.coins+=777;PREF.xp=xpFor(lvlOf(PREF.xp)+2);cach(setup.city)[CT[0].id||CT[0][0]||'t0']=1;if(sp)spotFlags()[sp.id+'.m.test']=1;savePref();homeTab('play');
  const lv=lvlOf(PREF.xp);return{coins:document.querySelector('#tbCoins').textContent.replace(/\D/g,'')===String(Math.round(PREF.coins)),
   level:document.querySelector('#tbWho .ri b small').textContent===`Level ${lv}`,
   spot:!sp||document.querySelector('#hdSpot').textContent.includes(`${Math.min(SPOT_GOAL,spotCount(sp.id))} / ${SPOT_GOAL}`)}});
 check('header and Spotlight follow live game state after it changes',Object.values(live).every(Boolean),live);
 for(const [label,want] of [['Portfolio','portfolio'],['Collection','collection'],['Shop','shop'],['Awards','ach'],['Progress','progress'],['City','play']]){
  // Collection auto-hides the dock behind its accessible Menu handle; reveal it first.
  if(!await page.locator('.hd-di',{hasText:label}).isVisible())await page.locator('.collection-nav-handle').click();
  await page.locator('.hd-di',{hasText:label}).click();await page.waitForTimeout(150);const t=await tab(page),sec=await page.evaluate(()=>SEC_OF[setup.tab]||setup.tab),on=await page.evaluate(()=>document.querySelector('.hd-di.on')?.textContent.trim());
  const ok=want==='ach'?t==='ach':want==='progress'?sec==='progress'&&t!=='ach':sec===want;
  check(`dock ${label} opens the existing ${want} section (${t}) and stays highlighted`,ok&&on===label,{t,sec,on})}
 const modes=async()=>{await page.click('#hdModes');await page.locator('#hdGM').waitFor({state:'visible'})};
 await home(page);await modes();const gm=await page.evaluate(()=>({items:[...document.querySelectorAll('#hdGM .hd-gm-item b')].map(b=>b.textContent),exp:document.querySelector('#hdModes').getAttribute('aria-expanded'),focus:document.activeElement?.classList.contains('hd-gm-item')}));
 check('Game Modes opens a panel with the full mode names and moves focus into it',gm.exp==='true'&&gm.focus&&['Pass & Play','Custom Game'].every(n=>gm.items.includes(n)),gm);
 await page.keyboard.press('Escape');check('Escape closes the panel and returns focus to Game Modes',await page.evaluate(()=>document.querySelector('#hdGM').hidden&&document.activeElement?.id==='hdModes'));
 await modes();await page.click('#hdGMx');check('the close control closes the panel',await page.evaluate(()=>document.querySelector('#hdGM').hidden));
 await modes();await page.mouse.click(5,200);check('tapping outside closes the panel',await page.evaluate(()=>document.querySelector('#hdGM').hidden));
 for(const [sel,want,inPanel] of [['#pCity','world'],['#qCustom','custom',1],['#hdGear','settings'],...(st.spotWant?[]:[['#qSeason','season']])]){
  await home(page);if(inPanel)await modes();await page.click(sel);await page.waitForTimeout(150);check(`${sel} opens ${want}`,await tab(page)===want)}
 if(st.spotWant){await home(page);await page.click('#hdSpot');check('City Spotlight opens the spotlight screen',await tab(page)==='spotlight')}
 await home(page);await modes();await page.click('#qPP');const pp=await page.evaluate(()=>({t:setup.tab,h:setup.slots.filter(s=>s.type==='human').length}));check('Pass & Play opens custom setup with two human seats',pp.t==='custom'&&pp.h>=2,pp);
 await home(page);await page.evaluate(()=>{window.__online=0;openOnline=()=>{window.__online++}});await modes();await page.click('#tOnline');check('Play Online calls the existing online flow',await page.evaluate(()=>window.__online)===1);
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

 // A saved game turns the gold action into Continue Match with mode and round; New Solo Game moves into the panel.
 ({ctx,page}=await open({width:1280,height:720}));const cont=await page.evaluate(()=>{const g=loadSave();return !!g===!!document.querySelector('#tCont')});check('Continue appears exactly when a saved game exists',cont);
 const sv=await page.evaluate(()=>{const g={round:14,set:{city:'lagos',mode:'timed',rounds:30,championship:1}};window.loadSave=()=>g;homeTab('play');return{b:document.querySelector('#tCont b')?.textContent,s:document.querySelector('#tCont small')?.textContent,solo:!!document.querySelector('#hdGM #qAI'),modes:!!document.querySelector('#hdModes')}});
 check('saved match: Continue Match shows mode and round, Game Modes stays, New Solo Game is in the panel',sv.b==='Continue Match'&&sv.s==='Championship · Round 14/30'&&sv.solo&&sv.modes,sv);
 await page.evaluate(()=>{window.__resume=0;startWith=()=>{window.__resume++}});await page.click('#tCont');check('Continue Match resumes the saved match',await page.evaluate(()=>window.__resume)===1);await ctx.close();

 // Layout: both Home states, long names and big balances; no overlap, inside the viewport, touch targets ≥ 44 px.
 const longCity=await (async()=>{({ctx,page}=await open({width:844,height:390}));const k=await page.evaluate(()=>CITY_ORDER.slice().sort((a,b)=>CITY_DATA[b].name.length-CITY_DATA[a].name.length)[0]);await ctx.close();return k})();
 for(const vp of [{width:1920,height:1080},{width:1280,height:720},{width:1024,height:768},{width:844,height:390},{width:667,height:375}])for(const variant of ['plain','saved','long']){({ctx,page}=await open(vp,variant==='long'?{nick:'Oluwaseunfemi',coins:98765432}:{}));
  await page.evaluate(([v,lc])=>{const g={round:14,set:{city:'lagos',mode:'timed',rounds:30,championship:1}};window.loadSave=()=>v==='plain'?null:g;if(v==='long'){setup.city=lc;try{PREF.trophies=99999}catch(e){}}homeTab('play')},[variant,longCity]);
  const L=await page.evaluate(()=>{const R=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return{s,x:r.left,y:r.top,r:r.right,b:r.bottom}};
   const boxes=['#tbWho','#tbSkylineCash','#tbCoins','#hdGear','.hd-city','.hd-main','#hdModes','.hd-card','#title .rail'].map(R).filter(Boolean);
   const hit=(a,b)=>a.x<b.r-1&&b.x<a.r-1&&a.y<b.b-1&&b.y<a.b-1,over=[];for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)if(hit(boxes[i],boxes[j]))over.push(boxes[i].s+' × '+boxes[j].s);
   const out=boxes.filter(b=>b.x<-1||b.y<-1||b.r>innerWidth+1||b.b>innerHeight+1).map(b=>b.s);
   const small=[...document.querySelectorAll('.hd-main,#hdModes,#pCity,.hd-card,#hdGear')].map(e=>e.getBoundingClientRect()).filter(r=>r.height<44||r.width<44).length+[...document.querySelectorAll('.hd-di')].map(e=>e.getBoundingClientRect()).filter(r=>r.height<40||r.width<40).length;
   const clip=[...document.querySelectorAll('.hd-main b,.hd-main small,.hd-gmbtn span,.hd-city h1')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.textContent);
   return{over,out,small,clip}});
  check(`layout ${vp.width}×${vp.height} (${variant}): no overlaps, inside the screen, labels not clipped, touch targets`,!L.over.length&&!L.out.length&&!L.small&&!L.clip.length,L);
  await page.click('#hdModes');const P=await page.evaluate(()=>{const g=document.querySelector('#hdGM').getBoundingClientRect(),d=document.querySelector('#title .rail').getBoundingClientRect(),items=[...document.querySelectorAll('#hdGM .hd-gm-item,#hdGMx')].map(e=>e.getBoundingClientRect());
   const hit=s=>{const e=document.querySelector(s);if(!e||!e.offsetParent)return null;const r=e.getBoundingClientRect();return g.left<r.right-1&&r.left<g.right-1&&g.top<r.bottom-1&&r.top<g.bottom-1?s:null};
   return{inside:g.left>=0&&g.top>=0&&g.right<=innerWidth&&g.bottom<=innerHeight,dock:g.bottom<=d.top+1,small:items.filter(r=>r.height<44||r.width<44).length,covers:['.hd-main','#hdModes','.hd-city','#tbWho','#tbSkylineCash','#tbCoins','#hdGear'].map(hit).filter(Boolean),cardHidden:getComputedStyle(document.querySelector('.hd-card')).visibility==='hidden'}});
  check(`Game Modes panel ${vp.width}×${vp.height} (${variant}): inside the screen, clear of the dock, buttons, title and header, touch-sized`,P.inside&&P.dock&&!P.small&&!P.covers.length&&P.cardHidden,P);await ctx.close()}
 check('no page errors',errors.length===0,errors);
 console.log('HOME REDESIGN SUMMARY',JSON.stringify({checks}));await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
