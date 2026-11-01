// Portfolio Fast Upgrades: the existing property-rarity economy remains authoritative.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),http=require('node:http'),path=require('node:path'),fs=require('node:fs');
const root=path.resolve(__dirname,'../..');
const mime={'.html':'text/html','.js':'text/javascript','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png'};
(async()=>{
 const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!p.startsWith(root+path.sep)){res.writeHead(403);return res.end();}fs.readFile(p,(err,data)=>{res.writeHead(err?404:200,{'content-type':mime[path.extname(p)]||'application/octet-stream'});res.end(err?'missing':data)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,args:['--disable-webgl'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const errors=[];let checks=0;const check=(name,value,info)=>{assert.ok(value,name+' '+JSON.stringify(info||{}));console.log('PASS',name);checks++};
 for(const vp of [{width:1920,height:1080},{width:844,height:390},{width:390,height:844}]){
  const ctx=await browser.newContext({viewport:vp,serviceWorkers:'block'}),page=await ctx.newPage();
  page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{localStorage.setItem('skylinePrefs',JSON.stringify({nickSet:true,nick:'Estate Tester',welcomed:1,flat2d:true,rig:false,riders:false}))});
  await page.route('https://**/*',r=>r.abort());
  await page.goto('http://127.0.0.1:'+server.address().port+'/skyline-estates/index.html');
  await page.locator('#boot').waitFor({state:'detached',timeout:20000});
  const data=await page.evaluate(()=>{
   const sq=PROP_IDX[0];PREF.coins=24000;PREF.tokWins[TOKENS[0]]=16;PREF.estateOwned=PREF.estateOwned||{};PREF.estateOwned.lagos=[sq];setup.city='lagos';savePref();homeTab('portfolio');
   return{square:sq,coins:PREF.coins,rarity:propertyRarity('lagos',sq),wins:careerWins()};
  });
  const bar=page.locator('.rf-fastbar');
  await bar.waitFor();
  const initial=await page.evaluate(()=>({hasOneTap:document.querySelectorAll('.rf-fast-direct').length,readyText:document.querySelector('.rf-fast-head')?.textContent,overflow:document.documentElement.scrollWidth-innerWidth}));
  check('quick upgrade visible without entering district at '+vp.width,initial.hasOneTap===1&&initial.readyText.includes('1 ready')&&initial.overflow<=1,initial);
  await page.locator('.rf-fast-open').click();
  const hub=await page.evaluate(()=>({cards:document.querySelectorAll('.rf-fast-card').length,upgrade:document.querySelector('.rf-fast-upgrade')?.disabled,stats:document.querySelector('.rf-fast-hub p')?.textContent}));
  check('Upgrade Center lists owned real property and explains scope',hub.cards===1&&hub.upgrade===false&&hub.stats.includes('Houses and towers'),hub);
  if(vp.width===1920||vp.width===844)await page.screenshot({path:path.join(process.env.RUNNER_TEMP||'/tmp','skyline-portfolio-center-'+vp.width+'.png')});
  await page.locator('.rf-fast-upgrade').click();
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  check('cancel does not spend currency or rarity',await page.evaluate(d=>PREF.coins===d.coins&&propertyRarity('lagos',d.square)===d.rarity,data));
  await page.locator('.rf-fast-upgrade').click();
  await page.getByRole('button',{name:'Confirm upgrade',exact:true}).click();
  await page.waitForFunction(d=>propertyRarity('lagos',d.square)===d.rarity+1,data,{timeout:12000});
  check('confirmed upgrade uses original economy',await page.evaluate(d=>PREF.coins===d.coins-ESTATE_UPGRADE[d.rarity+1].coins,data));
  await page.locator('.rf-fast-detail').click();
  const detail=await page.evaluate(d=>({tab:document.querySelector('.rf-mobile-view-select select')?.value,propertyName:document.querySelector('.rf-property h2')?.textContent,expected:CITY_DATA.lagos.props[PROP_IDX.indexOf(d.square)][0],button:!!document.querySelector('[data-estate-upgrade]'),mobileGrowth:document.querySelector('.rf-mobile-growth')?.open}),data);
  check('one-step Details opens correct property growth',detail.tab==='growth'&&detail.propertyName===detail.expected&&detail.button&& (vp.width>850||detail.mobileGrowth===true),detail);
  await page.evaluate(()=>homeTab('portfolio'));
  await page.locator('.rf-fast-open').click();
  if(vp.width<=850)await page.getByLabel('Portfolio view',{exact:true}).selectOption('assets');
  else await page.locator('[data-estate-tab=assets]').first().click();
  check('normal portfolio tab leaves Upgrade Center',await page.locator('.rf-fast-hub').count()===0);
  await page.evaluate(()=>homeTab('portfolio'));
  const noOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
  check('portfolio remains within viewport '+vp.width,noOverflow);
  if(vp.width===1920||vp.width===844)await page.screenshot({path:path.join(process.env.RUNNER_TEMP||'/tmp','skyline-portfolio-fast-'+vp.width+'.png')});
  await ctx.close();
 }
 check('zero browser page errors',errors.length===0,errors);
 await browser.close();server.close();console.log('PORTFOLIO FAST UPGRADES',checks,'checks');
})().catch(e=>{console.error(e);process.exit(1)});
