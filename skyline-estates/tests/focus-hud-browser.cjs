// Focus HUD: game board remains readable and every former control stays reachable.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),types={'.html':'text/html','.js':'text/javascript','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.webp':'image/webp'};
(async()=>{
  const server=http.createServer((req,res)=>{
    const target=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));
    if(!target.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
    fs.readFile(target,(err,b)=>{res.writeHead(err?404:200,{'Content-Type':types[path.extname(target)]||'application/octet-stream'});res.end(err?'missing':b)});
  });
  await new Promise(done=>server.listen(0,'127.0.0.1',done));
  const browser=await chromium.launch({headless:true,args:['--disable-webgl'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  const errors=[];let checks=0;
  const test=(name,yes,details)=>{assert.ok(yes,name+' '+JSON.stringify(details||{}));checks++;console.log('PASS',name)};
  for(const vp of [{width:1920,height:1080},{width:844,height:390},{width:667,height:375}]){
    const ctx=await browser.newContext({viewport:vp,serviceWorkers:'block'}),page=await ctx.newPage();
    page.on('pageerror',error=>errors.push(String(error)));
    await page.addInitScript(()=>{
      localStorage.setItem('skylinePrefs',JSON.stringify({nick:'FocusTester',nickSet:true,welcomed:1,tutDone:1,flat2d:true,rig:false,riders:false}));
      localStorage.removeItem('skyline:focusHud');
    });
    await page.route('https://**/*',route=>route.abort());
    await page.goto('http://127.0.0.1:'+server.address().port+'/skyline-estates/index.html');
    await page.locator('#boot').waitFor({state:'detached',timeout:25000});
    const initial=await page.evaluate(()=>({
      focus:document.querySelector('#ui').classList.contains('focus-hud'),
      more:!!document.querySelector('#hudMore'),panel:document.querySelector('#hudPanel').hidden,
      mode:window.SkylineFocusHUD?.mode,style:!!document.querySelector('#skyline-focus-hud-css')
    }));
    test('Focus HUD loads by default at '+vp.width,initial.focus&&initial.more&&initial.panel&&initial.mode==='focus'&&initial.style,initial);
    await page.evaluate(()=>{
      newGame({cash:2000,set:{city:'lagos',mode:'classic',minigames:false,perks:true},players:[
        {name:'FocusTester',tok:TOKENS[0],col:PCOL[0],ai:false},
        {name:'Kofi',tok:TOKENS[1],col:PCOL[1],ai:true},
        {name:'Mei',tok:TOKENS[2],col:PCOL[2],ai:true}
      ]});
      G.phase='post';G.turn=0;G.houses=36;G.hotels=12;
      document.querySelector('#title').hidden=true;document.querySelector('#ui').hidden=false;
      renderRoster();setPrompt('<b>FocusTester, anything else?</b><span class="sub">Build, mortgage or trade before ending your turn.</span>');updateTools();
      document.querySelector('#acts').innerHTML='<button type="button" class="bigb end">END<br>TURN</button>';
      G.set.events2=true;G.ev2Next=3;ev2Chip();
    });
    const layout=await page.evaluate(()=>{
      const r=(selector)=>{const el=document.querySelector(selector),box=el?.getBoundingClientRect();return box?{x:box.x,y:box.y,width:box.width,height:box.height,right:box.right,bottom:box.bottom}:null};
      return{cards:document.querySelectorAll('#roster .pcard').length,card:r('#roster .pcard'),prompt:r('#prompt'),roster:r('#roster'),acts:r('#acts .bigb.end'),
        tools:[...document.querySelectorAll('#tools .tb')].filter(x=>getComputedStyle(x).display!=='none').map(x=>({id:x.id,height:x.getBoundingClientRect().height})),
        mapHidden:getComputedStyle(document.querySelector('#bMap')).display==='none',event:r('#ev2chip'),
        overflow:document.documentElement.scrollWidth>innerWidth+1};
    });
    test('Game HUD is compact and usable at '+vp.width,
      layout.cards===3&&layout.card.width<=170&&layout.card.height>=40&&layout.mapHidden&&layout.acts.height>=55&&layout.tools.every(x=>x.height>=40)&&!layout.overflow,layout);
    await page.screenshot({path:path.join(process.env.RUNNER_TEMP||'/tmp','skyline-focus-hud-'+vp.width+'.png')});
    await page.click('#round');
    test('Round details are accessible by tap',await page.locator('#hudRoundPopup').isVisible()&&await page.locator('#hudRoundText').textContent().then(s=>s.includes('Round')),null);
    await page.click('#hudRoundPopup button');
    await page.click('#prompt');
    test('Turn guidance expands without opening a game modal',await page.locator('#prompt').evaluate(x=>x.classList.contains('hud-prompt-open')),null);
    await page.keyboard.press('Escape');
    await page.click('#hudMore');
    test('Secondary game controls open on demand',await page.locator('#hudPanel').isVisible()&&await page.locator('#hudMore').getAttribute('aria-expanded')==='true',null);
    await page.click('#hudViewMode');
    test('Detailed HUD can be restored and map stays available',await page.evaluate(()=>window.SkylineFocusHUD.mode==='detailed'&&getComputedStyle(document.querySelector('#bMap')).display!=='none'),null);
    await page.click('#hudMore');
    await page.click('#hudViewMode');
    test('Player can return to the compact HUD',await page.evaluate(()=>window.SkylineFocusHUD.mode==='focus'),null);
    await page.evaluate(()=>{document.documentElement.classList.add('light');renderRoster()});
    const contrast=await page.evaluate(()=>{
      const el=document.querySelector('#prompt'),s=getComputedStyle(el),c=s.backgroundColor;
      return{background:c,color:s.color,opaque:!c.endsWith(', 0)')};
    });
    test('Daylight Focus HUD remains legible',contrast.opaque&&contrast.color!=='rgba(0, 0, 0, 0)',contrast);
    test('No runtime errors at '+vp.width,errors.length===0,errors);
    await ctx.close();
  }
  await browser.close();server.close();console.log('FOCUS HUD',checks,'checks');
})().catch(err=>{console.error(err);process.exit(1)});
