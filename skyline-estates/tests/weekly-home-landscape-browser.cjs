// Targeted WebKit-style landscape acceptance for the existing Weekly Contracts home summary.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
(async()=>{
 const server=http.createServer((q,r)=>{const p=path.resolve(root,'.'+decodeURIComponent(q.url.split('?')[0]));if(!p.startsWith(root+path.sep)){r.writeHead(403);return r.end()}fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);return r.end()}r.writeHead(200,{'content-type':types[path.extname(p)]||'application/octet-stream'});r.end(d)})});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--disable-webgl'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const out=process.env.WEEKLY_VISUAL_DIR||process.env.RUNNER_TEMP||'/tmp';fs.mkdirSync(out,{recursive:true});
 try{
 for(const [width,height] of [[956,440],[844,390],[844,320]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,serviceWorkers:'block'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{if(!localStorage.getItem('skylinePrefs'))localStorage.setItem('skylinePrefs',JSON.stringify({nick:'Weekly QA',nickSet:true,welcomed:1,tutDone:1,coach:{pre:1,post:1},flat2d:true,rig:false,riders:false,coins:4205,xp:5200,trophies:22}))});
  await page.route('https://**/*',route=>route.abort());
  await page.goto('http://127.0.0.1:'+server.address().port+'/skyline-estates/index.html');
  await page.waitForFunction(()=>!document.getElementById('boot')&&!!document.querySelector('#title .hd-stage'),null,{timeout:25000});
  await page.waitForFunction(()=>!!window.SkylineWeeklySummary,null,{timeout:10000});
  await page.evaluate(()=>homeTab('play'));
  const result=await page.evaluate(()=>{
   const card=document.querySelector('#hdSpot'),line=card?.querySelector('.hd-weekly-inline'),dock=document.querySelector('#title .rail');
   const R=e=>{if(!e)return null;const r=e.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
   const a=R(line),c=R(card),d=R(dock);
   return{spot:!!card,hasLine:!!line,text:line?.textContent||'',a,c,d,clipped:!!line&&(line.scrollWidth>line.clientWidth+1),textMetrics:line?{scrollWidth:line.scrollWidth,clientWidth:line.clientWidth,scrollHeight:line.scrollHeight,clientHeight:line.clientHeight}:null,weeklyTotal:window.SkylineWeeklySummary.summary(weekly(),WEEKLY,loc).total};
  });
  await page.screenshot({path:path.join(out,'weekly-home-'+width+'x'+height+'.png')});
  assert.ok(result.spot,'Spotlight card expected for test fixture');
  assert.ok(result.hasLine,'Weekly summary visible inside Spotlight');
  assert.ok(/^Weekly \\d+\\/\\d+$/.test(result.text.trim()),'Weekly completion count visible');
  assert.ok(!result.clipped,'Weekly text not clipped: '+JSON.stringify(result));
  assert.ok(result.a.x>=result.c.x-1&&result.a.right<=result.c.right+1&&result.a.y>=result.c.y-1&&result.a.bottom<=result.c.bottom+1,'Weekly line inside Spotlight card');
  assert.ok(result.c.bottom<=result.d.y+1,'Spotlight clear of bottom dock');
  await page.locator('#hdSpot').click();
  assert.equal(await page.evaluate(()=>setup.tab),'spotlight','Spotlight navigation works');
  assert.deepEqual(errors,[],'No browser errors');
  console.log('PASS weekly home landscape '+width+'x'+height+' '+JSON.stringify(result));
  await context.close();
 }
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exit(1)});
