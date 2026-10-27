const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'../../tests/node_modules/playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {applyAssetAction,sourceHash}=require('./asset-kernel.cjs'),{cases}=require('./asset-cases.cjs');
const root=path.resolve(__dirname,'../../..'),report={sourceHash,checks:[],browserErrors:[],failure:null};
(async()=>{let browser;const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':file.endsWith('.html')?'text/html':'application/octet-stream'});res.end(e?'Missing':b)})});
 try{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});const page=await browser.newPage({serviceWorkers:'block'});page.on('pageerror',e=>report.browserErrors.push(String(e.stack||e)));
  await page.addInitScript(()=>localStorage.setItem('skylinePrefs',JSON.stringify({nickSet:true,welcomed:1})));
  await page.goto(`http://127.0.0.1:${server.address().port}/skyline-estates/index.html`);await page.waitForFunction(()=>typeof window.__sim==='function');
  for(const c of cases()){
   const browserResult=await page.evaluate(({game,command})=>{FAST=true;GEN++;G=game;updateCell=()=>{};float=()=>{};sfx=()=>{};figG=()=>{};const pair={build:[canBuild,build],sell:[canSell,sell],mortgage:[canMortgage,mortgage],redeem:[canUnmort,unmortgage]}[command.kind];if(!buyable(command.square)||!pair[0](0,command.square))return{legal:false,game:G};pair[1](0,command.square);return{legal:true,game:G}},c);
   assert.equal(browserResult.legal,c.legal,c.name+' browser legality');if(c.legal)assert.deepEqual(applyAssetAction(c.game,'host-uid',c.command),browserResult.game,c.name+' full game snapshot');else{assert.throws(()=>applyAssetAction(c.game,'host-uid',c.command),e=>e.code==='illegal-property-action');assert.deepEqual(browserResult.game,c.game,c.name+' denial leaves game intact')}
   report.checks.push({name:c.name,passed:true});console.log('PASS browser property parity',c.name);
  }
  assert.deepEqual(report.browserErrors,[]);console.log('PROPERTY PARITY SUMMARY',JSON.stringify({checks:report.checks.length,browserErrors:report.browserErrors.length,sourceHash}));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{report.failure=String(e.stack||e);console.error(e);process.exitCode=1}).finally(()=>fs.writeFileSync(process.argv[2]||path.join(__dirname,'../asset-browser-results.json'),JSON.stringify(report,null,2)+'\n'));
