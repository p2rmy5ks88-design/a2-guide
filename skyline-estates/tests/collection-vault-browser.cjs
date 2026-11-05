// Collection reference layout and persistent SC contract, using isolated QA profiles only.
'use strict';
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=path.resolve(process.env.COLLECTION_BASE||path.join(__dirname,'..')),out=process.env.RUNNER_TEMP||'/tmp/skyline-collection',engine=process.env.VISUAL_ENGINE||'chromium';fs.mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],engine},check=(name,ok)=>{assert.ok(ok,name);report.checks.push(name);console.log('PASS',name)};
let browser;
(async()=>{
 browser=await({chromium,webkit}[engine]).launch({headless:true,...(engine==='chromium'?{executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox','--disable-webgl']}:{})});
 const c=await browser.newContext({viewport:{width:1420,height:1100},hasTouch:true,serviceWorkers:'block'}),p=await c.newPage();p.on('pageerror',e=>report.errors.push(String(e.stack||e)));
 await c.route('https://**/*',r=>{const u=new URL(r.request().url());if(u.origin!=='https://collection.invalid')return r.abort();const f=path.resolve(base,'.'+(u.pathname==='/'?'/index.html':u.pathname));if(!f.startsWith(base+path.sep))return r.abort();try{return r.fulfill({contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'})[path.extname(f)]||'application/octet-stream',body:fs.readFileSync(f)})}catch{return r.fulfill({status:404,body:'missing'})}});
 await c.addInitScript(()=>{if(!localStorage.getItem('skylinePrefs'))localStorage.setItem('skylinePrefs',JSON.stringify({nick:'Collection QA',nickSet:true,welcomed:1,tutDone:1,flat2d:true,rig:false,riders:false,coins:4125,xp:2000,trophies:0,scReserve:2000,tokTierV:1,tokLv:{'🚕':4,'🚌':3,'🛺':2},tokWins:{'🚕':9,'🚌':40},inv:{tok:{'🚕':1},fin:{gold:1}},eq:{fin:'gold',char:'kofi'},tokenMastery:{version:1,tokens:{'🚕':{xp:1400,games:12},'🚌':{xp:600,games:40}},receipts:{}}}))});
 const ready=()=>p.waitForFunction(()=>window.SkylineCollectionSC&&!document.querySelector('#boot'));
 await p.goto('https://collection.invalid/');await ready();await p.evaluate(()=>{setup.slots[0].tok='🚕';homeTab('collection')});
 const images=()=>p.locator('img:visible').evaluateAll(es=>Promise.all(es.map(e=>e.decode().catch(()=>{}))));await images();
 if(process.env.COLLECTION_BEFORE){await p.screenshot({path:path.join(out,'collection-before.png')});await c.close();return}

 const before=await p.evaluate(()=>({profile:JSON.stringify({...PREF,lastOpen:undefined}),balance:SkylineCollectionSC.balance()}));
 check('three Collection categories (Characters removed)',JSON.stringify(await p.locator('.subtabs .stab').allTextContents())===JSON.stringify(['Tokens','Frames','Buildings']));
 check('real token inventory is a grid',await p.locator('.rf-token-card').count()===await p.evaluate(()=>TOKENS.concat(NEW_TOKENS).length));
 check('six real evolution stages and seven cosmetic finishes',await p.locator('[data-stage]').count()===6&&await p.locator('[data-finish]').count()===7);
 check('XP is accumulated / next milestone and price is saved SC',/1,400 \/ 3,000 XP/.test(await p.locator('.rf-xp-total').innerText())&&/SC 900M/.test(await p.locator('[data-sc-cost]').innerText()));
 check('wins eligibility is explicit',/20 wins/.test(await p.locator('[data-sc-reason]').innerText())&&await p.locator('[data-token-upgrade]').isDisabled());
 await p.screenshot({path:path.join(out,'collection-after-desktop.png')});
 for(const vp of [{width:1420,height:900},{width:956,height:440},{width:844,height:390},{width:667,height:320},{width:390,height:844}]){
  await p.setViewportSize(vp);await p.evaluate(()=>homeTab('tokens'));await images();
  const g=await p.evaluate(()=>{const rect=s=>document.querySelector(s).getBoundingClientRect().toJSON();return{grid:rect('.rf-token-grid'),detail:rect('.rf-token-detail'),nav:rect('.collection-nav-handle'),overflow:document.documentElement.scrollWidth>innerWidth+1,rail:document.querySelector('.rail').hidden}});
  check('usable nonoverlapping panels and collapsed dock '+vp.width,!g.overflow&&g.rail&&g.grid.height>65&&(vp.width===390||g.grid.right<=g.detail.x+1)&&g.grid.bottom<=g.nav.y+1);
  await p.waitForTimeout(400);await p.locator('[data-token-upgrade]').scrollIntoViewIfNeeded();const box=await p.locator('[data-token-upgrade]').boundingBox();check('48px upgrade reachable above navigation '+vp.width,box.height>=48&&box.y>=0&&box.y+box.height<=g.nav.y+1);
  if(vp.width===844){await p.screenshot({path:path.join(out,'collection-after-iphone-upgrade.png')});await p.locator('.rf-token-hero').scrollIntoViewIfNeeded();await p.screenshot({path:path.join(out,'collection-after-iphone.png')})}
  await p.getByRole('button',{name:'Open profile menu',exact:true}).click();await p.keyboard.press('Escape');await p.locator('.collection-nav-handle').tap();check('navigation can be revealed '+vp.width,await p.locator('.rail').isVisible());await p.keyboard.press('Escape');check('Escape collapses navigation and restores focus '+vp.width,await p.locator('.rail').isHidden()&&await p.locator('.collection-nav-handle').evaluate(e=>e===document.activeElement));
 }
 await p.setViewportSize({width:1420,height:900});await p.evaluate(()=>homeTab('tokens'));
 await p.locator('[data-filter=lock]').click();check('locked filter uses real ownership',await p.locator('.rf-token-card').count()===await p.evaluate(()=>TOKENS.concat(NEW_TOKENS).filter(t=>!tokenUnlocked(t)).length));
 await p.locator('[data-filter=own]').click();check('owned filter uses real ownership',await p.locator('.rf-token-card').count()===await p.evaluate(()=>TOKENS.concat(NEW_TOKENS).filter(tokenUnlocked).length));await p.locator('[data-filter=all]').click();
 await p.getByLabel('Sort tokens').selectOption('progression');check('XP sorting',await p.locator('.rf-token-card').first().getAttribute('data-token')==='🚕');
 for(const tab of ['frames','buildings']){await p.evaluate(t=>homeTab(t),tab);check(tab+' has a selectable browser and showcase',await p.locator('[data-catalog-item]').count()>0&&await p.locator('.rf-catalog-hero').count()===1);await p.locator('[data-catalog-item]').last().click();check(tab+' selection updates without navigating',await p.evaluate(t=>setup.tab===t,tab));if(tab==='cast'){await p.getByRole('button',{name:'Open profile menu',exact:true}).click();await p.keyboard.press('Escape')} }
 check('browsing did not change saved progression, inventory or wallet',await p.evaluate(b=>JSON.stringify({...PREF,lastOpen:undefined})===b.profile&&SkylineCollectionSC.balance()===b.balance,before));
 await p.evaluate(()=>homeTab('tokens'));await p.locator('[data-token="🚌"]').click();await p.locator('[data-stage="6"]').click();check('future stage previews do not equip',/not equipped/.test(await p.locator('.rf-perk-heading').innerText()));
 const money=await p.evaluate(()=>({coins:PREF.coins,sc:SkylineCollectionSC.balance(),level:tokLv('🚌'),xp:tokenMastery('🚌').xp}));
 await p.locator('[data-token-upgrade]').click();await p.getByRole('button',{name:'Cancel',exact:true}).click();check('cancel does not charge',await p.evaluate(m=>SkylineCollectionSC.balance()===m.sc,money));
 await p.locator('[data-token-upgrade]').click();await p.getByRole('button',{name:'Confirm upgrade',exact:true}).click();await p.waitForFunction(()=>tokLv('🚌')===4);
 check('upgrade spends exact saved SC and leaves Coins and XP intact',await p.evaluate(m=>SkylineCollectionSC.balance()===m.sc-360&&PREF.coins===m.coins&&tokenMastery('🚌').xp===m.xp,money));
 const duplicate=await p.evaluate(async()=>{const n=SkylineCollectionSC.balance();try{await upgradeCollection('token','🚌',3);return false}catch{return SkylineCollectionSC.balance()===n}});check('stale second click cannot charge',duplicate);
 await p.reload();await ready();check('paid progression and wallet survive reload',await p.evaluate(m=>tokLv('🚌')===4&&SkylineCollectionSC.balance()===m.sc-360&&PREF.coins===m.coins,money));
 await p.evaluate(()=>{delete PREF.tokLv['🚌'];savePref()});await p.reload();await ready();check('receipt repairs restored old profile without another charge',await p.evaluate(m=>tokLv('🚌')===4&&SkylineCollectionSC.balance()===m.sc-360,money));
 await p.evaluate(()=>homeTab('tokens'));await p.locator('.collection-nav-handle').click();await p.getByRole('tab',{name:'Shop',exact:true}).click();check('leaving Collection restores regular dock',await p.locator('.rail').isVisible()&&await p.locator('.collection-nav-handle').count()===0);
 await p.evaluate(()=>{homeTab('tokens');document.documentElement.classList.add('rot')});check('Collection portrait override is restricted to the visible menu',await p.evaluate(()=>{const title=document.querySelector('#title'),shown=getComputedStyle(document.body).transform;title.hidden=true;const playing=getComputedStyle(document.body).transform;title.hidden=false;document.documentElement.classList.remove('rot');return shown==='none'&&playing!=='none'}));
 check('no browser exceptions',report.errors.length===0);await c.close();
})().catch(e=>{report.failure=String(e.stack||e);console.error(e);process.exitCode=1}).finally(async()=>{fs.writeFileSync(path.join(out,'collection-'+engine+'.json'),JSON.stringify(report,null,2));await browser?.close();console.log('COLLECTION',report.checks.length,'checks')});
