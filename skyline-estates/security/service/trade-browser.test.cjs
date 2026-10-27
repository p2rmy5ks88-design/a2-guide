const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'../../tests/node_modules/playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {proposeTrade,respondTrade,sourceHash}=require('./trade-kernel.cjs'),{cases}=require('./trade-cases.cjs');
const root=path.resolve(__dirname,'../../..'),report={sourceHash,checks:[],browserErrors:[],failure:null};
(async()=>{let browser;const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':file.endsWith('.html')?'text/html':'application/octet-stream'});res.end(e?'Missing':b)})});
 try{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});const page=await browser.newPage({serviceWorkers:'block'});page.on('pageerror',e=>report.browserErrors.push(String(e.stack||e)));
  await page.addInitScript(()=>localStorage.setItem('skylinePrefs',JSON.stringify({nickSet:true,welcomed:1})));await page.goto(`http://127.0.0.1:${server.address().port}/skyline-estates/index.html`);await page.waitForFunction(()=>typeof window.__sim==='function');
  const expected=[];for(const c of cases()){let r=proposeTrade(c.game,c.game.players[c.game.turn].uid,c.offer);const responses=[];expected.push({...c,name:c.name+' offered',responses:[],result:r});for(const x of c.responses){responses.push(x);r=respondTrade(r.game,r.game.players[r.boundary.seat].uid,r,x.decision,r.boundary.offerHash,x.offer);expected.push({...c,name:c.name+' reply '+responses.length,responses:responses.slice(),result:r})}}
  const actual=await page.evaluate(async inputs=>{
   const original=resolveTrade;class Pause extends Error{}
   renderRoster=()=>{};updateCell=()=>{};float=()=>{};sfx=()=>{};toast=()=>{};pushState=()=>{};figG=()=>{};trackable=()=>false;isRemote=()=>false;sleep=async()=>{};tradeSummary=()=>'';
   const out=[];
   for(const c of inputs){FAST=true;GEN++;G=JSON.parse(JSON.stringify(c.game));NET.on=false;NET.me=G.players[G.turn].uid;applyCity(G.set.city||'lagos');let answer=0,current=null,pending=null,accepted=false;
    resolveTrade=async(t,depth=0)=>{current={offer:t,depth};return original(t,depth)};
    modal=async()=>{const x=c.responses[answer];if(!x){pending=JSON.parse(JSON.stringify(current));throw new Pause()}answer++;return x.decision==='accept'?'yes':x.decision==='counter'?'counter':'no'};
    tradeEditor=async()=>{const x=c.responses[answer-1];if(x?.decision!=='counter')throw Error('Unexpected trade editor');return{from:current.offer.to,...x.offer}};
    try{accepted=await resolveTrade({from:G.turn,...c.offer})}catch(e){if(!(e instanceof Pause))throw e}
    if(answer!==c.responses.length)throw Error('Unconsumed source response '+c.name);out.push({game:JSON.parse(JSON.stringify(G)),pending,accepted});
   }return out;
  },expected.map(({result,...c})=>c));
  expected.forEach((c,i)=>{assert.deepEqual(actual[i].game,c.result.game,c.name+' full source game');assert.deepEqual(actual[i].pending,c.result.boundary?{offer:c.result.boundary.offer,depth:c.result.boundary.depth}:null,c.name+' source offer/depth');if(!c.result.boundary)assert.equal(actual[i].accepted,c.responses.at(-1).decision==='accept');report.checks.push({name:c.name,passed:true})});assert.deepEqual(report.browserErrors,[]);console.log('TRADE BROWSER SUMMARY',JSON.stringify({checks:report.checks.length,scenarios:cases().length,browserErrors:0,sourceHash}));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{report.failure=String(e.stack||e);console.error(e);process.exitCode=1}).finally(()=>fs.writeFileSync(process.argv[2]||path.join(__dirname,'../trade-browser-results.json'),JSON.stringify(report,null,2)+'\n'));
