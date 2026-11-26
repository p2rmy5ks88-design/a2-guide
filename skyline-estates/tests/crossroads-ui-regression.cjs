const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const CC=require('../lib/crossroads-rules.js');
const html=fs.readFileSync(path.join(__dirname,'../crossroads-capital.html'),'utf8');
const daylight=fs.readFileSync(path.join(__dirname,'../lib/board-daylight.js'),'utf8');
async function main(){
 if(process.argv.includes('--ranking')){
  const source=html.match(/function rankedPlayers\(state\)\{[\s\S]*?\n\}/);
  assert.ok(source,'HUD must rank a copied list instead of changing turn seats');
  const ctx={CC};vm.createContext(ctx);vm.runInContext(source[0],ctx);
  const s=CC.newMatch({seed:8,players:[{name:'You'},{name:'Mia',ai:true},{name:'Noah',ai:true}]});
  s.players[2].lp=10;const before=CC.serialize(s),turn=s.turn.pid;
  assert.equal(ctx.rankedPlayers(s)[0].id,2);
  assert.equal(CC.serialize(s),before);assert.equal(s.turn.pid,turn);
  s.players[1].lp=20;assert.equal(ctx.rankedPlayers(s)[0].id,1);
  s.players[1].out=true;assert.notEqual(ctx.rankedPlayers(s)[0].id,1);
  const expected=ctx.rankedPlayers(s).map(p=>p.id);CC.closeMatch(s);
  assert.deepEqual(Array.from(expected),s.results.map(p=>p.pid));
  assert.ok(html.includes('rankedPlayers(s).map(p=>'),'live HUD uses the ranking');
  console.log('PASS live leader changes, eliminated seats, final-score parity, saves and turn order');return;
 }
 const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
 const engine=process.env.BROWSER||'chromium',browser=await({chromium,webkit}[engine]).launch({headless:true,...(engine==='chromium'&&process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{for(const light of [false,true])for(const width of [844,1280]){
  const page=await browser.newPage({viewport:{width,height:width===844?390:589},deviceScaleFactor:1});
  const style=html.match(/<style>([\s\S]*?)<\/style>/)[1];
  await page.setContent('<html><head><style>'+style+'</style></head><body><section id="decision" class="panel"><h2>City Moments / Build</h2><div class="cards2"><div class="mcard"><h5>Mountain Art Fair</h5><button class="opt"><small>Take 70 Cash</small></button></div><div class="mcard"><h5>Builders Meet</h5><button class="opt"><small>Receive 100 Cash</small></button></div></div><div class="row"><button class="tilebtn">Cedar Terrace → House 2 · 160 CC</button><div class="stepper"><button>+</button></div><button class="tilebtn on">Selected street</button></div></section></body></html>');
  await page.addScriptTag({content:daylight.replace("JSON.parse(localStorage.getItem('skylinePrefs')||'{}')",JSON.stringify({ui:light?'light':'dark'}))});
  const values=await page.locator('.mcard h5,.tilebtn,.stepper button,.opt small').evaluateAll(els=>els.map(el=>{
   let bg=getComputedStyle(el).backgroundColor,p=el;while(bg==='rgba(0, 0, 0, 0)'&&p.parentElement){p=p.parentElement;bg=getComputedStyle(p).backgroundColor;}
   return {text:el.textContent,color:getComputedStyle(el).color,bg};}));
  const lum=c=>{const a=c.match(/[\d.]+/g).slice(0,3).map(Number).map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4});return a[0]*.2126+a[1]*.7152+a[2]*.0722};
  const out=path.join(__dirname,'../test-results/crossroads-ui');fs.mkdirSync(out,{recursive:true});
  await page.screenshot({path:path.join(out,engine+'-'+(light?'daylight':'dark')+'-'+width+'.png')});
  for(const v of values){const a=lum(v.color),b=lum(v.bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);assert.ok(ratio>=4.5,JSON.stringify({...v,ratio}));}
  await page.close();console.log('PASS',engine,light?'Daylight':'dark',width,'popup text contrast');
 }}finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1});
