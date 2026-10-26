// Run: npm install --no-save playwright; npx playwright install chromium
// node skyline-estates/tests/stability.cjs [output.json]
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
(async()=>{
  const server=http.createServer((req,res)=>{
    const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
    fs.readFile(file,(error,body)=>{res.writeHead(error?404:200,{'Content-Type':file.endsWith('.html')?'text/html':'application/octet-stream'});res.end(error?'Not found':body)})
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
    const page=await browser.newPage({serviceWorkers:'block'});const errors=[];
    page.on('pageerror',error=>errors.push(error.stack||String(error)));
    // Skip first-launch welcome: simulations change GEN and would cancel its pending sleep.
    await page.addInitScript(()=>localStorage.setItem('skylinePrefs',JSON.stringify({nickSet:true,welcomed:1})));
    await page.goto(`http://127.0.0.1:${server.address().port}/skyline-estates/index.html`);
    await page.waitForFunction(()=>typeof window.__sim==='function');
    const regressions=await page.evaluate(async()=>{
      const checks=[];const check=(name,value)=>{if(!value)throw Error(name);checks.push(name)};
      const reset=()=>{FAST=true;newGame({cash:1600,set:{},players:[0,1].map(i=>({name:'P'+i,ai:true}))});G.sim=true;G.players.forEach(p=>p.cash=1600)};
      const deal=()=>({from:0,to:1,give:[],get:[],gc:0,rc:0,gcard:0,rcard:0});
      reset();
      for(const [name,change] of [
        ['negative cash',{gc:-2000}],['NaN cash',{gc:NaN}],['infinite cash',{rc:Infinity}],
        ['overdraw',{gc:1601}],['self trade',{to:0}],['missing player',{to:99}],
        ['invalid property',{give:[999]}],['missing property list',{give:null}],['invalid card count',{gcard:-1}],
        ['missing bail pass',{gcard:1}]
      ]){const t={...deal(),...change},before=JSON.stringify(G);check(name+' rejected',!validTrade(t)&&executeTrade(t)===false);check(name+' leaves state intact',JSON.stringify(G)===before)}
      const group=Object.values(GROUPS)[0],i=group[0];group.forEach(j=>G.own[j].o=0);
      G.own[group[1]].h=1;G.houses--;
      check('cannot trade street from developed group',!validTrade({...deal(),give:[i]}));
      G.own[group[1]].h=0;G.houses++;
      check('duplicate property rejected',!validTrade({...deal(),give:[i,i]}));
      const t={...deal(),give:[i],gc:100};check('normal offer valid',validTrade(t));
      P(0).cash=50;check('stale cash rejected at execution',executeTrade(t)===false&&G.own[i].o===0);
      P(0).cash=1600;const result=executeTrade(t);check('valid trade succeeds '+JSON.stringify({result,owner:G.own[i].o,cash:G.players.map(p=>p.cash)}),result===true&&G.own[i].o===1&&P(0).cash===1500&&P(1).cash===1700);
      reset();P(0).goojf.push({deck:'chance',idx:0});check('bail pass transfer',executeTrade({...deal(),gcard:1})===true&&P(0).goojf.length===0&&P(1).goojf.length===1);
      for(const mode of ['classic','quick','timed']){
        newGame({cash:1600,set:{mode,rounds:20,city:'lagos'},players:[0,1,2,3].map(i=>({name:NAMES[i],tok:TOKENS[i],col:PCOL[i],ai:true}))});
        check(mode+' real game save succeeds',save());check(mode+' real game round-trips',JSON.stringify(loadSave())===JSON.stringify(G));
      }
      const legacy=JSON.stringify(G);localStorage.setItem(SKEY,legacy);check('real legacy save loads',JSON.stringify(loadSave())===legacy);
      check('real save migrates on write',save()&&JSON.parse(localStorage.getItem(SKEY)).saveVersion===SAVE_VERSION);
      localStorage.setItem(SKEY,'{broken');check('real corrupt primary recovers backup',JSON.stringify(loadSave())===legacy);
      // Finish cleanup so seeded games use an independent in-memory state.
      clearSave();
      FAST=false;
      const random=Math.random,handler=()=>{};window.__onErr=handler;
      const first=await window.__sim(3,4,{seed:42}),second=await window.__sim(3,4,{seed:42});
      check('seed replay identical',JSON.stringify(first)===JSON.stringify(second));
      check('simulation restores globals',Math.random===random&&window.__onErr===handler&&FAST===false);
      // Exercise cleanup if setup throws after FAST and seeded random are set.
      const original=newGame;newGame=()=>{throw Error('injected setup failure')};let thrown=false;
      try{await window.__sim(1,4,{seed:42})}catch(e){thrown=e.message==='injected setup failure'}finally{newGame=original}
      check('simulation restores globals after exception',thrown&&Math.random===random&&window.__onErr===handler&&FAST===false);
      return checks;
    });
    const cases=[['classic',100,{mode:'classic'}],['quick',25,{mode:'quick'}],['timed',25,{mode:'timed',rounds:20}],['optional',25,{mode:'classic',ffa:true,even:false,events:true,speedDie:true,pot:true,goDouble:true,jailRent:true,auction:false,interest:false,perks:false,minigames:false}]];
    const batches=[];
    for(const [name,count,set] of cases){const seed=20261026;const runs=await page.evaluate(({count,seed,set})=>window.__sim(count,4,{seed,set}),{count,seed,set});batches.push({name,seed,set,runs});console.log(name,count,'runs complete')}
    const report={testedAt:new Date().toISOString(),browser:browser.version(),pageErrors:errors,regressions,batches};
    const output=process.argv[2]||path.join(root,'skyline-estates/test-results/phase1.json');fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
    assert.equal(errors.length,0,'browser exceptions');
    for(const batch of batches)for(const run of batch.runs){assert.equal(run.err,null,`${batch.name} run ${run.run}`);assert.ok(run.cashOk&&run.houseBank&&run.hotelBank,`${batch.name} run ${run.run}: invariant`)}
    console.log(`${regressions.length} regression checks; ${batches.reduce((n,b)=>n+b.runs.length,0)} games passed. Report: ${output}`);
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});




