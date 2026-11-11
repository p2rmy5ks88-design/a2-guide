// Tutorial and rules v2: the 4-slide tour matches today's rules (Living City and classic wording), the one-time Home
// walkthrough, first-time intros for Skyline Duel and Harbour Ring, the How to play hub, and Play Solo = Championship.
//   node tests/tutorial-v2-browser.cjs [screenshotDir]
'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),OUT=process.argv[2]||'';let n=0;const ok=m=>{n++;console.log('PASS',m)};
const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.mp3':'audio/mpeg','.woff2':'font/woff2'};
(async()=>{
  const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!f.startsWith(root)){res.writeHead(403).end();return}fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'});res.end(e?'':b)})});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
  const b=await chromium.launch({args:['--disable-webgl'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});const errs=[];
  async function open(prefs,vp={width:844,height:390}){const ctx=await b.newContext({viewport:vp,hasTouch:true,serviceWorkers:'block'});await ctx.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
    await ctx.addInitScript(v=>{if(!sessionStorage.getItem('seeded')){sessionStorage.setItem('seeded','1');localStorage.setItem('skylinePrefs',v)}},JSON.stringify({flat2d:true,nickSet:true,nick:'Ada',welcomed:1,tutDone:1,lastOpen:Date.now(),stats:{games:9},...prefs}));
    const p=await ctx.newPage();p.on('pageerror',e=>errs.push(String(e)));await p.goto(origin+'/skyline-estates/index.html');await p.locator('#boot').waitFor({state:'detached',timeout:30000});
    await p.evaluate(()=>{document.querySelectorAll('#modals .ov').forEach(x=>x.remove());homeTab('play')});return{ctx,p}}

  // Tour: 4 slides, today's rules, real art (no emoji).
  let {ctx,p}=await open({});
  await p.evaluate(()=>{openTutorial(false)});await p.locator('.tutm .ttx').waitFor();
  const slides=[];for(let i=0;i<4;i++){slides.push(await p.evaluate(()=>({step:document.querySelector('.ttx small').textContent,h:document.querySelector('.ttx h3').textContent,p:document.querySelector('.ttx p').textContent,vis:document.querySelector('.tslide').innerHTML})));
    if(OUT&&i<2){await p.waitForTimeout(600);await p.screenshot({path:path.join(OUT,`tour-${i+1}.png`)})}if(i<3)await p.click('#tNext')}
  assert.deepEqual(slides.map(s=>s.h),['How you win','Roll, buy or bid','Grow your streets','A living city']);assert.equal(slides[0].step,'STEP 1 OF 4');
  assert.match(slides[0].p,/30-round Championship/);assert.match(slides[2].p,/Landmark/);assert.match(slides[3].p,/Civic Review/);
  assert.ok(slides.every(s=>!/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(s.vis+s.p)),'no emoji');
  ok('tour: 4 slides with Championship, Landmarks and Civic Review, real art and no emoji');
  await p.click('#tSkip');
  const classic=await p.evaluate(()=>{PREF.lc=false;const s=tutSteps();PREF.lc=true;return s.map(x=>x.h+' '+x.p).join(' ')});
  assert.match(classic,/tower after four houses/);assert.match(classic,/Lockup/);ok('players with Living City off get the classic wording');
  // Play Solo starts the 30-round Championship.
  await p.evaluate(()=>{window.__set=null;const real=newGame;newGame=o=>{window.__set=o.set;throw new Error('stop')}});
  await p.evaluate(()=>{try{document.querySelector('#qAI').click()}catch(e){}});
  const set=await p.evaluate(()=>window.__set);assert.ok(set&&set.mode==='timed'&&set.rounds===30&&set.championship===1,JSON.stringify(set));ok('Play Solo starts a 30-round Championship');
  await ctx.close();

  // Home walkthrough: once, after the welcome tour, three tips pointing at the right controls.
  ({ctx,p}=await open({stats:{games:0},homeTourPending:1}));
  await p.locator('.tv2-tip').waitFor({timeout:8000});
  const tips=[];for(let i=0;i<3;i++){const t=await p.evaluate(()=>{const h=document.querySelector('.tv2-hole').getBoundingClientRect(),tip=document.querySelector('.tv2-tip').getBoundingClientRect();
      const inside=s=>{const e=[...document.querySelectorAll(s)].find(x=>x.getClientRects().length);if(!e)return false;const r=e.getBoundingClientRect();return r.left>=h.left&&r.right<=h.right&&r.top>=h.top&&r.bottom<=h.bottom};
      return{t:document.querySelector('.tv2-tip b').textContent,qAI:inside('#qAI'),modes:inside('#hdModes'),card:inside('#hdSpot,#qSeason'),tipIn:tip.left>=0&&tip.right<=innerWidth&&tip.top>=0&&tip.bottom<=innerHeight,
        overlap:!(tip.right<=h.left||tip.left>=h.right||tip.bottom<=h.top||tip.top>=h.bottom)}});tips.push(t);
    if(OUT&&i===0)await p.screenshot({path:path.join(OUT,'home-tip-1.png')});await p.click('.tv2-tip [data-t="next"]')}
  assert.ok(tips[0].qAI&&tips[1].modes&&tips[2].card,JSON.stringify(tips));assert.ok(tips.every(t=>t.tipIn&&!t.overlap),JSON.stringify(tips));
  assert.equal(await p.locator('.tv2-tour').count(),0);const st=await p.evaluate(()=>({done:!!PREF.homeTour,pending:PREF.homeTourPending}));assert.ok(st.done&&!st.pending);
  await p.evaluate(()=>homeTab('play'));await p.waitForTimeout(700);assert.equal(await p.locator('.tv2-tour').count(),0);
  ok('Home walkthrough: Play Solo, Game Modes, then the Spotlight card; tips stay on screen, never cover the target, and show once');
  await ctx.close();
  ({ctx,p}=await open({stats:{games:0}}));await p.waitForTimeout(900);assert.equal(await p.locator('.tv2-tour').count(),0);ok('no Home tips for players who have not just finished the welcome tour');await ctx.close();

  // First-time intros.
  ({ctx,p}=await open({}));
  await p.click('#hdModes');await p.click('#qRing');await p.locator('.tv2-intro').waitFor();
  assert.match(await p.locator('.tv2-intro').textContent(),/Choose your move/);if(OUT){await p.waitForTimeout(600);await p.screenshot({path:path.join(OUT,'ring-intro.png')})}
  await p.check('#tv2Never');await p.locator('.tv2-intro').getByRole('button',{name:'Play'}).click();await p.locator('#hr .hr-board').waitFor();
  await p.evaluate(()=>{HarbourRing.close()});await p.click('#hdModes');await p.click('#qRing');await p.locator('#hr .hr-board').waitFor();assert.equal(await p.locator('.tv2-intro').count(),0);
  await p.evaluate(()=>{HarbourRing.close();localStorage.removeItem('skylineRingSave')});ok('Harbour Ring intro shows first, Play starts the match, "Don\'t show this again" is remembered');
  await p.click('#hdModes');await p.click('#qDuel');await p.locator('.tv2-intro').waitFor();assert.match(await p.locator('.tv2-intro').textContent(),/No trades/);
  await p.locator('.tv2-intro').getByRole('button',{name:'Full rules'}).click();await p.waitForFunction(()=>setup.tab==='learn');
  assert.match(await p.locator('.tv2-body').textContent(),/Skyline Duel/);ok('Skyline Duel intro: Full rules opens the Duel page of How to play');
  // Rules hub.
  const hub=await p.evaluate(()=>[...document.querySelectorAll('.tv2-nav [role=tab]')].map(x=>x.textContent));
  assert.deepEqual(hub,['Standard match','Skyline Duel','Harbour Ring','Online and classic rules','Coach and tips']);
  await p.click('.tv2-nav [data-lt="standard"]');assert.match(await p.locator('.tv2-body').textContent(),/Championship Score/);if(OUT)await p.screenshot({path:path.join(OUT,'rules-hub.png')});
  await p.click('.tv2-nav [data-lt="ring"]');assert.match(await p.locator('.tv2-body').textContent(),/1\.5× its price/);
  const small=await p.evaluate(()=>[...document.querySelectorAll('.tv2-nav button')].filter(x=>x.getBoundingClientRect().height<44).length);assert.equal(small,0);
  await p.click('#lTut');await p.locator('.tutm .ttx').waitFor();ok('How to play hub: five sections, accurate rules, Replay the tour, touch-sized');
  await ctx.close();
  assert.deepEqual(errs.filter(e=>!/stop/.test(e)),[]);ok('no browser errors');
  await b.close();server.close();console.log(`TUTORIAL V2 ${n} checks`);
})().catch(e=>{console.error(e);process.exit(1)});
