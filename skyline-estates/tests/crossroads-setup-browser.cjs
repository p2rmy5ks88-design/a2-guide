const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../crossroads-capital.html'),'utf8');
const rules=fs.readFileSync(path.join(__dirname,'../lib/crossroads-rules.js'),'utf8');
const daylight=fs.readFileSync(path.join(__dirname,'../lib/board-daylight.js'),'utf8');
async function main(){
 const engine=process.env.BROWSER||'chromium',pw=require(process.env.PLAYWRIGHT_MODULE||'playwright');
 const browser=await pw[engine].launch({headless:true,...(engine==='chromium'&&process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{for(const light of [true,false])for(const opponents of [1,2,3]){
  const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true});
  page.setDefaultTimeout(5000);page.on('pageerror',e=>console.error('PAGE ERROR',e.message));
  await page.setContent('<html><head><style>'+html.match(/<style>([\s\S]*?)<\/style>/)[1]+'</style></head><body>'+html.slice(html.indexOf('<div id="start"'),html.indexOf('<script src="lib/crossroads-rules.js"'))+'</body></html>');
  await page.evaluate(()=>{const b=document.createElement('button');b.id='rulesClose';b.hidden=true;document.body.append(b)});
  await page.addScriptTag({content:rules});
  await page.addScriptTag({content:daylight.replace("JSON.parse(localStorage.getItem('skylinePrefs')||'{}')",JSON.stringify({ui:light?'light':'dark'}))});
  // Execute the actual setup handlers and real rules; only rendering/audio/AI scheduling are stubbed.
  await page.addScriptTag({content:`const CC=window.CrossroadsCapital,$=id=>document.getElementById(id),Q=new URLSearchParams('career=1&length=standard'),CAREER=true,PLAYER_COLORS=['red','blue','green','gold'];let s=null,reported=null;const r3={sync(){},follow(){}},render=()=>{},toast=()=>{},pump=()=>{};`+html.slice(html.indexOf("let len=['standard'"),html.indexOf('// ---------- HUD ----------'))+`;startScreen();window.readMatch=()=>CC.serialize(s);`});
  await page.locator('#oppSeg button[data-n="'+opponents+'"]').click();
  const styles=await page.locator('#oppSeg button').evaluateAll(bs=>bs.map(b=>({n:Number(b.dataset.n),selected:b.classList.contains('on'),bg:getComputedStyle(b).backgroundImage,pressed:b.getAttribute('aria-pressed')})));
  assert.equal(styles.find(b=>b.selected).n,opponents);
  assert.notEqual(styles.find(b=>b.selected).bg,styles.find(b=>!b.selected).bg,'selected AI count must be visually distinct in Daylight');
  assert.equal(styles.find(b=>b.selected).pressed,'true');
  await page.getByRole('button',{name:'▶ Start match',exact:true}).click();
  const match=JSON.parse(await page.evaluate(()=>window.readMatch()));
  assert.equal(match.players.length,opponents+1);assert.equal(match.players.filter(p=>p.ai).length,opponents);
  assert.equal(match.cfg.length,'standard');assert.equal(match.meta.career,true);
  assert.equal(await page.locator('#start').isVisible(),false);
  console.log('PASS',engine,light?'Daylight':'dark',opponents,'AI selected and started');await page.close();
 }}finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1});
