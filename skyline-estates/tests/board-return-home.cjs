// Every Career board: end a match, press the return button once, and land on the Skyline Estates home screen
// without the loading screen (the full game does not restart). Origins plays inside index.html and never navigates.
const path=require('path'),http=require('http'),fs=require('fs');const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const engine=process.env.VISUAL_ENGINE||process.env.ENGINE||'chromium',root=path.resolve(__dirname,'../..');let base;
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.glb':'model/gltf-binary','.mp3':'audio/mpeg','.woff2':'font/woff2'};
const out=path.join(__dirname,'..','test-results','board-return');require('fs').mkdirSync(out,{recursive:true});
let n=0;const ok=(c,m)=>{if(!c)throw new Error('FAIL '+m);n++;console.log('PASS '+m)};
const seed=()=>{try{localStorage.setItem('skylineE2E','1')}catch(e){}};
async function home(page,label){
  await page.waitForURL(u=>/index\.html/.test(String(u)),{timeout:20000});
  const t0=Date.now();await page.waitForFunction(()=>{const t=document.getElementById('title');return t&&!t.hidden&&getComputedStyle(t).display!=='none'},null,{timeout:15000});
  const st=await page.evaluate(()=>({boot:!!document.getElementById('boot'),url:location.href,wb:!!document.getElementById('wback')}));
  ok(!st.boot,label+': no loading screen on return');ok(!/return=/.test(st.url),label+': return flag cleared from address');ok(!st.wb,label+': no welcome-back card');
  await page.screenshot({path:path.join(out,label+'-'+engine+'.png')});return Date.now()-t0}
(async()=>{const server=http.createServer((q,r)=>{const f=path.join(root,decodeURIComponent(q.url.split('?')[0]));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});r.end(d)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}/skyline-estates/`;
 const br=await (engine==='webkit'?webkit:chromium).launch({executablePath:engine==='chromium'?process.env.CHROME_PATH||undefined:undefined,args:engine==='chromium'?['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']:[]});
 try{
  for(const [label,file] of [['city-ventures','city-ventures.html'],['crossroads','crossroads-capital.html']]){
   const ctx=await br.newContext({viewport:{width:956,height:440}});const page=await ctx.newPage();const errs=[];page.on('pageerror',e=>errs.push(String(e)));page.on('dialog',d=>d.accept());
   // Seed a welcomed profile so the main page lands on home (welcome-back would only show after 4h anyway).
   await page.goto(base+'index.html');await page.waitForTimeout(3500);
   await page.goto(base+file+'?career=1&length=quick');await page.waitForSelector('#startBtn',{state:'visible',timeout:20000});await page.click('#startBtn');
   await page.waitForTimeout(1500);await page.waitForFunction(()=>!document.querySelector('#menuBtn').disabled,null,{timeout:20000}).catch(()=>{});
   // End now via the menu (works on the player's turn); retry until it is the player's turn.
   for(let i=0;i<60;i++){if(await page.locator('#results').isVisible())break;
     await page.evaluate(()=>{document.getElementById('menu').hidden=true;document.getElementById('menuBtn').click()});await page.waitForTimeout(200);
     if(await page.locator('#mEnd').isEnabled()){await page.click('#mEnd');await page.waitForTimeout(800);break}
     await page.evaluate(()=>document.getElementById('menu').hidden=true);await page.waitForTimeout(1500)}
   await page.waitForSelector('#results',{state:'visible',timeout:20000});ok(true,label+': match ended, results shown');
   await page.click('#resHome');const ms=await home(page,label);console.log('  home in '+ms+' ms');
   ok(!errs.length,label+': no page errors '+errs.join('|'));await ctx.close()}
  for(const board of ['dominion','empire']){
   const ctx=await br.newContext({viewport:{width:956,height:440}});const page=await ctx.newPage();const errs=[];page.on('pageerror',e=>errs.push(String(e)));page.on('dialog',d=>d.accept());
   await page.goto(base+'approved-career-board.html?board='+board+'&career=1&length=quick');await page.waitForSelector('#start',{state:'visible',timeout:20000});await page.click('#start');
   await page.waitForTimeout(1500);
   for(let i=0;i<20;i++){if(await page.locator('#finish').isVisible())break;
     if(await page.locator('#menu').isHidden())await page.click('#menuBtn');await page.waitForTimeout(300);
     if(await page.locator('#endMatch').isEnabled()){await page.click('#endMatch');await page.waitForTimeout(800);continue}
     await page.click('#mResume').catch(()=>{});await page.waitForTimeout(1500)}
   await page.waitForSelector('#finish',{state:'visible',timeout:20000});ok(true,board+': match ended, results shown');
   await page.click('#returnCareer');const ms=await home(page,board);console.log('  home in '+ms+' ms');
   ok(!errs.length,board+': no page errors '+errs.join('|'));await ctx.close()}
  console.log('BOARD RETURN '+engine+' '+n+' checks');
 }catch(e){console.error(e);process.exitCode=1}finally{await br.close();server.close()}})();
