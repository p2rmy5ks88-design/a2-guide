const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const styles=p=>Array.from(read(p).matchAll(/<style>([\s\S]*?)<\/style>/g),m=>m[1]).join('\n');
const samples=[
 {mode:'classic',css:()=>styles('game.html'),body:'<div class="mp"><div class="mh" data-check>Build and trade</div><div class="mtxt" data-check>Choose a street to upgrade.</div><div class="mbar"><button class="btn" data-check>Close</button><button class="btn pri" data-check>Confirm</button></div></div>',shared:false},
 ...['city-ventures','crossroads-capital'].map(mode=>({mode,css:()=>styles(mode+'.html'),body:'<section id="decision" class="panel"><h2 data-check>Build</h2><div class="tag" data-check>Choose a development</div><button class="tilebtn" data-check>Upgrade this street</button><button class="tilebtn on" data-check>Selected street</button><div class="stepper"><button data-check>+</button></div><div class="mcard"><h5 data-check>City Moments</h5><button class="opt"><small data-check>Take 70 Cash</small></button></div><div class="seg"><button class="btn on" data-check>2 AI</button><button class="btn" data-check>3 AI</button></div></section>',shared:true})),
 ...['dominion','empire'].map(mode=>({mode,css:()=>read('presentation/approved-board.css'),body:'<div id="roster"><div class="seat"><span class="who" data-check>Mia</span><span class="money" data-check>SC 700K</span></div><div class="seat active"><span class="who" data-check>You</span><span class="money" data-check>SC 500K</span></div></div><aside id="detailsDrawer"><h3 data-check>Property details</h3><div class="info" data-check>Owner: You</div><button data-check>Close</button></aside><div class="pill"><span data-check>Your turn</span></div><dialog open style="background:#142843;color:#fff4d8"><h2 style="color:#ffd481" data-check>Offer a deal</h2><input style="background:#061323;color:white" value="500000" data-check><button style="background:#1d3a5e;color:#fff" data-check>Confirm</button></dialog>',shared:true}))
];
const lum=c=>{const a=c.match(/[\d.]+/g).slice(0,3).map(Number).map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4});return a[0]*.2126+a[1]*.7152+a[2]*.0722};
(async()=>{const engine=process.env.BROWSER||'chromium',pw=require(process.env.PLAYWRIGHT_MODULE||'playwright'),browser=await pw[engine].launch({headless:true,...(engine==='chromium'&&process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});const report=[];
 try{for(const sample of samples)for(const light of [false,true])for(const width of [844,1280]){
  const page=await browser.newPage({viewport:{width,height:width===844?390:589},hasTouch:true});
  const roster=sample.mode==='classic'?'<div id="ui"><div id="roster"><button class="pcard"><div class="pinfo"><div class="pn" data-check>Mia <span class="tag" data-check>AI</span></div><div class="pc" data-check>SC 700K</div></div></button></div></div>':sample.mode==='city-ventures'||sample.mode==='crossroads-capital'?'<div id="players"><div class="pl"><b data-check>Mia</b><span data-check>2,200 CC <span class="val" data-check>5 LP</span></span></div></div>':'';
  const compact=['dominion','empire'].includes(sample.mode)?'<div id="bottom"><div class="player-chip" style="--seat:#43a4ff"><div class="details" data-check>Mia<small data-check>SC 700K</small></div></div><div class="player-chip active" style="--seat:#f2c457"><div class="details" data-check>You<small data-check>SC 500K</small></div></div></div>':'';
  await page.setContent('<html><head><style>'+sample.css()+'</style></head><body>'+sample.body+roster+compact+'</body></html>');
  if(sample.shared)await page.addScriptTag({content:read('lib/board-daylight.js').replace("JSON.parse(localStorage.getItem('skylinePrefs')||'{}')",JSON.stringify({ui:light?'light':'dark'}))});
  else if(light)await page.evaluate(()=>document.documentElement.classList.add('light'));
  const values=await page.locator('[data-check]').evaluateAll(els=>els.map(el=>{let p=el,bg='';while(p){const st=getComputedStyle(p);if(st.backgroundImage!=='none'){bg=st.backgroundImage.match(/rgba?\([^)]+\)/)?.[0]||'';break}if(st.backgroundColor!=='rgba(0, 0, 0, 0)'){bg=st.backgroundColor;break}p=p.parentElement}return{text:el.textContent||el.value,color:getComputedStyle(el).color,bg:bg||'rgb(255,255,255)'};}));
  const failures=values.filter(v=>{const a=lum(v.color),b=lum(v.bg);v.ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);return v.ratio<4.5});
  report.push({mode:sample.mode,theme:light?'Daylight':'dark',width,failures});
  const out=path.join(root,'test-results/all-mode-daylight');fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,engine+'-'+sample.mode+'-'+(light?'light':'dark')+'-'+width+'.png')});await page.close();
 }
 console.log(JSON.stringify(report,null,2));assert.ok(report.every(x=>!x.failures.length),'All enabled panel text must have readable contrast');
 console.log('PASS',engine,'all five controllers in both themes (isolated real CSS, not physical-device gameplay)');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
