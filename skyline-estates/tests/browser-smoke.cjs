// Real-browser startup, offline-session and board-view checks. Uses isolated profiles.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const report={testedAt:new Date().toISOString(),checks:[],pageErrors:[],capabilities:{},limits:[]};
const check=(name,condition)=>{assert.ok(condition,name);report.checks.push(name);console.log('PASS',name)};
(async()=>{
  const server=http.createServer((req,res)=>{
    const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
    const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
    fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(e?'Not found':b)})
  });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`,url=origin+'/skyline-estates/index.html';let browser;
  async function pageFor({flat=false,noGL=false}={}){
    const context=await browser.newContext({viewport:{width:1280,height:800},storageState:{cookies:[],origins:[{origin,localStorage:[{name:'skylinePrefs',value:JSON.stringify({nickSet:true,welcomed:1,flat2d:flat})}]}]}});
    // External services are deliberately unavailable: core local play must not require them.
    await context.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
    await context.addInitScript(({flat,noGL})=>{
      if(noGL){const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args)}}
    },{flat,noGL});
    const page=await context.newPage();page.on('pageerror',e=>report.pageErrors.push(String(e.stack||e)));
    await page.goto(url);await page.waitForFunction(()=>typeof window.__sim==='function');return{context,page};
  }
  async function startPostTurn(page){await page.evaluate(()=>{
    newGame({cash:1600,set:{mode:'classic',speed:'fast',ai:'normal',city:'lagos',minigames:false,perks:false,ffa:true,auction:true,even:true,interest:true},players:[0,1].map(i=>({name:'Test '+i,tok:TOKENS[i],col:PCOL[i],ai:false}))});
    G.first=G.turn=0;G.keysShown=true;G.phase='post';G.players[0].pos=5;G.players[0].cash=1500;G.own[1].o=0;startWith(G)
  });await page.getByRole('button',{name:/END.*TURN/i}).waitFor({state:'visible',timeout:20000})}
  const snapshot=page=>page.evaluate(()=>JSON.stringify({players:G.players.map(p=>({id:p.id,cash:p.cash,pos:p.pos,bankrupt:p.bankrupt})),own:G.own,turn:G.turn,round:G.round,houses:G.houses,hotels:G.hotels,set:G.set}));
  async function exit(page){await page.locator('#bMenu').click();await page.getByRole('button',{name:'Save & exit',exact:true}).click();await page.locator('#tCont').waitFor({state:'visible'})}
  try{
    browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});report.browser=browser.version();
    const unavailable=await pageFor({noGL:true});
    await unavailable.page.locator('#re2d').waitFor({state:'visible'});check('WebGL failure exposes the existing 2D recovery control',true);
    await unavailable.page.locator('#re2d').click();await unavailable.page.locator('#qAI').waitFor({state:'visible'});
    check('2D recovery reaches the playable home screen',await unavailable.page.locator('html').evaluate(e=>e.classList.contains('flat')));await unavailable.context.close();
    const flat=await pageFor({flat:true,noGL:true});
    await flat.page.locator('#qAI').waitFor({state:'visible'});check('saved 2D preference starts without WebGL',await flat.page.locator('html').evaluate(e=>e.classList.contains('flat')));
    await startPostTurn(flat.page);await flat.page.waitForFunction(()=>document.querySelectorAll('#flatbd .mc').length===40);
    check('2D board contains all 40 spaces',await flat.page.locator('#flatbd .mc').count()===40);
    check('resumed post-roll 2D turn does not offer another roll',await flat.page.getByRole('button',{name:'Roll dice',exact:true}).count()===0);
    const state=await snapshot(flat.page);
    await flat.page.locator('#bMap').click();check('map shortcut keeps the existing 2D board usable',await flat.page.locator('#flatbd .mc').count()===40&&await flat.page.locator('#modals .mapm').count()===0);
    for(const viewport of [{width:390,height:844},{width:844,height:390}]){
      await flat.page.setViewportSize(viewport);await flat.page.waitForFunction(()=>{const b=document.querySelector('#flatbd').getBoundingClientRect();return b.x>=0&&b.y>=0&&b.right<=innerWidth+1&&b.bottom<=innerHeight+1});
      check(`2D board fits ${viewport.width}x${viewport.height}`,true)
    }
    await flat.page.setViewportSize({width:1280,height:800});
    await flat.context.setOffline(true);await flat.page.locator('#bAssets').click();await flat.page.getByRole('heading',{name:'Your portfolio',exact:true}).waitFor({state:'visible'});
    check('portfolio opens during an offline session',true);await flat.page.locator('#modals').getByRole('button',{name:'Close',exact:true}).click();await flat.page.locator('#modals .ov').waitFor({state:'detached'});
    await exit(flat.page);check('Save & exit works during an offline session',true);
    report.capabilities.offlineReloadAvailable=true;
    try{await flat.page.reload({waitUntil:'domcontentloaded',timeout:15000})}catch(e){if(!/ERR_INTERNET_DISCONNECTED|ERR_NETWORK_CHANGED|ERR_FAILED/.test(String(e)))throw e;report.capabilities.offlineReloadAvailable=false;report.limits.push('Web cold/reload offline is unavailable without a service worker; this is not native APK offline coverage.')}
    await flat.context.setOffline(false);await flat.page.goto(url);await flat.page.locator('#tCont').click();await flat.page.getByRole('button',{name:/END.*TURN/i}).waitFor({state:'visible',timeout:20000});
    check('2D Continue preserves cash, ownership, position and turn across reload',await snapshot(flat.page)===state);await flat.context.close();
    const normal=await pageFor();await normal.page.waitForFunction(()=>!!document.querySelector('#qAI')||!!document.querySelector('#re2d'));
    report.capabilities.webgl=await normal.page.evaluate(()=>!!GL&&!!S3);
    if(report.capabilities.webgl){
      await startPostTurn(normal.page);const state3d=await snapshot(normal.page);await normal.page.locator('#bMap').click();await normal.page.locator('#modals .mapbd').waitFor({state:'visible'});
      check('3D game opens a complete 40-space map',await normal.page.locator('#modals .mapbd .mc').count()===40);await normal.page.locator('#mapX').click();await normal.page.locator('#modals .ov').waitFor({state:'detached'});
      check('closing the map preserves game state',await snapshot(normal.page)===state3d);
      await exit(normal.page);await normal.page.locator('#hGear').click();await normal.page.locator('#sView [data-v="2d"]').click();
      await normal.page.waitForFunction(()=>document.documentElement.classList.contains('flat'),null,{timeout:20000});await normal.page.locator('#tCont').click();await normal.page.getByRole('button',{name:/END.*TURN/i}).waitFor({state:'visible',timeout:20000});
      check('switching 3D to 2D retains saved game state',await snapshot(normal.page)===state3d);
      await exit(normal.page);await normal.page.locator('#hGear').click();await normal.page.locator('#sView [data-v="3d"]').click();
      await normal.page.waitForFunction(()=>!!GL&&!!S3&&!FLAT,null,{timeout:20000});await normal.page.locator('#tCont').click();await normal.page.getByRole('button',{name:/END.*TURN/i}).waitFor({state:'visible',timeout:20000});
      check('switching 2D back to 3D retains saved game state',await snapshot(normal.page)===state3d)
    }else{report.limits.push('Runner WebGL unavailable; genuine 3D/map switching could not be verified.');await normal.page.locator('#re2d').waitFor({state:'visible'})}
    await normal.context.close();console.log('Browser diagnostics: '+JSON.stringify({pageErrors:report.pageErrors,capabilities:report.capabilities,limits:report.limits}));check('startup/view/offline-session tests have no page exceptions',report.pageErrors.length===0);
    console.log(`${report.checks.length} browser smoke checks passed`);
  }finally{
    const output=process.argv[2]||path.join(root,'skyline-estates/test-results/browser-smoke.json');fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
    if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));
  }
})().catch(e=>{console.error(e);process.exitCode=1});

