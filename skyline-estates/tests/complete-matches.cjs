// Ordinary setup, visible human controls, seeded randomness; no injected game state.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),report={matches:[],errors:[]},delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!f.startsWith(root+path.sep)){res.writeHead(403).end();return}fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':f.endsWith('.html')?'text/html':f.endsWith('.js')?'text/javascript':'application/octet-stream'});res.end(e?'missing':b)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});report.browser=browser.version();
  for(const [mode,seed] of [['classic',41603],['quick',41604],['timed',41605]]){
   const n=mode==='quick'?3:2,m={mode,seed,actions:[],checks:[],samples:0,resumed:false};report.matches.push(m);
   const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1280,height:900},storageState:{cookies:[],origins:[{origin,localStorage:[{name:'skylinePrefs',value:JSON.stringify({flat2d:true,nickSet:true,welcomed:1})}]}]}});
   await context.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());const page=await context.newPage();page.setDefaultTimeout(5000);page.on('pageerror',e=>report.errors.push({mode,error:String(e.stack||e)}));
   const btn=(name,scope=page)=>scope.getByRole('button',{name,exact:typeof name==='string'});
   const check=(name,ok)=>{assert.ok(ok,name);m.checks.push(name);console.log('PASS',mode,name)};
   async function click(target,label){await target.click();m.actions.push(label)}
   async function snap(){return page.evaluate(()=>({players:G.players.map(p=>({id:p.id,name:p.name,cash:p.cash,pos:p.pos,bankrupt:p.bankrupt,ai:p.ai})),own:G.own.map((o,i)=>({...o,name:SQ[i].n,price:SQ[i].p||0,cost:SQ[i].h||0})),round:G.round,turn:G.turn,phase:G.phase,over:G.over,houses:G.houses,hotels:G.hotels,fast:FAST,errors:window.matchErrors||[],dice:window.matchDice||[],saveCleared:!localStorage.getItem(SKEY)&&!localStorage.getItem(SAVE_BACKUP)}))}
   function invariant(s){assert.ok(s.players.every(p=>Number.isFinite(p.cash)&&p.cash>=0),'finite nonnegative cash');assert.ok(Number.isInteger(s.houses)&&s.houses>=0&&Number.isInteger(s.hotels)&&s.hotels>=0);assert.equal(s.houses+s.own.reduce((v,o)=>v+(o.h===5?0:o.h),0),36,'house conservation');assert.equal(s.hotels+s.own.filter(o=>o.h===5).length,12,'tower conservation');assert.equal(s.own.length,40);assert.ok(s.own.every(o=>Number.isInteger(o.o)&&o.o>=-1&&o.o<s.players.length&&Number.isInteger(o.h)&&o.h>=0&&o.h<=5));assert.equal(s.errors.length,0);m.samples++}
   async function plan(pid,debt){return page.evaluate(({pid,debt})=>{const p=P(pid),list=propsOf(pid);let i=debt?list.find(i=>canSell(pid,i)):list.find(i=>canBuild(pid,i)&&p.cash-SQ[i].h>=200);if(i!==undefined)return{name:SQ[i].n,action:debt?'sell':'build'};i=debt?list.find(i=>canMortgage(pid,i)):list.find(i=>canUnmort(pid,i)&&p.cash-unmCost(i)>=200);return i===undefined?null:{name:SQ[i].n,action:debt?'mortgage':'redeem'}},{pid,debt})}
   async function propertyAction(p){const pf=page.locator('.pf2');await pf.locator('.pf2row:not(.lock)').filter({hasText:p.name}).first().click();await click(btn({sell:/^Sell /,build:/^Build (house|tower)/,mortgage:/^Mortgage/,redeem:/^Redeem /}[p.action],pf),'property '+p.action+' '+p.name)}
   try{
    await page.goto(origin+'/skyline-estates/index.html');await page.waitForFunction(()=>typeof window.__sim==='function');await page.locator('#boot').waitFor({state:'detached',timeout:15000});await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}.ov.bye{display:none!important}'});
    await click(page.locator('#qPP'),'Pass and play');for(let i=0;i<6;i++)await page.locator(`[data-type="${i}:${i<n?'human':'off'}"]`).click();for(let i=0;i<n;i++)await page.locator(`[data-name="${i}"]`).fill('Seat '+i);
    await btn('Continue →').click();await page.locator(`[data-mode="${mode}"]`).click();for(const k of ['minigames','perks']){const b=page.locator(`[data-toggle="${k}"]`);if(await b.getAttribute('aria-pressed')==='true')await b.click()}
    if(mode==='timed')await btn('10',page.locator('#seRounds')).click();await page.locator('summary').filter({hasText:'More house rules'}).click();await btn('Fast',page.locator('#seSpeed')).click();await btn('Continue →').click();
    await page.evaluate(seed=>{let r=seed>>>0;Math.random=()=>((r=(Math.imul(r,1664525)+1013904223)>>>0)/4294967296);sleep=()=>{const g=GEN;return Promise.resolve().then(()=>{if(g!==GEN)throw new Abort()})};window.matchErrors=[];window.matchDice=[];window.__onErr=e=>window.matchErrors.push(String(e.stack||e));const original=rollDice;rollDice=async(...args)=>{const d=await original(...args);window.matchDice.push([...d]);return d}},seed);
    await click(btn('Start game'),'Start game');await page.locator('.keysm').waitFor();const initial=await snap();m.initial=initial;invariant(initial);
    check('ordinary human starting state',!initial.fast&&initial.players.length===n&&initial.players.every(p=>!p.ai&&!p.bankrupt&&p.pos===0&&(p.cash===1600||p.cash===1700))&&initial.players.reduce((v,p)=>v+p.cash,0)===1600*n+100&&initial.houses===36&&initial.hotels===12);
    check('normal starting deeds',initial.players.every(p=>initial.own.filter(o=>o.o===p.id).length===(mode==='quick'?2:0)));
    await click(btn('Let’s go'),'Skyline Keys go');let managed='',lastAction=Date.now(),started=Date.now();
    for(let step=0;step<6000;step++){
     const s=await snap();invariant(s);m.final=s;if(s.over)break;assert.ok(Date.now()-started<210000,'match time bound; incomplete outcome');assert.ok(s.round<251,'round bound; incomplete outcome');
     const pf=page.locator('.pf2'),active=page.locator('#modals .ov:not(.bye)').last();let acted=false;
     if(await pf.isVisible()){
      const debt=pf.locator('.pf2debt .debt');if(await debt.isVisible()){const pay=btn(/^Pay /,pf);if(await pay.isEnabled())await click(pay,'pay debt');else{const text=await debt.innerText(),who=s.players.find(p=>text.startsWith(p.name+':'));const p=await plan(who?who.id:s.turn,true);if(p)await propertyAction(p);else await click(btn('Declare bankruptcy',pf),'bankruptcy')}}else{const p=await plan(s.turn,false);if(p)await propertyAction(p);else await click(btn('Close',pf),'close portfolio')}acted=true;
     }else if(await page.locator('.auc').isVisible()){
      const auc=page.locator('.auc .abar'),name=await auc.locator('.mtxt b').first().innerText(),bid=btn(/^Bid /,auc).first();if(name==='Seat 0'&&s.players[0].cash>100&&await bid.isEnabled())await click(bid,'bid Seat 0');else await click(btn('Drop out',auc),'drop '+name);acted=true;
     }else if(await active.isVisible()){
      const buy=btn(/^Buy for /,active);if(await buy.count()){const price=s.own[s.players[s.turn].pos].price;if(s.turn===0&&s.players[0].cash-price>=100&&await buy.isEnabled())await click(buy,'buy');else await click(btn('Auction',active),'auction');acted=true}else{for(const name of ['OK','Continue','Let’s go','Not now','Later','Close']){const b=btn(name,active);if(await b.count()&&await b.isVisible()&&await b.isEnabled()){await click(b,'modal '+name);acted=true;break}}}
     }else{
      const end=btn(/END.*TURN/i),roll=btn('Roll dice');if(await end.isVisible()){const key=s.round+':'+s.turn;if(s.turn===0&&managed!==key&&await plan(0,false)){managed=key;await page.locator('#modals .ov').waitFor({state:'detached'});await click(page.locator('#bAssets'),'open portfolio')}else if(!m.resumed&&s.round>=2){const before=await snap();await page.locator('#modals .ov').waitFor({state:'detached'});await page.locator('#bMenu').click();await btn('Save & exit').click();await page.getByRole('tab',{name:'Play',exact:true}).click();await page.locator('#tCont').click();await end.waitFor();const after=await snap();for(const k of ['players','own','round','turn','phase','houses','hotels'])assert.deepEqual(after[k],before[k],'resume '+k);m.resumed=true;m.actions.push('save and continue')}else await click(end,'end turn');acted=true}else if(await roll.isVisible()&&await roll.isEnabled()){await click(roll,'roll dice');acted=true}
     }
     if(acted)lastAction=Date.now();else{assert.ok(Date.now()-lastAction<12000,'unhandled controls: '+await page.locator('#modals').innerText());await delay(20)}
    }
    const s=m.final;assert.ok(s.over,'must finish naturally');await page.locator('.endgrid').waitFor();const survivors=s.players.filter(p=>!p.bankrupt),rank=survivors.map(p=>({...p,worth:p.cash+s.own.filter(o=>o.o===p.id).reduce((v,o)=>v+(o.m?o.price/2:o.price)+o.h*o.cost,0)})).sort((a,b)=>b.worth-a.worth);m.winner=rank[0].name;m.rounds=s.round;m.displayedResult=await page.locator('#modals').innerText();
    check('natural terminal outcome',mode==='classic'?survivors.length===1:mode==='quick'?survivors.length<n:s.round===11||survivors.length===1);check('winner displayed and saves cleared',m.displayedResult.includes(m.winner)&&s.saveCleared);check('save and continue preserves the turn',m.resumed);check('cash and building banks hold throughout',m.samples>10&&s.errors.length===0);
    console.log('MATCH',JSON.stringify({mode,seed,rounds:m.rounds,winner:m.winner,decisions:m.actions.length,samples:m.samples}));
   }catch(e){console.log('MATCH FAILURE',JSON.stringify({mode,actions:m.actions.slice(-20),state:m.final,modals:await page.locator('#modals').innerText()}));throw e}finally{await context.close()}
  }
  assert.equal(report.errors.length,0);console.log('19 complete-match checks passed');
 }finally{const out=process.argv[2]||path.join(root,'skyline-estates/test-results/complete-matches.json');fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');if(browser)await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
