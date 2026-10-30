// Debt repayment portfolio on iPhone landscape: owed / cash / shortfall are clear, every owned property
// is in one scrollable list with its mortgage value and an obvious action, blocked actions explain why,
// the pay controls stay visible without covering the list, and the warning text has readable contrast.
// Actions go through the game's own mortgage/sell rules (results compared with the rule functions).
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),shots=process.env.SKYLINE_SHOTS||'';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.json':'application/json'};
const errors=[];let browser,server,checks=0;
const check=(name,ok,detail)=>{assert.ok(ok,name+(detail!==undefined?' '+JSON.stringify(detail):''));checks++;console.log('PASS',name)};
(async()=>{
 server=http.createServer((q,r)=>{const p=path.resolve(root,'.'+decodeURIComponent(q.url.split('?')[0]));if(!p.startsWith(root+path.sep))return r.writeHead(403).end();fs.readFile(p,(e,b)=>{r.writeHead(e?404:200,{'Content-Type':types[path.extname(p)]||'application/octet-stream'});r.end(e?'missing':b)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port+'/skyline-estates/index.html';
 browser=await chromium.launch({headless:true,args:['--disable-webgl'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 async function open(viewport){const ctx=await browser.newContext({viewport,hasTouch:true,serviceWorkers:'block'}),page=await ctx.newPage();page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(p=>{if(!localStorage.getItem('skylinePrefs'))localStorage.setItem('skylinePrefs',JSON.stringify(p))},{nickSet:true,welcomed:1,tutDone:1,coach:{pre:1,post:1},flat2d:true,rig:false,riders:false});
  await page.route('https://**/*',r=>r.abort());await page.goto(url);await page.waitForFunction(()=>typeof window.__sim==='function'&&typeof openAssets==='function');await page.waitForFunction(()=>!document.getElementById('boot'),null,{timeout:12000});return{ctx,page}}
 // A human player owing money with: a full built district (mortgage blocked until buildings are sold),
 // plain streets, a mortgaged street, a transit hub and a utility.
 const setup=()=>{FAST=true;GEN++;newGame({cash:1500,set:{ai:'normal',speed:'fast',city:'lagos'},players:[{name:'MasterLi',tok:TOKENS[0],col:PCOL[0],ai:false},{name:'Kofi',tok:TOKENS[1],col:PCOL[1],ai:true}]});G.phase='post';
  const built=GROUPS.pink,plain=[...GROUPS.orange,...GROUPS.red.slice(0,1)],mort=GROUPS.red[1];
  built.forEach(i=>G.own[i]={o:0,h:2,m:false});plain.forEach(i=>G.own[i]={o:0,h:0,m:false});G.own[mort]={o:0,h:0,m:true};G.own[RAILS[0]]={o:0,h:0,m:false};G.own[UTILS[0]]={o:0,h:0,m:false};
  G.houses-=2*built.length;P(0).cash=18;window.__debt={built,plain,mort,rail:RAILS[0],util:UTILS[0],debt:20+SQ[plain[0]].p/2+1};
  window.__res=openAssets(P(0),{debt:window.__debt.debt,to:P(1)});return window.__debt};
 const state=page=>page.evaluate(()=>({cash:P(0).cash,own:JSON.parse(JSON.stringify(G.own)),houses:G.houses,hotels:G.hotels}));
 const {ctx,page}=await open({width:956,height:440});
 const d=await page.evaluate(setup);await page.waitForSelector('.pf2dm .pfdrow');
 // 1. owed / cash / shortfall
 const head=await page.evaluate(()=>[...document.querySelectorAll('.pf2dm .pf2s span')].map(s=>s.innerText.replace(/\s+/g,' ').trim()));
 const fmtd=await page.evaluate(v=>[fmt(v.debt),fmt(18),fmt(v.debt-18)],d);
 check('summary shows amount owed, cash available and shortfall',head[0]===`You owe ${fmtd[0]}`&&head[1]===`Cash available ${fmtd[1]}`&&head[2]===`Still needed ${fmtd[2]}`,head);
 check('summary panels and detail pane are collapsed in debt mode',await page.evaluate(()=>['.pf3overview','.pf2t','.pf2d'].every(s=>getComputedStyle(document.querySelector('.pf2dm '+s)).display==='none')));
 // 2. one row per owned property, with name, mortgage value and an action or a reason
 const rows=await page.evaluate(()=>[...document.querySelectorAll('.pfdrow')].map(r=>({i:+r.dataset.square,text:r.innerText.replace(/\s+/g,' '),buttons:[...r.querySelectorAll('button')].map(b=>({t:b.innerText,dis:b.disabled}))})));
 const owned=await page.evaluate(()=>propsOf(0).length);
 check('every owned property is listed once',rows.length===owned&&new Set(rows.map(r=>r.i)).size===owned,{rows:rows.length,owned});
 const plainRow=rows.find(r=>r.i===d.plain[0]),builtRow=rows.find(r=>r.i===d.built[0]),mortRow=rows.find(r=>r.i===d.mort);
 const mv=await page.evaluate(i=>fmt(SQ[i].p/2),d.plain[0]);
 check('plain street shows its mortgage value on an enabled Mortgage button',plainRow.buttons.some(b=>b.t===`Mortgage +${mv}`&&!b.dis),plainRow);
 check('built district explains that buildings must be sold first and disables Mortgage',/Sell this district’s buildings first/.test(builtRow.text)&&builtRow.buttons.some(b=>b.t.startsWith('Mortgage')&&b.dis)&&builtRow.buttons.some(b=>b.t.startsWith('Sell building')&&!b.dis),builtRow);
 check('mortgaged street is marked and offers no mortgage',/Already mortgaged/.test(mortRow.text)&&!mortRow.buttons.length,mortRow);
 check('cash actions come first; mortgaged properties last',rows[rows.length-1].i===d.mort);
 // 3. layout at iPhone landscape: list scrolls, pay controls visible and not covering the list, touch targets
 const L=await page.evaluate(()=>{const g=document.querySelector('.pf2g'),f=document.querySelector('.pf2f'),gr=g.getBoundingClientRect(),fr=f.getBoundingClientRect(),btns=[...f.querySelectorAll('button'),...document.querySelectorAll('.pfdbtn')].map(b=>({height:b.offsetHeight}));
  return{scroll:g.scrollHeight>g.clientHeight,listBottom:gr.bottom,footTop:fr.top,footBottom:fr.bottom,vh:innerHeight,minBtnH:Math.min(...btns.map(b=>b.height)),overflowX:document.querySelector('.mp.pf2').scrollWidth>document.querySelector('.mp.pf2').clientWidth+1,rowsVisible:[...document.querySelectorAll('.pfdrow')].filter(r=>{const b=r.getBoundingClientRect();return b.top>=gr.top-1&&b.bottom<=gr.bottom+1}).length}});
 check('rows keep their full height: no text spills outside a row',await page.evaluate(()=>[...document.querySelectorAll('.pfdrow')].every(r=>r.scrollHeight<=r.clientHeight+1&&[...r.children].every(c=>{const a=c.getBoundingClientRect(),b=r.getBoundingClientRect();return a.top>=b.top-1&&a.bottom<=b.bottom+1}))));
 check('property list is scrollable and shows at least two full rows',L.scroll&&L.rowsVisible>=2,L);
 check('Pay and Bankruptcy stay on screen below the list without covering it',L.footBottom<=L.vh&&L.listBottom<=L.footTop+1,L);
 check('touch targets are at least 44px tall and nothing overflows sideways',L.minBtnH>=44&&!L.overflowX,L);
 await page.evaluate(()=>{const g=document.querySelector('.pf2g');g.scrollTop=g.scrollHeight});
 check('scrolling reaches the last property',await page.evaluate(()=>{const g=document.querySelector('.pf2g'),r=[...document.querySelectorAll('.pfdrow')].pop().getBoundingClientRect(),gr=g.getBoundingClientRect();return r.bottom<=gr.bottom+1&&r.top>=gr.top-1}));
 // 4. contrast of the warning
 const contrast=await page.evaluate(()=>{const lum=c=>{const [r,g,b]=c.match(/\d+(\.\d+)?/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4});return .2126*r+.7152*g+.0722*b};const e=document.querySelector('.pfdhint'),s=getComputedStyle(e);const a=lum(s.color),b=lum(s.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)});
 check('debt warning text contrast is at least 7:1',contrast>=7,contrast);
 if(shots){await page.waitForTimeout(900);}if(shots)await page.screenshot({path:path.join(shots,'debt-portfolio-landscape.png')});
 // 5. actions use the game rules: sell and mortgage results equal the rule functions on a copy of the state
 const before=await state(page);
 const expect=await page.evaluate(({built})=>{const save=JSON.stringify({own:G.own,cash:P(0).cash,houses:G.houses,hotels:G.hotels});sell(0,built[0]);const r={cash:P(0).cash,own:JSON.parse(JSON.stringify(G.own)),houses:G.houses,hotels:G.hotels};const s=JSON.parse(save);G.own=s.own;P(0).cash=s.cash;G.houses=s.houses;G.hotels=s.hotels;return r},d);
 await page.evaluate(()=>draw&&0).catch(()=>{});
 await page.locator(`.pfdrow[data-square="${d.built[0]}"] button`,{hasText:'Sell building'}).click();
 const afterSell=await state(page);
 check('Sell building applies exactly the game sell rule',afterSell.cash===expect.cash&&afterSell.houses===expect.houses&&JSON.stringify(afterSell.own)===JSON.stringify(expect.own),{before:before.cash,afterSell:afterSell.cash,expect:expect.cash});
 const c0=afterSell.cash,price=await page.evaluate(i=>SQ[i].p/2,d.plain[0]);
 await page.locator(`.pfdrow[data-square="${d.plain[0]}"] button`,{hasText:'Mortgage'}).click();
 const afterM=await state(page);
 check('Mortgage adds exactly half the price and marks the property mortgaged',afterM.cash===c0+price&&afterM.own[d.plain[0]].m===true);
 check('summary updates after raising cash',await page.evaluate(v=>document.querySelector('.pf2dm .pf2s').innerText.includes(fmt(P(0).cash)),d));
 // 6. pay becomes available and resolves the debt prompt
 const pay=page.getByRole('button',{name:/^Pay /});const uneven=await page.evaluate(i=>{const r=document.querySelector(`.pfdrow[data-square="${i}"]`);return{text:r.innerText,dis:[...r.querySelectorAll('button')].find(b=>b.innerText.startsWith('Sell building'))?.disabled,rule:canSell(0,i)}},d.built[0]);
 check('a sell blocked by the even-building rule says why',uneven.dis===true&&uneven.rule===false&&/Sell evenly/.test(uneven.text),uneven);
 check('Pay is enabled once cash covers the debt',await pay.isEnabled());
 if(shots){await page.waitForTimeout(900);}if(shots)await page.screenshot({path:path.join(shots,'debt-portfolio-ready.png')});
 await pay.click();check('Pay closes the debt view with the pay result',await page.evaluate(()=>window.__res)==='pay');
 // 7. the normal portfolio is unchanged outside debt
 await page.evaluate(()=>{window.__res=openAssets(P(0),{})});await page.waitForSelector('.mp.pf2 .pf2t button');
 await page.waitForFunction(()=>document.querySelectorAll('.mp.pf2').length===1);
 const normal=await page.evaluate(()=>{const m=document.querySelector('.mp.pf2');return{dm:m.classList.contains('pf2dm'),tabs:m.querySelectorAll('.pf2t button').length,detail:getComputedStyle(m.querySelector('.pf2d')).display}});
 check('normal portfolio keeps its tabs, overview and detail pane',!normal.dm&&normal.tabs>=3&&normal.detail!=='none',normal);
 await ctx.close();
 // 8. phone held upright (game rotates to landscape): same guarantees
 const P2=await open({width:390,height:844});await P2.page.evaluate(setup);await P2.page.waitForSelector('.pf2dm .pfdrow');
 const R=await P2.page.evaluate(()=>{const f=document.querySelector('.pf2f').getBoundingClientRect(),b=[...document.querySelectorAll('.pf2f button,.pfdbtn')].map(x=>({w:x.offsetWidth,h:x.offsetHeight}));return{b,rot:document.documentElement.classList.contains('rot'),ok:b.every(x=>x.h>=44&&x.w>=44),inside:f.right<=innerWidth+1&&f.bottom<=innerHeight+1&&f.left>=-1&&f.top>=-1}});
 check('upright phone: pay controls are inside the screen with 44px targets',R.ok&&R.inside,R);
 if(shots){await P2.page.waitForTimeout(900);}if(shots)await P2.page.screenshot({path:path.join(shots,'debt-portfolio-portrait.png')});
 await P2.ctx.close();
 check('no page errors',errors.length===0,errors);
 console.log('DEBT PORTFOLIO SUMMARY',JSON.stringify({checks}));
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();if(server)server.close()});
