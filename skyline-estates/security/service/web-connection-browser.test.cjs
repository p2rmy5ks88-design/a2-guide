const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'../../tests/node_modules/playwright'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {createHttpHandler}=require('./http.cjs'),{createAdmissionService}=require('./admission.cjs'),{createGameViewService}=require('./game-view.cjs'),{createRollPlanService}=require('./roll-plans.cjs'),{createTurnService}=require('./turn-service.cjs'),{game}=require('./turn-cases.cjs');
const report={checks:[],browserErrors:[],failure:null},copy=x=>JSON.parse(JSON.stringify(x));
async function test(name,fn){await fn();report.checks.push({name,passed:true});console.log('PASS browser connection',name)}
(async()=>{let browser,server;try{
 const g=game(),state={root:{rooms:{ABCDE:{meta:{code:'ABCDE',status:'playing'},members:{'host-uid':true,'guest-uid':true},seats:{'host-uid':{seat:0},'guest-uid':{seat:1}},state:{revision:2,phase:'pre',gameJson:JSON.stringify(g)}}},service:{}}};
 const db={ref:()=>({transaction:async fn=>{let result;for(let i=0;i<3;i++)result=fn(copy(state.root));state.root=copy(result);return{committed:true,snapshot:{val:()=>copy(result)}}}})},verifyIdToken=async token=>{if(!['host-uid','guest-uid'].includes(token))throw Error();return{uid:token}},opts={db,verifyIdToken,operationLimit:100};let draw=0;
 const origins=new Set(),services={views:createGameViewService(opts),plans:createRollPlanService({...opts,draw:()=>[2,3][draw++%2]}),turns:createTurnService(opts)},handler=createHttpHandler(createAdmissionService(opts),{allowedOrigins:origins,gameServices:services});
 let losePath=null,base;
 server=http.createServer((req,res)=>{
  if(req.url==='/'){res.writeHead(200,{'Content-Type':'text/html'}).end('<!doctype html><title>Connection regression fixture</title><script type="module">import {createGameClient} from "/game-client.mjs";window.uid="host-uid";window.makeClient=()=>createGameClient({baseUrl:location.origin+"/",allowedOrigins:[location.origin],allowLoopback:true,uid:window.uid,getSession:async()=>({uid:window.uid,idToken:window.uid}),storage:localStorage});window.client=makeClient();window.ready=true;</script>');return}
  if(req.url==='/game-client.mjs'){res.writeHead(200,{'Content-Type':'text/javascript'}).end(fs.readFileSync(path.join(__dirname,'game-client.mjs')));return}
  if(req.url===losePath){losePath=null;res.end=()=>{res.destroy();return res}}
  handler(req,res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;origins.add(base);
 browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const context=await browser.newContext(),page=await context.newPage();page.on('pageerror',e=>report.browserErrors.push(String(e.stack||e)));
 await page.goto(base);await page.waitForFunction(()=>window.ready);
 await test('browser imports module and reads redacted current game',async()=>{const v=await page.evaluate(()=>client.read('readGame',{code:'ABCDE'}));assert.equal(v.game.players[0].pos,0);assert.equal('chance'in v.game,false);assert.equal('uid'in v.game.players[0],false)});
 losePath='/v2/game/roll/reserve';
 await test('lost server reply leaves saved browser operation',async()=>{const v=await page.evaluate(async()=>{try{await client.mutate('reserveRoll',{code:'ABCDE',revision:2})}catch(e){return{error:!!e.message,pending:client.pending()}}});assert.equal(v.error,true);assert.equal(v.pending.status,'pending');assert.equal(state.root.rooms.ABCDE.state.revision,2)});
 const originalId=await page.evaluate(()=>client.pending().body.requestId);
 await page.reload();await page.waitForFunction(()=>window.ready);let planId;
 await test('real page reload recovers one server roll plan',async()=>{const ack=await page.evaluate(()=>client.retry());planId=ack.planId;assert.match(planId,/^[a-f0-9]{64}$/);assert.equal(await page.evaluate(()=>client.pending().body.requestId),originalId);assert.equal(Object.keys(state.root.service.rollPlans).length,1);await page.evaluate(()=>client.complete(client.pending().body.requestId))});
 await test('saved dice load uses current browser authorization',async()=>{const v=await page.evaluate(planId=>client.read('loadRoll',{code:'ABCDE',revision:2,planId}),planId);assert.deepEqual(v.dice,{a:3,b:4,sv:0,face:null})});
 losePath='/v2/game/roll/commit';
 await test('lost movement reply pauses at purchase once',async()=>{const error=await page.evaluate(async planId=>{try{await client.mutate('commitRoll',{code:'ABCDE',revision:2,planId})}catch(e){return !!e.message}},planId);assert.equal(error,true);assert.equal(state.root.rooms.ABCDE.state.revision,3);assert.equal(JSON.parse(state.root.rooms.ABCDE.state.gameJson).players[0].pos,7)});
 await page.reload();await page.waitForFunction(()=>window.ready);
 await test('movement recovery after reload does not move again',async()=>{const before=copy(state.root.rooms.ABCDE),v=await page.evaluate(()=>client.retry());assert.equal(v.stage,'purchase');assert.deepEqual(state.root.rooms.ABCDE,before);await page.evaluate(()=>client.complete(client.pending().body.requestId))});
 await test('browser reads exact purchase boundary without continuation context',async()=>{const v=await page.evaluate(()=>client.read('readGame',{code:'ABCDE'}));assert.equal(v.decision.kind,'purchase');assert.equal(v.decision.square,7);assert.equal(v.decision.canBuy,true);assert.equal('context'in v,false)});
 const guest=await browser.newPage();guest.on('pageerror',e=>report.browserErrors.push(String(e.stack||e)));await guest.goto(base);await guest.waitForFunction(()=>window.ready);await guest.evaluate(()=>{client.close();window.uid='guest-uid';window.client=makeClient()});
 await test('second browser cannot see another player pending decision',async()=>{const v=await guest.evaluate(()=>client.read('readGame',{code:'ABCDE'}));assert.equal(v.decision,null);assert.equal(v.actorSeat,0);assert.equal(v.seat,1)});
 await test('browser purchase commits one ownership transfer',async()=>{const before=JSON.parse(state.root.rooms.ABCDE.state.gameJson).players[0].cash;const ack=await page.evaluate(()=>client.mutate('choose',{code:'ABCDE',revision:3,kind:'buy'}));assert.equal(ack.stage,'post');const after=JSON.parse(state.root.rooms.ABCDE.state.gameJson);assert.equal(after.own[7].o,0);assert.equal(after.players[0].cash,before-90)});
 await page.reload();await page.waitForFunction(()=>window.ready);
 await test('acknowledged purchase survives reload without duplicate payment',async()=>{const before=copy(state.root),ack=await page.evaluate(()=>client.retry());assert.equal(ack.revision,4);assert.deepEqual(state.root,before);await page.evaluate(()=>client.complete(client.pending().body.requestId))});
 await test('browser end-turn hands authority to the other browser',async()=>{await page.evaluate(()=>client.mutate('endTurn',{code:'ABCDE',revision:4}));await page.evaluate(()=>client.complete(client.pending().body.requestId));const view=await guest.evaluate(()=>client.read('readGame',{code:'ABCDE'}));assert.equal(view.game.turn,1);assert.equal(view.stage,'pre');assert.equal(view.revision,5)});
 await test('member revocation prevents the next browser snapshot read',async()=>{delete state.root.rooms.ABCDE.members['host-uid'];const code=await page.evaluate(async()=>{try{await client.read('readGame',{code:'ABCDE'})}catch(e){return e.code}});assert.equal(code,'not-authorized')});
 assert.deepEqual(report.browserErrors,[]);console.log('WEB BROWSER SUMMARY',JSON.stringify({checks:report.checks.length,browserErrors:report.browserErrors.length}));
 }finally{if(browser)await browser.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r))}}})().catch(e=>{report.failure=String(e.stack||e);console.error(e);process.exitCode=1}).finally(()=>fs.writeFileSync(process.argv[2]||path.join(__dirname,'../web-connection-browser-results.json'),JSON.stringify(report,null,2)+'\n'));
