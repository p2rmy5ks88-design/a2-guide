// Human decisions use visible controls. Deterministic turn/debt fixtures keep failures reproducible.
// These are focused paths, not complete matches from an ordinary starting position.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),report={testedAt:new Date().toISOString(),checks:[],pageErrors:[],fixtures:[]};
const check=(name,ok)=>{assert.ok(ok,name);report.checks.push(name);console.log('PASS',name)};
(async()=>{
  const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(e?'missing':b)})});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;let browser;
  const roll=p=>p.getByRole('button',{name:'Roll dice',exact:true}),end=p=>p.getByRole('button',{name:/END.*TURN/i});
  const state=p=>p.evaluate(()=>({players:G.players.map(p=>({cash:p.cash,pos:p.pos,bankrupt:p.bankrupt,inJail:p.inJail})),own:G.own,over:G.over,turn:G.turn,round:G.round,alive:alive().length,winner:standings()[0].id,houses:G.houses,hotels:G.hotels,saveCleared:!localStorage.getItem(SKEY)&&!localStorage.getItem(SAVE_BACKUP)}));
  async function fixture(scenario){
    const context=await browser.newContext({viewport:{width:1280,height:800},storageState:{cookies:[],origins:[{origin,localStorage:[{name:'skylinePrefs',value:JSON.stringify({flat2d:true,nickSet:true,welcomed:1})}]}]}});
    await context.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());const page=await context.newPage();page.on('pageerror',e=>report.pageErrors.push({scenario,error:String(e.stack||e)}));
    await page.goto(origin+'/skyline-estates/index.html');await page.waitForFunction(()=>typeof window.__sim==='function');
    const meta=await page.evaluate(scenario=>{
      const mode=scenario==='quick-finish'?'quick':scenario==='timed-finish'?'timed':'classic',n=mode==='quick'?3:2;
      newGame({cash:1600,set:{mode,rounds:1,city:'lagos',ai:'normal',speed:'fast',auction:scenario!=='decline',minigames:false,perks:false,ffa:true,even:true,interest:true},players:Array.from({length:n},(_,i)=>({name:'Flow '+i,tok:TOKENS[i],col:PCOL[i],ai:false}))});
      const quickDeal=mode!=='quick'||G.players.every(p=>propsOf(p.id).length===2);
      G.own.forEach(o=>Object.assign(o,{o:-1,h:0,m:false}));G.first=G.turn=0;G.keysShown=true;G.phase='pre';G.players.forEach(p=>{p.cash=1600;p.pos=0});
      if(scenario==='poor-auction')G.players.forEach(p=>p.cash=5);
      if(['mortgage-debt','rent-bankruptcy','quick-finish'].includes(scenario)){G.players[0].cash=1;G.own[5].o=1}
      if(scenario==='mortgage-debt')G.own[39].o=0;
      if(scenario==='rent-bankruptcy'){G.own[1]={o:0,h:2,m:false};G.houses=34}
      if(scenario==='tax-bankruptcy'){G.players[0].cash=1;G.players[0].pos=1;G.own[1]={o:0,h:2,m:false};G.houses=34}
      if(scenario==='quick-finish')G.players[2].cash=3000;
      if(scenario==='timed-finish'){G.turn=1;G.phase='post';G.players[0].cash=3000}
      if(scenario.startsWith('jail-')){G.players[0].inJail=true;G.players[0].pos=10;if(scenario==='jail-bankruptcy'){G.players[0].jailTurns=2;G.players[0].cash=1}}
      const before=G.players.map(p=>p.cash),price=SQ[5].p,rent=rentFor(5,5),mortgage=SQ[39].p/2,buildingRefund=SQ[1].h, bail=BAIL;
      const dice=scenario==='tax-bankruptcy'?[1,2]:[2,3];rollDice=async()=>dice.slice();save();startWith(G);return{scenario,before,price,rent,mortgage,buildingRefund,bail,quickDeal};
    },scenario);report.fixtures.push(meta);
    if(scenario.startsWith('jail-'))await page.getByRole('button',{name:'Roll for doubles',exact:true}).waitFor({state:'visible',timeout:20000});
    else if(scenario==='timed-finish')await end(page).waitFor({state:'visible',timeout:20000});else await roll(page).waitFor({state:'visible',timeout:20000});
    return{context,page,meta};
  }
  async function run(name,fn){const f=await fixture(name);try{await fn(f)}finally{await f.context.close()}}
  async function finish(page){await page.locator('#modals .endgrid').waitFor({state:'visible',timeout:20000});return state(page)}
  try{
    browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});report.browser=browser.version();
    await run('buy',async({page,meta})=>{
      await roll(page).click();await page.getByRole('button',{name:/^Buy for /}).click();await end(page).waitFor({state:'visible'});let s=await state(page);
      check('buy transfers the landed property and charges its price once',s.own[5].o===0&&s.players[0].cash===meta.before[0]-meta.price&&s.players[0].pos===5);
      await end(page).click();await roll(page).waitFor({state:'visible'});check('End Turn advances to the next human', (await state(page)).turn===1);
      const before=(await state(page)).players.map(p=>p.cash);await roll(page).click();await end(page).waitFor({state:'visible'});s=await state(page);const paid=before[1]-s.players[1].cash;
      check('rent moves positive cash from visitor to owner without loss',paid>0&&s.players[0].cash-before[0]===paid&&s.players.every(p=>p.cash>=0));
    });
    await run('decline',async({page,meta})=>{
      await roll(page).click();await page.getByRole('button',{name:'Don’t buy',exact:true}).click();await end(page).waitFor({state:'visible'});const s=await state(page);
      check('decline with auctions disabled leaves property with bank',s.own[5].o===-1&&s.players[0].cash===meta.before[0]);check('decline does not open an auction when disabled',await page.locator('#modals .auc').count()===0);
    });
    await run('no-bids',async({page,meta})=>{
      await roll(page).click();await page.getByRole('button',{name:'Auction',exact:true}).click();for(let i=0;i<2;i++)await page.locator('.auc .abar').getByRole('button',{name:'Drop out',exact:true}).click();await end(page).waitFor({state:'visible'});const s=await state(page);
      check('all bidders dropping out leaves property unsold',s.own[5].o===-1);check('no-bid auction charges nobody',s.players.every((p,i)=>p.cash===meta.before[i]));
    });
    await run('winning-bid',async({page,meta})=>{
      await roll(page).click();await page.getByRole('button',{name:'Auction',exact:true}).click();await page.locator('.auc .abar').getByRole('button',{name:/^Bid /}).first().click();await page.locator('.auc .abar').getByRole('button',{name:'Drop out',exact:true}).click();await end(page).waitFor({state:'visible'});const s=await state(page);
      check('auction winner receives property for the winning bid',s.own[5].o===0&&s.players[0].cash===meta.before[0]-10);check('auction loser keeps their cash',s.players[1].cash===meta.before[1]);
    });
    await run('poor-auction',async({page,meta})=>{
      await roll(page).click();check('unaffordable purchase is disabled',!await page.getByRole('button',{name:/^Buy for /}).isEnabled());await page.getByRole('button',{name:'Auction',exact:true}).click();await end(page).waitFor({state:'visible'});const s=await state(page);
      check('unfunded auction ends without negative cash or ownership',s.own[5].o===-1&&s.players.every((p,i)=>p.cash===meta.before[i]));
    });
    await run('mortgage-debt',async({page,meta})=>{
      await roll(page).click();await page.getByRole('button',{name:/^Mortgage/i}).click();const pay=page.getByRole('button',{name:/^Pay /});check('mortgaging an asset enables debt payment',await pay.isEnabled());await pay.click();await end(page).waitFor({state:'visible'});const s=await state(page);
      check('mortgage proceeds pay rent exactly once',s.own[39].m&&s.players[0].cash===1+meta.mortgage-meta.rent&&s.players[1].cash===meta.before[1]+meta.rent);check('raising enough money avoids bankruptcy',!s.over&&!s.players[0].bankrupt);
    });
    await run('rent-bankruptcy',async({page,meta})=>{
      await roll(page).click();await page.getByRole('button',{name:'Declare bankruptcy',exact:true}).click();const s=await finish(page);
      check('classic bankruptcy ends with the surviving player winning',s.over&&s.alive===1&&s.winner===1&&s.players[0].bankrupt&&s.players[0].cash===0);
      check('creditor receives remaining cash and half-price building liquidation',s.players[1].cash===meta.before[1]+1+meta.buildingRefund&&s.own[1].o===1&&s.own[1].h===0);
      check('bankruptcy returns buildings to the bank',s.houses===36&&s.hotels===12);check('finished classic game removes both save checkpoints',s.saveCleared);
    });
    await run('tax-bankruptcy',async({page,meta})=>{
      await roll(page).click();await page.getByRole('button',{name:'Declare bankruptcy',exact:true}).click();const s=await finish(page);
      check('bank debt returns property to the bank without paying another player',s.own[1].o===-1&&!s.own[1].m&&s.players[1].cash===meta.before[1]);check('tax bankruptcy conserves house and tower banks',s.houses===36&&s.hotels===12);check('tax bankruptcy displays the surviving winner',s.over&&s.winner===1&&s.saveCleared);
    });
    await run('quick-finish',async({page,meta})=>{
      check('quick mode initially deals two properties to each player',meta.quickDeal);await roll(page).click();await page.getByRole('button',{name:'Declare bankruptcy',exact:true}).click();const s=await finish(page);
      check('quick mode ends on first bankruptcy with multiple survivors',s.over&&s.alive===2);check('quick mode scores richest survivor rather than automatically the creditor',s.winner===2);check('finished quick game removes saves',s.saveCleared);
    });
    await run('timed-finish',async({page})=>{
      await end(page).click();const s=await finish(page);check('timed mode ends after the configured final round',s.over&&s.round===2&&s.alive===2);check('timed mode awards the richest surviving player',s.winner===0);check('finished timed game removes saves',s.saveCleared);
    });
    await run('jail-pay',async({page,meta})=>{
      await page.getByRole('button',{name:/^Pay .* bail/}).click();await roll(page).waitFor({state:'visible'});const s=await state(page);check('paid bail releases the player before a normal roll',!s.players[0].inJail&&s.players[0].pos===10);check('bail is charged exactly once',s.players[0].cash===meta.before[0]-meta.bail);
    });
    await run('jail-bankruptcy',async({page})=>{
      await page.getByRole('button',{name:'Roll for doubles',exact:true}).click();await page.getByRole('button',{name:'Declare bankruptcy',exact:true}).click();const s=await finish(page);check('third failed jail attempt can settle through bankruptcy',s.over&&s.players[0].bankrupt&&s.winner===1);check('bankrupt jailed player receives no further roll',await roll(page).count()===0&&s.saveCleared);
    });
    console.log('Human-flow diagnostics: '+JSON.stringify(report.pageErrors));check('human-flow cases have no page exceptions',report.pageErrors.length===0);console.log(`${report.checks.length} human-flow checks passed`);
  }finally{const output=process.argv[2]||path.join(root,'skyline-estates/test-results/human-flows.json');fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');if(browser)await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
