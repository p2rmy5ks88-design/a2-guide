// Integrated Portfolio: visually rich district album + existing fast upgrades + legal match building entry.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),types={'.html':'text/html','.js':'text/javascript','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json'};
(async()=>{
 const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!p.startsWith(root+path.sep)){res.writeHead(403);return res.end()}fs.readFile(p,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(p)]||'application/octet-stream'});res.end(e?'missing':b)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,args:['--disable-webgl'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 let checks=0;const errors=[];const verify=(label,ok,details)=>{assert.ok(ok,label+' '+JSON.stringify(details));checks++;console.log('PASS',label)};
 for(const vp of [{width:1920,height:1080},{width:844,height:390},{width:390,height:844}]){
  const ctx=await browser.newContext({viewport:vp,serviceWorkers:'block'}),page=await ctx.newPage();
  page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{if(!localStorage.getItem('skylinePrefs'))localStorage.setItem('skylinePrefs',JSON.stringify({nick:'GalleryTester',nickSet:true,welcomed:1,tutDone:1,flat2d:true,rig:false,riders:false,coins:2500,trophies:10}))});
  await page.route('https://**/*',route=>route.abort());
  await page.goto('http://127.0.0.1:'+server.address().port+'/skyline-estates/index.html');
  await page.locator('#boot').waitFor({state:'detached',timeout:25000});
  await page.evaluate(()=>homeTab('portfolio'));
  const overview=await page.evaluate(()=>{
   const snap=SkylineEstateSnapshot(),album=document.querySelector('.em-album'),quick=document.querySelector('.rf-fastbar'),hero=document.querySelector('.em-hero');
   return{districts:album?.querySelectorAll('[data-em-district]').length,source:snap.groups.length,owns:snap.ownedCount,shownOwned:hero?.querySelector('.em-total strong')?.textContent,
    pips:[...document.querySelectorAll('.em-district')].map(n=>n.querySelectorAll('.em-pips i').length),rows:snap.groups.map(x=>x.rows.length),
    quick:!!quick,upgradeCenter:!!quick?.querySelector('.rf-fast-open'),hero:!!hero,dock:document.querySelector('.hd-di.on')?.textContent.trim(),order:[...document.querySelector('#pane').children].slice(0,3).map(n=>n.className)};
  });
  verify('Album, fast upgrade bar, and real estate ownership at '+vp.width,
   overview.districts===overview.source&&String(overview.owns)===overview.shownOwned&&JSON.stringify(overview.pips)===JSON.stringify(overview.rows)&&overview.quick&&overview.upgradeCenter&&overview.hero&&overview.dock==='Portfolio',overview);
  const assets=await page.locator('.em-district img').evaluateAll(async imgs=>{
    await Promise.all(imgs.map(img=>img.decode().catch(()=>null)));
    return imgs.map(img=>({src:img.getAttribute('src'),width:img.naturalWidth}));
  });
  verify('District buildings decode on screen '+vp.width,assets.length===overview.source&&assets.every(a=>a.width>80),assets);
  await page.screenshot({path:path.join(process.env.RUNNER_TEMP||'/tmp','skyline-integrated-'+vp.width+'.png')});
  await page.locator('.rf-fast-open').click();
  verify('Fast Upgrade Center remains one click away at '+vp.width,await page.locator('.rf-fast-hub').count()===1&&await page.locator('.em-album').count()===0);
  await page.locator('.rf-fast-open').click();
  verify('Returning to Portfolio restores district album at '+vp.width,await page.locator('.em-album').count()===1);
  if(vp.width===1920){
    const saved=await page.evaluate(()=>{
      newGame({cash:1600,set:{city:setup.city,mode:'classic',minigames:false,perks:true},players:[
        {name:'GalleryTester',tok:TOKENS[0],col:PCOL[0],ai:false},
        {name:'Rival',tok:TOKENS[1],col:PCOL[1],ai:true}
      ]});
      G.phase='pre';G.turn=0;save();showTitle();homeTab('portfolio');
      return{match:SkylineEstateSnapshot().hasSavedMatch,cash:loadSave()?.players[0]?.cash};
    });
    verify('Saved match enables in-match construction shortcut',saved.match&&await page.locator('.em-match-open').count()===1,saved);
    await page.locator('.em-match-open').click();
    await page.waitForFunction(()=>document.querySelector('#title').hidden&&!document.querySelector('#ui').hidden,{timeout:15000});
    if(await page.locator('#modals .keysm').count())await page.getByRole('button',{name:'Let’s go',exact:true}).click();
    await page.waitForFunction(()=>!!document.querySelector('#modals .pf2h'),null,{timeout:12000});
    const opened=await page.evaluate(()=>({active:!document.querySelector('#ui').hidden,manager:!!document.querySelector('#modals .pf2h'),cash:G.players[0].cash}));
    verify('Building shortcut opens existing legal Properties manager, without spending',opened.active&&opened.manager&&opened.cash===saved.cash,opened);
  }
  verify('No page overflow or browser errors at '+vp.width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)&&errors.length===0,errors);
  await ctx.close();
 }
 verify('No page errors across all layouts',errors.length===0,errors);
 console.log('INTEGRATED PORTFOLIO SUMMARY',checks);await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
