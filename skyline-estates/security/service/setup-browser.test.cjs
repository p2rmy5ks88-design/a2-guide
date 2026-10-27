const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'../../tests/node_modules/playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {initializeGame,sampleDice,sourceHash}=require('./setup-kernel.cjs'),{config,cases,diceCases,seededDraw}=require('./setup-cases.cjs');
const root=path.resolve(__dirname,'../../..'),report={sourceHash,setup:[],dice:[],browserErrors:[],failure:null};
(async()=>{let browser;const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':file.endsWith('.html')?'text/html':'application/octet-stream'});res.end(e?'Missing':b)})});
 try{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});const page=await browser.newPage({serviceWorkers:'block'});page.on('pageerror',e=>report.browserErrors.push(String(e.stack||e)));
  await page.addInitScript(()=>localStorage.setItem('skylinePrefs',JSON.stringify({nickSet:true,welcomed:1})));await page.goto(`http://127.0.0.1:${server.address().port}/skyline-estates/index.html`);await page.waitForFunction(()=>typeof window.__sim==='function');
  const setupInputs=cases().map(c=>{const rng=seededDraw(c.seed),expected=initializeGame(c.config,{draw:rng.draw});return{...c,tape:rng.calls,expected}});
  const setupOutputs=await page.evaluate(inputs=>{FAST=true;GEN++;return inputs.map(c=>{const original=Math.random;let n=0;try{Math.random=()=>{const draw=c.tape[n++];if(!draw)throw Error('Unexpected setup random call');return(draw.value+.5)/draw.max};const cfg=c.config;newGame({cash:cfg.settings.cash,set:cfg.settings,players:cfg.players.map(p=>({...p,name:cleanName(p.name)}))});G.online=true;G.code=cfg.code;G.seq=1;return{game:JSON.parse(JSON.stringify(G)),draws:n}}finally{Math.random=original}})},setupInputs.map(({expected,...c})=>c));
  setupInputs.forEach((c,i)=>{assert.deepEqual(setupOutputs[i].game,c.expected,c.name+' full snapshot');assert.equal(setupOutputs[i].draws,c.tape.length,c.name+' random draw count');report.setup.push({name:c.name,passed:true})});

  report.trustedStarts=[];
  for(const mode of ['classic','quick','timed'])for(const n of [2,6]){
   const cfg=config(n,{mode,minigames:false}),copy=x=>JSON.parse(JSON.stringify(x));
   let state={rooms:{ABCDE:{meta:{code:'ABCDE',status:'lobby',hostUid:cfg.players[0].uid,settings:cfg.settings},members:Object.fromEntries(cfg.players.map(p=>[p.uid,true])),seats:Object.fromEntries(cfg.players.map((p,i)=>[p.uid,{uid:p.uid,name:p.name,seat:i}])),state:{revision:1,phase:'lobby'}}},service:{}},entropyCalls=0;
   const db={ref:()=>({transaction:async fn=>{let value;for(let i=0;i<3;i++)value=fn(copy(state));state=copy(value);return{committed:true,snapshot:{val:()=>copy(state)}}}})};
   const service=require('./start-service.cjs').createStartService({db,verifyIdToken:async uid=>({uid}),resolveRoster:()=>cfg.players,randomBytes:size=>{entropyCalls++;return Buffer.alloc(size,17)}});
   await service.startGame(cfg.players[0].uid,{requestId:'browser-start-test01',code:'ABCDE',revision:1});
   const expected=JSON.parse(state.rooms.ABCDE.state.gameJson),draw=require('./entropy-tape.cjs').boundedTape(Array(256).fill(0x11111111)),tape=[];
   initializeGame(cfg,{draw:max=>{const value=draw(max);tape.push({max,value});return value}});
   const actual=await page.evaluate(({cfg,tape})=>{let i=0;const original=Math.random;try{Math.random=()=>{const t=tape[i++];if(!t)throw Error('Unexpected start randomness');return(t.value+.5)/t.max};newGame({cash:cfg.settings.cash,set:cfg.settings,players:cfg.players.map(p=>({...p,name:cleanName(p.name)}))});G.online=true;G.code=cfg.code;G.seq=1;G.phase='pre';return JSON.parse(JSON.stringify(G))}finally{Math.random=original}},{cfg,tape});
   assert.deepEqual(actual,expected,mode+' '+n+' authoritative start matches original browser game');assert.equal(entropyCalls,1);report.trustedStarts.push({mode,seats:n,passed:true});
  }

  const diceInputs=diceCases().map(c=>{const g=initializeGame(config(2,{speedDie:c.speedDie}),{draw:seededDraw(20).draw});g.phase='pre';g.players[g.turn].lapped=c.lapped;const values=[c.a-1,c.b-1,...(c.sv?[c.sv-1]:[])];let n=0;const expected=sampleDice(g,g.players[g.turn].uid,{draw:()=>values[n++]});return{...c,game:g,values,expected}});
  const diceOutputs=await page.evaluate(async inputs=>{FAST=true;const out=[];for(const c of inputs){G=c.game;const before=JSON.stringify(G),original=Math.random;let n=0,pending;try{Math.random=()=>{if(n>=c.values.length)throw Error('Unexpected dice random call');return(c.values[n++]+.5)/6};pending=rollDice()}finally{Math.random=original}const d=await pending;out.push({dice:{a:d[0],b:d[1],sv:d.sv||0,face:d.s??null},unchanged:JSON.stringify(G)===before,draws:n})}return out},diceInputs.map(({expected,...c})=>c));
  diceInputs.forEach((c,i)=>{assert.deepEqual(diceOutputs[i].dice,c.expected,c.name);assert.equal(diceOutputs[i].unchanged,true,c.name+' no state mutation');assert.equal(diceOutputs[i].draws,c.values.length,c.name+' random draw count');report.dice.push({name:c.name,passed:true})});
  assert.deepEqual(report.browserErrors,[]);console.log('SETUP BROWSER SUMMARY',JSON.stringify({setup:report.setup.length,trustedStarts:report.trustedStarts.length,dice:report.dice.length,browserErrors:report.browserErrors.length,sourceHash}));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{report.failure=String(e.stack||e);console.error(e);process.exitCode=1}).finally(()=>fs.writeFileSync(process.argv[2]||path.join(__dirname,'../setup-browser-results.json'),JSON.stringify(report,null,2)+'\n'));
