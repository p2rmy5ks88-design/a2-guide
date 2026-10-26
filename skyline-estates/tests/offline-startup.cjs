// Verifies the real service worker with HTTP cache unavailable and network explicitly offline.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),app=path.join(root,'skyline-estates'),metadata={self:{}};vm.runInNewContext(fs.readFileSync(path.join(app,'offline-assets.js'),'utf8'),metadata);
const manifest=metadata.self.SKYLINE_OFFLINE,report={testedAt:new Date().toISOString(),checks:[],pageErrors:[],files:manifest.files.length};
const check=(name,ok)=>{assert.ok(ok,name);report.checks.push(name);console.log('PASS',name)};
(async()=>{
  let phase='base',missingHits=0,browser;const indexRequests=[];const basePath='/a2-guide/skyline-estates/';
  const server=http.createServer((req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;res.setHeader('Cache-Control','no-store');
    if(pathname==='/probe.html'||pathname==='/a2-guide/other-app/index.html'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><body>Other test page</body>');return}
    if(pathname===basePath+'room-state.json'){res.setHeader('Content-Type','application/json');res.end('{"privateRoom":"network-only-fixture"}');return}
    if(pathname===basePath+'missing-offline-fixture.bin'){missingHits++;res.writeHead(404).end('missing');return}
    if(pathname===basePath+'offline-assets.js'){
      const data={version:manifest.version+(phase==='base'?'':'-'+phase),files:[...manifest.files,...(phase==='broken'?['./missing-offline-fixture.bin']:[])]};
      res.setHeader('Content-Type','text/javascript');res.end('self.SKYLINE_OFFLINE = '+JSON.stringify(data)+';');return;
    }
    const relative=pathname==='/a2-guide/skyline-estates/'?'skyline-estates/index.html':pathname.replace(/^\/a2-guide\//,'');
    const file=path.resolve(root,relative);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
    const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.webmanifest':'application/manifest+json','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
    fs.readFile(file,(e,b)=>{res.statusCode=e?404:200;res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');if(!e&&file===path.join(app,'index.html')&&phase==='next')b=Buffer.from(b.toString('utf8').replace('<body>','<body data-offline-test-version="2">'));if(!e&&file===path.join(app,'index.html'))indexRequests.push({phase,marked:b.toString('utf8').includes('data-offline-test-version=\"2\"')});res.end(e?'Not found':b)});
  });await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`,scope=origin+basePath,prefix='skyline-estates-offline:'+scope+':';
  const end=p=>p.getByRole('button',{name:/END.*TURN/i});
  const snapshot=p=>p.evaluate(()=>JSON.stringify({players:G.players.map(p=>({cash:p.cash,pos:p.pos,bankrupt:p.bankrupt})),own:G.own,turn:G.turn,round:G.round,houses:G.houses,hotels:G.hotels,set:G.set}));
  async function resume(page){await page.locator('#tCont').waitFor({state:'visible',timeout:30000});await page.locator('#tCont').click();await end(page).waitFor({state:'visible',timeout:30000})}
  async function exit(page){await page.locator('#bMenu').click();await page.getByRole('button',{name:'Save & exit',exact:true}).click();await page.locator('#tCont').waitFor({state:'visible'})}
  async function until(fn,ms=30000){const start=Date.now();while(!(await fn())){if(Date.now()-start>ms)throw Error('Timed out waiting for update download');await new Promise(r=>setTimeout(r,50))}}
  try{
    browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});report.browser=browser.version();
    const context=await browser.newContext({viewport:{width:1280,height:800},storageState:{cookies:[],origins:[{origin,localStorage:[{name:'skylinePrefs',value:JSON.stringify({nickSet:true,welcomed:1,flat2d:true})}]}]}});
    // Routing disables ordinary HTTP caching. Worker requests remain local; no external service is required.
    await context.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
    const newPage=async()=>{const p=await context.newPage();p.on('pageerror',e=>report.pageErrors.push(String(e.stack||e)));return p};
    let page=await newPage();await page.goto(origin+'/probe.html');await page.evaluate(async()=>{const c=await caches.open('other-app-keep');await c.put('/other-keep',new Response('keep'))});
    await page.goto(scope);await page.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:60000});
    const installed=await page.evaluate(async prefix=>{const names=(await caches.keys()).filter(n=>n.startsWith(prefix)),cache=await caches.open(names[0]);return{names,count:(await cache.keys()).length,other:await caches.has('other-app-keep')}},prefix);
    check('first online visit installs all declared local game assets',installed.count===manifest.files.length&&installed.names.length===1);check('first activation preserves unrelated app storage',installed.other);
    await page.evaluate(()=>{
      newGame({cash:1600,set:{mode:'classic',city:'lagos',speed:'fast',ai:'normal',minigames:false,perks:false,auction:true,ffa:true,even:true,interest:true},players:[0,1].map(i=>({name:'Offline '+i,tok:TOKENS[i],col:PCOL[i],ai:false}))});
      G.first=G.turn=0;G.keysShown=true;G.phase='post';G.own[1]={o:0,h:1,m:false};G.houses=35;G.players[0].cash=1500;startWith(G)
    });await end(page).waitFor({state:'visible',timeout:20000});let expected=await snapshot(page);await exit(page);
    await page.evaluate(()=>fetch('./room-state.json').then(r=>r.json()));
    check('online room responses are not stored in the asset cache',await page.evaluate(async()=>!(await caches.match(new URL('./room-state.json',location.href).href))));
    await context.setOffline(true);await page.close();page=await newPage();await page.goto(scope,{waitUntil:'domcontentloaded'});await resume(page);
    check('a new offline tab loads the game from its installed copy',await snapshot(page)===expected);
    const asset=await page.evaluate(async()=>{const r=await fetch('./items/board/bld-1.webp');return{ok:r.ok,size:(await r.arrayBuffer()).byteLength,type:r.headers.get('content-type')}});
    check('approved building artwork is available offline',asset.ok&&asset.size>1000&&asset.type==='image/webp');
    for(const [label,url,method] of [['room data','./room-state.json','GET'],['writes','./index.html','POST'],['neighbouring apps','../other-app/index.html','GET']]){
      const blocked=await page.evaluate(async({url,method})=>{try{await fetch(url,{method});return false}catch{return true}},{url,method});check(label+' are not served from the game asset cache',blocked)
    }
    // Prove resumed play still uses real human actions while offline.
    await end(page).click();const roll=page.getByRole('button',{name:'Roll dice',exact:true});await roll.waitFor({state:'visible'});
    const before=await page.evaluate(()=>{rollDice=async()=>[2,3];return{cash:P(1).cash,price:SQ[5].p}});await roll.press('Enter');await page.getByRole('button',{name:/^Buy for /}).click();await end(page).waitFor({state:'visible'});
    check('cold-started offline game can roll and buy property',await page.evaluate(({cash,price})=>G.own[5].o===1&&P(1).cash===cash-price&&G.turn===1,before));expected=await snapshot(page);await exit(page);await resume(page);
    check('offline Save & exit preserves newly purchased property',await snapshot(page)===expected);
    await context.setOffline(false);phase='broken';await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();try{await r.update()}catch{}});await until(()=>missingHits>0);
    await until(()=>page.evaluate(async({prefix,version})=>{const r=await navigator.serviceWorker.getRegistration(),names=await caches.keys();return!r.installing&&!r.waiting&&names.includes(prefix+version)&&!names.some(n=>n===prefix+version+'-broken')},{prefix,version:manifest.version}));
    const afterFailure=await page.evaluate(async prefix=>(await caches.keys()).filter(n=>n.startsWith(prefix)),prefix);report.afterFailedUpdate=afterFailure;console.log('Offline failed-update caches: '+JSON.stringify(afterFailure));
    check('failed update keeps the current complete cache',afterFailure.includes(prefix+manifest.version)&&!afterFailure.some(n=>n.endsWith('-broken')));check('failed update does not change the open match',await snapshot(page)===expected);
    await page.evaluate(prefix=>caches.open(prefix+'obsolete'),prefix);phase='next';await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update()});
    await until(()=>page.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting),60000);
    check('successful update waits instead of replacing an open game',await page.evaluate(()=>document.body.dataset.offlineTestVersion!=='2')&&await snapshot(page)===expected);
    const probe=await newPage();await probe.goto(origin+'/probe.html');await page.close();
    await until(()=>probe.evaluate(async({prefix,version,scope})=>{const r=await navigator.serviceWorker.getRegistration(scope),names=(await caches.keys()).filter(n=>n.startsWith(prefix));return r?.active?.state==='activated'&&!r.waiting&&names.length===1&&names[0]===prefix+version},{prefix,version:manifest.version+'-next',scope}));
    check('activation removes only obsolete Skyline cache versions',await probe.evaluate(async()=>await caches.has('other-app-keep')&&await(await caches.match('/other-keep')).text()==='keep'));
    await context.setOffline(true);page=await newPage();await page.goto(scope+'index.html?offline-test=1',{waitUntil:'domcontentloaded'});await resume(page);
    report.versionDiagnostics=await page.evaluate(async({prefix,scope})=>{const names=(await caches.keys()).filter(n=>n.startsWith(prefix));const cache=await caches.open(names[0]),response=await cache.match(scope+'index.html'),text=await response.text();return{names,cachedBodyTag:(text.match(/<body[^>]*>/)||[])[0],liveBodyTag:document.body.outerHTML.split('>')[0]+'>',url:location.href}},{prefix,scope});console.log('Offline version diagnostics: '+JSON.stringify({versions:report.versionDiagnostics,afterFailedUpdate:report.afterFailedUpdate,indexRequests}));
    check('updated version opens cold offline after old clients close',await page.evaluate(()=>document.body.dataset.offlineTestVersion==='2'));check('cached update preserves the saved game',await snapshot(page)===expected);
    await exit(page);await page.locator('#hGear').click();await page.locator('#sView [data-v="3d"]').click();await page.waitForFunction(()=>!!GL&&!!S3&&!FLAT,null,{timeout:30000});await resume(page);
    check('3D board can start offline using the cached local assets',await page.evaluate(()=>!!GL&&!!S3&&!FLAT)&&await snapshot(page)===expected);
    await context.close();console.log('Offline startup diagnostics: '+JSON.stringify(report.pageErrors));check('offline startup and update paths have no page exceptions',report.pageErrors.length===0);console.log(`${report.checks.length} offline startup checks passed`);
  }finally{
    console.log('Offline completion: '+JSON.stringify({checks:report.checks.length,pageErrors:report.pageErrors,versions:report.versionDiagnostics,indexRequests}));
    const output=process.argv[2]||path.join(root,'skyline-estates/test-results/offline-startup.json');fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');if(browser)await browser.close();await new Promise(r=>server.close(r));
  }
})().catch(e=>{console.error(e);process.exitCode=1});

