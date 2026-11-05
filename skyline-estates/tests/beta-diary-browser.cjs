// Task 15: beta diary is off without consent, records only anonymous counts with consent, ?beta=0 deletes it.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const base='file://'+path.resolve(__dirname,'../index.html');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--disable-webgl'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const ctx=await browser.newContext({viewport:{width:844,height:390}});
 await ctx.addInitScript(()=>{if(!localStorage.getItem('skylinePrefs'))localStorage.setItem('skylinePrefs',JSON.stringify({nick:'Ada',nickSet:true,welcomed:1,tutDone:1,flat2d:true,stats:{games:5}}))});
 const p=await ctx.newPage();await p.route('https://**/*',r=>r.abort());
 const go=async q=>{await p.goto(base+q);await p.locator('#boot').waitFor({state:'detached',timeout:25000})};
 const play=()=>p.evaluate(()=>{GEN++;newGame({cash:1500,set:{ai:'normal',speed:'fast',city:'lagos'},players:[{name:'Ada',tok:TOKENS[0],col:PCOL[0],ai:false},{name:'Kofi',tok:TOKENS[1],col:PCOL[1],ai:true}]})});
 await go('');await play();
 assert.equal(await p.evaluate(()=>localStorage.getItem('skylineBetaDiary')),null,'nothing recorded without consent');
 await go('?beta=1');await p.getByRole('button',{name:'Join the diary'}).click({timeout:8000});
 await play();await p.evaluate(()=>{G.over=true;modal({html:'<div class="endgrid"></div>',btns:[{k:'x',label:'Close'}]})});await p.waitForTimeout(200);
 const s=await p.evaluate(()=>SkylineBetaDiary.summary());
 assert.equal(s.started,1);assert.equal(s.completed,1);assert.ok(s.sessions>=1);
 const raw=await p.evaluate(()=>localStorage.getItem('skylineBetaDiary'));
 assert.ok(!/Ada|Kofi|uid|email/i.test(raw),'no names or identifiers stored: '+raw);
 await go('?beta=0');
 assert.equal(await p.evaluate(()=>localStorage.getItem('skylineBetaDiary')),null,'?beta=0 deletes the diary');
 console.log('BETA DIARY 6 checks');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
