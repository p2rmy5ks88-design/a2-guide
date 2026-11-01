// Gameplay UX: direct in-match builds, complete trade projections and readable Daylight notices.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'../..'),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};
(async()=>{
 const server=http.createServer((q,r)=>{const f=path.resolve(root,'.'+decodeURIComponent(q.url.split('?')[0]));if(!f.startsWith(root+path.sep)){r.writeHead(403);return r.end()}fs.readFile(f,(e,b)=>{r.writeHead(e?404:200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});r.end(e?'missing':b)})});
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const browser=await chromium.launch({headless:true,args:['--disable-webgl'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 let checks=0;const errors=[];
 const ok=(label,value,details)=>{assert.ok(value,label+' '+JSON.stringify(details||{}));checks++;console.log('PASS',label)};
 for(const vp of [{width:1920,height:1080},{width:844,height:390}]){
  const ctx=await browser.newContext({viewport:vp,serviceWorkers:'block'}),page=await ctx.newPage();
  page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{if(!localStorage.getItem('skylinePrefs'))localStorage.setItem('skylinePrefs',JSON.stringify({nick:'Tester',nickSet:true,welcomed:1,tutDone:1,flat2d:true,rig:false,riders:false}))});
  await page.route('https://**/*',r=>r.abort());
  await page.goto('http://127.0.0.1:'+server.address().port+'/skyline-estates/index.html');
  await page.locator('#boot').waitFor({state:'detached',timeout:25000});
  const before=await page.evaluate(()=>{
   FAST=true;GEN++;
   newGame({cash:4500,set:{city:'lagos',mode:'classic',even:true,events2:false,ai:'normal',speed:'fast'},players:[
    {name:'Tester',tok:TOKENS[0],col:PCOL[0],ai:false},{name:'Lucas',tok:TOKENS[1],col:PCOL[1],ai:true}
   ]});
   G.phase='post';G.turn=0;P(0).cash=4500;
   // Display the modal over the game board, not the title screen, in visual tests.
   document.querySelector('#title').hidden=true;document.querySelector('#ui').hidden=false;
   GROUPS.pink.forEach(i=>G.own[i]={o:0,h:0,m:false});
   G.own[GROUPS.orange[0]]={o:0,h:0,m:false};
   const owned=GROUPS.pink[0],cost=devCost(0,owned),cash=P(0).cash,houses=G.houses;
   window.__uxModal=openAssets(P(0));
   return{owned,cost,cash,houses,expected:GROUPS.pink.length,unowned:GROUPS.orange[0]};
  });
  await page.locator('.pf3quick').waitFor();
  const initial=await page.evaluate(()=>({
   count:document.querySelectorAll('[data-quick-build]').length,
   heading:document.querySelector('.pf3quickhead b')?.textContent,
   emptyOwned:!Array.from(document.querySelectorAll('[data-quick-build]')).some(x=>Number(x.dataset.quickBuild)===GROUPS.orange[0]),
   heights:[...document.querySelectorAll('[data-quick-build]')].map(x=>x.getBoundingClientRect().height)
  }));
  ok('Build-now lists only legal buildable properties at '+vp.width,initial.count===before.expected&&initial.heading.includes('('+before.expected+')')&&initial.emptyOwned&&initial.heights.every(h=>h>=40),initial);
  await page.screenshot({path:path.join(process.env.RUNNER_TEMP||'/tmp','skyline-quick-build-'+vp.width+'.png')});
  await page.locator('[data-quick-build="'+before.owned+'"]').click();
  const state=await page.evaluate(i=>({
   level:G.own[i].h,cash:P(0).cash,houses:G.houses,blocked:!canBuild(0,i),
   buildNow:[...document.querySelectorAll('[data-quick-build]')].map(b=>Number(b.dataset.quickBuild))
  }),before.owned);
  ok('Quick House uses canonical build cost, housing supply and even-building restrictions at '+vp.width,
   state.level===1&&state.cash===before.cash-before.cost&&state.houses===before.houses-1&&state.blocked&&!state.buildNow.includes(before.owned),{before,state});
  const towerBefore=await page.evaluate(()=>{
   document.querySelector('#modals').innerHTML='';
   GROUPS.pink.forEach(i=>G.own[i].h=4);
   P(0).cash=4500;G.houses=36-4*GROUPS.pink.length;G.hotels=12;
   const sq=GROUPS.pink[0],cash=P(0).cash,cost=devCost(0,sq),houses=G.houses,hotels=G.hotels;
   window.__uxTowerModal=openAssets(P(0));
   return {sq,cash,cost,houses,hotels};
  });
  await page.locator('[data-quick-build="'+towerBefore.sq+'"]').click();
  const towerAfter=await page.evaluate(i=>({level:G.own[i].h,cash:P(0).cash,houses:G.houses,hotels:G.hotels,saved:loadSave()?.own?.[i]?.h}),towerBefore.sq);
  ok('Quick Tower obeys existing bank supply, costs and saved-game state at '+vp.width,
   towerAfter.level===5&&towerAfter.cash===towerBefore.cash-towerBefore.cost&&
   towerAfter.houses===towerBefore.houses+4&&towerAfter.hotels===towerBefore.hotels-1&&towerAfter.saved===5,
   {towerBefore,towerAfter});
  const trade=await page.evaluate(()=>{
   document.querySelector('#modals').innerHTML='';
   const g=GROUPS.pink,other=GROUPS.orange;
   // Incoming trade: recipient holds two of pink, sender holds the missing third.
   g.forEach((i,j)=>G.own[i]={o:j===g.length-1?1:0,h:0,m:false});
   G.own[other[0]]={o:0,h:0,m:false};
   const t={from:1,to:0,give:[g[g.length-1]],get:[other[0]],gc:0,rc:0,gcard:0,rcard:0};
   const ownersBefore=G.own.map(o=>o.o).join(',');
   const html=tradeSummary(t),ownersAfter=G.own.map(o=>o.o).join(',');
   // Next scenario: outgoing last property breaks recipient's full set.
   g.forEach(i=>G.own[i]={o:0,h:0,m:false});
   const t2={from:1,to:0,give:[other[1]],get:[g[0]],gc:0,rc:0,gcard:0,rcard:0};
   G.own[other[1]]={o:1,h:0,m:false};
   const broken=tradeSummary(t2);
   // Opponent can complete an entire street set with the property we hand over.
   other.forEach((i,j)=>G.own[i]={o:j===other.length-1?0:1,h:0,m:false});
   const t3={from:1,to:0,give:[],get:[other[other.length-1]],gc:0,rc:0,gcard:0,rcard:0};
   const opponent=tradeSummary(t3);
   return {html,broken,opponent,ownersUnchanged:ownersBefore===ownersAfter,n:g.length};
  });
  ok('Trade shows recipient ownership before and after and completed set',trade.html.includes('You currently own '+(trade.n-1)+' of '+trade.n+' streets → '+trade.n+' of '+trade.n)&&trade.html.includes('Completes your set')&&trade.ownersUnchanged,trade);
  ok('Trade warns if outgoing requested property breaks an owned set',trade.broken.includes('Breaks your set')&&trade.broken.includes('Already yours: you own '+trade.n+' of '+trade.n+' streets → '+(trade.n-1)+' of '+trade.n),trade);
  ok('Trade warns when the other player completes a set',trade.opponent.includes('Completes Lucas’s set'),trade.opponent);
  await page.evaluate(()=>{
   document.querySelector('#ui').hidden=false;document.querySelector('#title').hidden=true;
   PREF.ui='light';applyUI();FAST=false;
   setPrompt('<b>Lucas</b> (AI) is managing properties…');
   toast('Rent paid');
   G.set.events2=true;G.ev2Next=6;ev2Chip();
  });
  const contrast=await page.evaluate(()=>{
   const ids=['prompt','round','radio','ev2chip','toast'];
   return ids.map(id=>{const e=document.getElementById(id),s=getComputedStyle(e),b=s.backgroundColor;
    const rgba=b.match(/[\d.]+/g).map(Number),alpha=rgba.length>3?rgba[3]:1;
    return{id,b,alpha,color:s.color,visible:e.getBoundingClientRect().width>0};
   });
  });
  ok('Daylight game notices are opaque and readable at '+vp.width,
    contrast.length===5&&contrast.every(o=>o.alpha>=.97&&o.color!=='rgba(0, 0, 0, 0)'&&o.visible),contrast);
  await page.screenshot({path:path.join(process.env.RUNNER_TEMP||'/tmp','skyline-daylight-notifications-'+vp.width+'.png')});
  ok('No new page errors at '+vp.width,errors.length===0,errors);
  await ctx.close();
 }
 ok('No page errors overall',errors.length===0,errors);
 await browser.close();server.close();console.log('GAMEPLAY UX',checks,'checks');
})().catch(e=>{console.error(e);process.exit(1)});
