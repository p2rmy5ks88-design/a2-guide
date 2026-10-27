const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'../../tests/node_modules/playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {applyRoll,chooseTurn,sourceHash}=require('./turn-kernel.cjs'),{cases}=require('./turn-cases.cjs');
const root=path.resolve(__dirname,'../../..'),report={sourceHash,checks:[],browserErrors:[],failure:null};
(async()=>{let browser;const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':file.endsWith('.html')?'text/html':'application/octet-stream'});res.end(e?'Missing':b)})});
 try{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});const page=await browser.newPage({serviceWorkers:'block'});page.on('pageerror',e=>report.browserErrors.push(String(e.stack||e)));
  await page.addInitScript(()=>localStorage.setItem('skylinePrefs',JSON.stringify({nickSet:true,welcomed:1})));await page.goto(`http://127.0.0.1:${server.address().port}/skyline-estates/index.html`);await page.waitForFunction(()=>typeof window.__sim==='function');
  const expected=[];for(const c of cases()){let r=applyRoll(c.game,'host-uid',c.dice);expected.push({name:c.name+' initial',game:c.game,dice:c.dice,choices:[],result:r});const chosen=[];for(const choice of c.choices){chosen.push(choice);r=chooseTurn(r.game,'host-uid',r,choice);expected.push({name:c.name+' '+chosen.join('/'),game:c.game,dice:c.dice,choices:chosen.slice(),result:r})}}
  const actual=await page.evaluate(async inputs=>{
   const original={turn:playTurnInner,dice:rollDice,reroll:offerReroll,pay};
   class Stop extends Error{constructor(kind,details={}){super(kind);this.boundary={kind,...details}}}class Finished extends Error{}
   renderRoster=()=>{};updateTools=()=>{};setPrompt=()=>{};hopTo=async()=>{};settleToken=async()=>{};highlight=()=>{};camFollow=()=>{};placeToken=()=>{};float=()=>{};flyCash=()=>{};updateCell=()=>{};sfx=()=>{};toast=()=>{};figG=()=>{};pushState=()=>{};throwDice=async()=>{};trackable=()=>false;aiChat=()=>{};
   const out=[];
   for(const c of inputs){FAST=true;GEN++;G=JSON.parse(JSON.stringify(c.game));NET.on=false;NET.me=G.players[G.turn].uid;applyCity(G.set.city||'lagos');let answer=0,rolls=0,paymentKind=null;
    modal=async()=>{const p=P(G.turn),kind=c.choices[answer];if(['buy','decline'].includes(kind)){answer++;return kind==='buy'?'buy':'auction'}throw new Stop('purchase',{square:p.pos,price:SQ[p.pos].p,canBuy:p.cash>=SQ[p.pos].p})};
    actions=async(html,buttons)=>{if(buttons.some(b=>b.k==='keep')){if(c.choices[answer]==='keep'){answer++;return 'keep'}throw new Stop('reroll',{remaining:perkOf(P(G.turn)).rr-(P(G.turn).rrUsed||0),dice:c.dice})}if(buttons.some(b=>b.k==='end'))throw new Finished();if(rolls)throw new Finished();return 'roll'};
    offerReroll=async(p,d)=>{const prior=FAST;FAST=false;try{return await original.reroll(p,d)}finally{FAST=prior}};
    rollDice=async()=>{rolls++;if(rolls>1)throw Error('Unexpected second roll');const priorRandom=Math.random,priorFast=FAST,priorS3=S3,values=[c.dice.a-1,c.dice.b-1,...(c.dice.sv?[c.dice.sv-1]:[])];let i=0,pending;try{FAST=false;S3=S3||{};Math.random=()=>{if(i>=values.length)throw Error('Unexpected random draw');return(values[i++]+.5)/6};pending=original.dice()}finally{Math.random=priorRandom}try{return await pending}finally{FAST=priorFast;S3=priorS3}};
    pay=async(p,amount,to,kind)=>{paymentKind=kind||null;try{return await original.pay(p,amount,to,kind)}finally{paymentKind=null}};
    humanRaise=async(p,amount,to)=>{throw new Stop('debt',{amount,to:to?.id??null,paymentKind,restorePhase:'busy'})};
    aiRaise=(p,amount)=>{throw new Stop('debt',{amount,to:null,paymentKind,restorePhase:'busy'})};
    drawCard=async(p,deck)=>{throw new Stop('card',{deck,square:p.pos})};auction=async i=>{throw new Stop('auction',{square:i})};
    let boundary=null;try{await original.turn(P(G.turn));throw Error('Expected a deliberate checkpoint')}catch(e){if(e instanceof Stop)boundary=e.boundary;else if(!(e instanceof Finished))throw e}
    if(answer!==c.choices.length)throw Error('Unconsumed choice '+c.name);out.push({game:JSON.parse(JSON.stringify(G)),boundary});
   }return out;
  },expected.map(({result,...c})=>c));
  expected.forEach((c,i)=>{assert.deepEqual(actual[i].game,c.result.game,c.name+' full game snapshot');assert.deepEqual(actual[i].boundary,c.result.boundary,c.name+' decision boundary');report.checks.push({name:c.name,passed:true})});assert.deepEqual(report.browserErrors,[]);console.log('TURN BROWSER SUMMARY',JSON.stringify({checks:report.checks.length,scenarios:cases().length,browserErrors:report.browserErrors.length,sourceHash}));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{report.failure=String(e.stack||e);console.error(e);process.exitCode=1}).finally(()=>fs.writeFileSync(process.argv[2]||path.join(__dirname,'../turn-browser-results.json'),JSON.stringify(report,null,2)+'\n'));
