const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'../../tests/node_modules/playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {endTurn,sourceHash}=require('./end-kernel.cjs'),{cases,provider}=require('./end-cases.cjs');
const root=path.resolve(__dirname,'../../..'),report={sourceHash,checks:[],browserErrors:[],failure:null};
(async()=>{let browser;const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':file.endsWith('.html')?'text/html':'application/octet-stream'});res.end(e?'Missing':b)})});
 try{await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});const page=await browser.newPage({serviceWorkers:'block'});page.on('pageerror',e=>report.browserErrors.push(String(e.stack||e)));await page.addInitScript(()=>localStorage.setItem('skylinePrefs',JSON.stringify({nickSet:true,welcomed:1})));await page.goto(`http://127.0.0.1:${server.address().port}/skyline-estates/index.html`);await page.waitForFunction(()=>typeof window.__sim==='function');
 const inputs=cases().map(c=>{const expected=endTurn(c.game,c.game.players[c.game.turn].uid,{draw:provider(c.drawSpec).draw});return{...c,expected,tape:expected.draws}});
 const actual=await page.evaluate(async inputs=>{
  const original={driver:onlineTick,turn:playTurnInner,finish,setTimeout:window.setTimeout,error:console.error};class Ready extends Error{}
  renderRoster=()=>{};updateTools=()=>{};setPrompt=()=>{};pushNow=async()=>{};pushState=()=>{};float=()=>{};toast=()=>{};figG=()=>{};trackable=()=>false;playTurn=async()=>{};
  finish=async()=>{const on=NET.on;NET.on=false;try{return await original.finish()}finally{NET.on=on}};
  const out=[];
  try{console.error=e=>{throw e};
   for(const c of inputs){FAST=true;GEN++;G=JSON.parse(JSON.stringify(c.game));if(G.phase==='post')G.phase='busy';NET.on=true;NET.host=true;NET.me=P(G.turn).uid;NET.driving=false;NET.applying=false;NET.applyRun=false;NET.reclaim={};applyCity(G.set.city||'lagos');let queued=false,index=0;const random=Math.random;
    window.setTimeout=(fn,ms)=>{if(ms===60)queued=true;return 0};Math.random=()=>{const x=c.tape[index++];if(!x)throw Error('Unexpected city-event random draw');return(x.value+.5)/x.max};
    try{await original.driver()}finally{Math.random=random}
    if(index!==c.tape.length)throw Error('Unused event draw '+c.name);
    let result=null,boundary=null;
    if(G.over){const ranking=standings().map((p,i)=>({rank:i+1,id:p.id,cash:p.cash,netWorth:netWorth(p),bankrupt:p.bankrupt}));result={reason:alive().length<=1?'last-player':G.set.mode==='timed'&&G.round>G.set.rounds?'timed':'quick',winnerId:ranking[0].id,standings:ranking}}
    else{if(!queued)throw Error('Missing next-turn scheduling');const p=P(G.turn);if(p.ai){G.phase=p.inJail?'jail':'pre';boundary={kind:'ai-turn',seat:p.id}}else{actions=async()=>{throw new Ready()};try{await original.turn(p);throw Error('Expected next-player decision')}catch(e){if(!(e instanceof Ready))throw e}if(p.inJail)boundary={kind:'jail',seat:p.id}}}
    out.push({game:JSON.parse(JSON.stringify(G)),result,boundary});
   }
  }finally{window.setTimeout=original.setTimeout;console.error=original.error;NET.on=false}return out;
 },inputs.map(({expected,drawSpec,...c})=>c));
 inputs.forEach((c,i)=>{assert.deepEqual(actual[i].game,c.expected.game,c.name+' full snapshot');assert.deepEqual(actual[i].result,c.expected.result,c.name+' standings');assert.deepEqual(actual[i].boundary,c.expected.boundary,c.name+' next boundary');report.checks.push({name:c.name,passed:true})});assert.deepEqual(report.browserErrors,[]);console.log('END BROWSER SUMMARY',JSON.stringify({checks:report.checks.length,browserErrors:0,sourceHash}));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{report.failure=String(e.stack||e);console.error(e);process.exitCode=1}).finally(()=>fs.writeFileSync(process.argv[2]||path.join(__dirname,'../end-browser-results.json'),JSON.stringify(report,null,2)+'\n'));
