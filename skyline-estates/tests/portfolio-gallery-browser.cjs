// Estate Album and event artwork: real portfolio data, navigation and mobile layouts.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),http=require('node:http'),path=require('node:path'),fs=require('node:fs');
const root=path.resolve(__dirname,'../..'),types={'.html':'text/html','.js':'text/javascript','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json','.webmanifest':'application/manifest+json'};
(async()=>{
 const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!f.startsWith(root+path.sep)){res.writeHead(403);return res.end()}fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'content-type':types[path.extname(f)]||'application/octet-stream'});res.end(e?'missing':b)})});
 await new Promise(done=>server.listen(0,'127.0.0.1',done));const browser=await chromium.launch({headless:true,args:['--disable-webgl'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});let checks=0;const errors=[];
 const verify=(label,ok,obj)=>{assert.ok(ok,label+': '+JSON.stringify(obj||{}));checks++;console.log('PASS',label)};
 const base='http://127.0.0.1:'+server.address().port+'/skyline-estates/';
 for(const vp of [{width:1920,height:1080},{width:844,height:390}]){
  const ctx=await browser.newContext({viewport:vp,serviceWorkers:'block'}),page=await ctx.newPage();page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{if(!localStorage.getItem('skylinePrefs'))localStorage.setItem('skylinePrefs',JSON.stringify({nick:'EstateTester',nickSet:true,welcomed:1,tutDone:1,flat2d:true,rig:false,riders:false,coins:3000,trophies:5}))});
  await page.route('https://**/*',r=>r.abort());await page.goto(base+'index.html');await page.waitForFunction(()=>!!document.querySelector('#title .hd-stage'),null,{timeout:20000});
  await page.locator('#boot').waitFor({state:'detached',timeout:25000});
  await page.evaluate(()=>homeTab('portfolio'));
  const initial=await page.evaluate(()=>{const snap=window.SkylineEstateSnapshot(),groups=snap.groups;
   return{cards:document.querySelectorAll('[data-em-district]').length,groups:groups.length,count:document.querySelector('.em-total strong')?.textContent,real:snap.ownedCount,progress:document.querySelector('.em-district .em-count')?.textContent.trim(),
    first:groups[0]?.rows.filter(r=>r.owned).length+' / '+groups[0]?.rows.length,
    pips:[...document.querySelectorAll('.em-district')].map(x=>x.querySelectorAll('.em-pips i').length),sizes:groups.map(x=>x.rows.length),dock:document.querySelector('.hd-di.on')?.textContent.trim(),mobile:snap.mobile}});
  verify('Portfolio album reads real owned properties at '+vp.width,initial.cards===initial.groups&&initial.count===String(initial.real)&&initial.progress.startsWith(initial.first)&&JSON.stringify(initial.pips)===JSON.stringify(initial.sizes)&&initial.dock==='Portfolio',initial);
  const artStatus=await page.locator('.em-district img').evaluateAll(async imgs=>{
    await Promise.all(imgs.map(img=>img.decode().catch(()=>null)));
    return imgs.map(img=>({src:img.getAttribute('src'),width:img.naturalWidth,height:img.naturalHeight}));
  });
  verify('District building artwork is loaded at '+vp.width,artStatus.length===initial.groups&&artStatus.every(a=>a.width>70&&a.height>70),artStatus);
  await page.screenshot({path:path.join(process.env.RUNNER_TEMP||'/tmp','skyline-portfolio-'+vp.width+'.png')});
  if(initial.cards>1){
   const second=await page.evaluate(()=>window.SkylineEstateSnapshot().groups[1].id);
   await page.locator('[data-em-district]').nth(1).click();
   const moved=await page.evaluate(()=>({chosen:window.SkylineEstateSnapshot().current,select:document.querySelector('.rf-district.selected')?.dataset.district||null,mp:window.SkylineEstateSnapshot().mobilePage,canBack:!!document.querySelector('[data-estate-back="districts"]')}));
   verify('District album navigates to actual district at '+vp.width,moved.chosen===second&&(initial.mobile?(moved.mp==='properties'&&moved.canBack):moved.select===second),{moved,second});
  }
  // Short path: a previously collected property opens its existing persistent-rarity upgrade page.
  const beforeUpgrade=await page.evaluate(()=>{
    const sq=PROP_IDX[0],coins=PREF.coins,game=JSON.stringify(G);
    PREF.estateOwned=PREF.estateOwned||{};
    PREF.estateOwned[setup.city]=[sq];savePref();
    homeTab('play');homeTab('portfolio');
    return {sq,coins,game};
  });
  const quick=await page.evaluate(()=>({options:[...document.querySelectorAll('.em-up-form select option')].map(o=>Number(o.value)),count:window.SkylineEstateSnapshot().upgradeChoices.length}));
  verify('Direct upgrade picker uses collected property records at '+vp.width,quick.options.includes(beforeUpgrade.sq)&&quick.options.length===quick.count,quick);
  await page.getByLabel('Choose property for upgrade').selectOption(String(beforeUpgrade.sq));
  await page.locator('.em-up-form button').click();
  const afterUpgrade=await page.evaluate(()=>({snap:window.SkylineEstateSnapshot(),up:document.querySelectorAll('[data-estate-upgrade]').length,coins:PREF.coins,game:JSON.stringify(G),open:document.querySelector('.rf-mobile-growth')?.open}));
  verify('Upgrade shortcut reaches existing growth controls without spending at '+vp.width,
    afterUpgrade.snap.tab==='growth'&&afterUpgrade.up===1&&afterUpgrade.coins===beforeUpgrade.coins&&afterUpgrade.game===beforeUpgrade.game&&(!initial.mobile||afterUpgrade.open),{
      tab:afterUpgrade.snap.tab,up:afterUpgrade.up,coins:afterUpgrade.coins,open:afterUpgrade.open
    });
  await page.evaluate(()=>homeTab('play'));
  const art=await page.evaluate(async()=>{const urls=['art/skyline-gala.svg','art/rooftop-garden.svg'];const results=await Promise.all(urls.map(u=>fetch(u).then(r=>({ok:r.ok,type:r.headers.get('content-type')}))));const seasonN=season().n,css=document.querySelector('#qSeason')?.getAttribute('style'),S=spotNow(),R=S?roofDef(S.reward):null,thumb=document.querySelector('#hdSpot .th')?.getAttribute('style')||'';
    return{seasonN,css,results,garden:!!R&&R.id==='garden',thumb,bg:!!document.querySelector('.hd-bg.art'),styles:!!document.querySelector('#skyline-estate-album')}});
  verify('Both original event illustrations are available',art.results.every(r=>r.ok&&r.type.includes('image/svg+xml')),art);
  verify('Season and garden art use the appropriate existing reward data',(art.seasonN===2?art.css.includes('skyline-gala.svg'):!art.css.includes('skyline-gala.svg'))&&(!art.garden||art.thumb.includes('rooftop-garden.svg'))&&art.styles,art);
  if(vp.width===1920){
    const state=await page.evaluate(()=>{
      newGame({cash:1600,set:{city:setup.city,mode:'classic',minigames:false,perks:true},players:[
        {name:'EstateTester',tok:TOKENS[0],col:PCOL[0],ai:false},
        {name:'Rival',tok:TOKENS[1],col:PCOL[1],ai:true}
      ]});
      G.phase='pre';G.turn=0;save();showTitle();homeTab('portfolio');
      /* The previous test is on Growth. Switch to Portfolio overview to display its quick actions. */
      document.querySelector('[data-estate-tab="portfolio"]')?.click();
      return {hasSaved:window.SkylineEstateSnapshot().hasSavedMatch,hasButton:!!document.querySelector('.em-match-open'),savedCash:loadSave()?.players[0]?.cash};
    });
    verify('Saved active match exposes direct building manager',state.hasSaved&&state.hasButton&&await page.locator('.em-match-open').count()===1,state);
    await page.locator('.em-match-open').click();
    await page.waitForFunction(()=>document.querySelector('#title').hidden&& !document.querySelector('#ui').hidden,{timeout:15000});
    /* Respect the real new-game Skyline Keys reveal instead of bypassing it. */
    const reveal=page.locator('#modals .keysm');
    if(await reveal.count())await page.getByRole('button',{name:'Let’s go',exact:true}).click();
    await page.waitForFunction(()=>!!document.querySelector('#modals .pf2h'),null,{timeout:12000});
    const opened=await page.evaluate(()=>({active:!document.querySelector('#ui').hidden,modal:!!document.querySelector('#modals .pf2h'),cash:G.players[0].cash,
      phase:G.phase,modals:document.querySelector('#modals').children.length,modalText:document.querySelector('#modals').textContent.trim().slice(0,250),
      assets:document.querySelector('#bAssets')?.className,hasHandler:!!document.querySelector('#bAssets')?.onclick}));
    verify('Manage match buildings resumes existing game and opens legal property manager',opened.active&&opened.modal&&opened.cash===state.savedCash,opened);
    await page.evaluate(()=>{document.querySelector('#modals').innerHTML='';showTitle();homeTab('portfolio')});
  }
  verify('No page errors or horizontal overflow at '+vp.width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)&&errors.length===0,errors);
  await ctx.close();
 }
 verify('No browser page errors',errors.length===0,errors);console.log('ESTATE ALBUM SUMMARY',checks);await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
