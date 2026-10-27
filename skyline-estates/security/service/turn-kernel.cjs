// Internal turn checkpoints. No HTTP route or shipped client uses this module.
const vm=require('node:vm');
const {section,line,sourceHash,validIdentities}=require('./audited-rules.cjs');
const {sampleDice,sampleJailDice}=require('./setup-kernel.cjs');
class TurnError extends Error{constructor(code,status=409){super(code);this.code=code;this.status=status}}
const fail=(code,status)=>{throw new TurnError(code,status)};
// Only audited async UI waits are removed. Financial statements and later economic hooks are reused.
const sync=s=>s.replaceAll('async function','function').replaceAll('await ','');
const core=section('const W=1100','/* ================= SOUND ================= */');
const rules=[core,line('function endCheck(){'),sync(section('async function jailTurn(p){','async function playTurn(p)')),section('function validateSave(g){','function decodeRemoteGame(code,d){'),section('const COUNTRIES=','/* ---- city looks ---- */'),section('const TOKEN_LV=[','const TL_MAX='),line('const TL_MAX='),line('const perksOn='),line('const perkOf='),line('function payday(p)'),line('const st=p=>'),line('const evNow='),section('const FEST_GROUP={};','const EV_UNIVERSAL='),line('const evDef='),line('const _rentFor='),line('function log(t)'),line('function speedLabel(s)'),sync(section('async function moveSteps(p,n){','/* ================= MONEY ================= */')),line('function onPassGo(p)'),sync(section('const _sendToJail=sendToJail;','const _executeTrade=')),sync(section('async function collect(p,a){','async function payEach(')),sync(line('const _pay=pay;')),sync(line('{const _p3=pay;')),sync(line('{const _ps=pay;')),sync(section('async function land(p,d,o2={}){','async function drawCard(')),sync(section('async function offerBuy(p,i){','/* ================= AUCTION ================= */')),line('const _buyProp=buyProp;'),sync(line('const _land=land;')),sync(section('async function offerReroll(p,d){','/* ---- game end: XP, coins, trophies, season ---- */')).replace('if(FAST||p.ai','if(p.ai')].join('\n');
const record=line('  G.lastDice='),rollLog=line('  log(`${P(G.turn).name} rolled ');
const script=new vm.Script(rules+`
function updateTools(){} function setPrompt(){} function pushState(){} function renderRoster(){} function updateCell(){} function float(){} function sfx(){} function toast(){} function flyCash(){} function hopTo(){} function settleToken(){} function highlight(){} function camFollow(){} function placeToken(){}
const mine=()=>false,isLocalHuman=p=>p&&!p.ai&&p.uid===actor,isRemote=()=>false;
class Stop extends Error{constructor(kind,details={}){super(kind);this.boundary={kind,...details}}}
let G0=JSON.parse(input),flow=JSON.parse(frame),mode=choice;
G=G0;if(!validateSave({...G,online:false})||!G.online||!validIdentities(G.players)||G.players.some(w=>!Number.isSafeInteger(w.cash)))throw Error('Invalid game');FAST=true;applyCity(G.set.city||'lagos');Math.random=()=>{throw Error('Unaudited randomness in turn transition')};
const p=P(G.turn),d=flow.dice?[flow.dice.a,flow.dice.b]:[];if(flow.dice?.sv){d.sv=flow.dice.sv;d.s=flow.dice.face}
let boundary=null,paymentKind=null,answerUsed=false;
function modal(){if(!answerUsed&&mode==='buy'){if(p.cash<SQ[p.pos].p)throw Error('Cannot afford property');answerUsed=true;return 'buy'}if(!answerUsed&&mode==='decline'){answerUsed=true;return 'auction'}throw new Stop('purchase',{square:p.pos,price:SQ[p.pos].p,canBuy:p.cash>=SQ[p.pos].p})}
function deedHTML(){return ''}
function actions(){if(mode==='jail-pay')return 'pay';if(mode==='jail-card')return 'card';if(mode==='jail-roll')return 'roll';if(mode==='keep')return 'keep';throw new Stop('reroll',{remaining:perkOf(p).rr-(p.rrUsed||0),dice:flow.dice})}
function auction(i){throw new Stop('auction',{square:i})}
function drawCard(w,deck){throw new Stop('card',{deck,square:w.pos})}
function openAssets(){throw new Stop('raise-cash',{square:p.pos})}
function humanRaise(w,amount,to){throw new Stop('debt',{amount,to:to?.id??null,paymentKind,restorePhase:'busy'})}
function aiRaise(w,amount){humanRaise(w,amount,paymentTo)}
let paymentTo=null;const economicPay=pay;pay=function(w,amount,to,kind){paymentKind=kind||null;paymentTo=to;try{return economicPay(w,amount,to,kind)}finally{paymentKind=null;paymentTo=null}};
function completeLanding(){
 if(p.inJail||p.bankrupt||G.over){G.phase='post';flow.afterLanding=null;return}
 if(flow.afterLanding==='star'){flow.afterLanding=null;drawCard(p,'chance')}
 if(flow.afterLanding==='taxi'){flow.afterLanding=null;moveTo(p,nextOf(RAILS,p.pos));land(p,d);return completeLanding()}
 G.phase=flow.extraRoll?'pre':'post';
}
function rollDice(){if(!flow.dice)throw Error('Missing saved jail dice');${record}
${rollLog}return d}
function beginJail(){
 if(endCheck()||!p.inJail||p.pos!==10||p.jailTurns>=3)throw Error('Invalid jail turn');
 if(mode==='jail-pay'&&p.cash<BAIL)throw Error('Cannot afford bail');if(mode==='jail-card'&&!p.goojf.length)throw Error('No Bail Pass');
 flow.fromJail=true;flow.jailStage='jail-action';const r=jailTurn(p);
 if(r==='free'){G.phase='pre';return}if(r==='stay'){G.phase='post';return}
 if(!r?.move)throw Error('Invalid jail result');flow.jailStage='landing';moveSteps(p,r.d[0]+r.d[1]);land(p,r.d);completeLanding();
}
function begin(){
 G.phase='busy';
 if(mode==='roll'){${record}\n${rollLog}}
 offerReroll(p,d);
 if(d[0]===d[1]){G.doubles=(G.doubles||0)+1;if(G.doubles===3){st(p).dbl3=1;sendToJail(p);G.phase='post';flow.afterLanding=null;return}}
 moveSteps(p,d[0]+d[1]+(typeof d.s==='number'?d.s:0));land(p,d);completeLanding();
}
try{if(mode==='jail-view'){if(endCheck())throw Error('Game ended');boundary={kind:'jail',seat:p.id,bail:BAIL,canPay:p.cash>=BAIL,passes:p.goojf.length,attempt:p.jailTurns+1}}else if(mode.startsWith('jail-'))beginJail();else if(mode==='roll'||mode==='keep')begin();else{land(p,d);completeLanding()}}catch(e){if(!(e instanceof Stop))throw e;boundary=e.boundary}
if(!validateSave({...G,online:false})||!validIdentities(G.players)||G.players.some(w=>!Number.isSafeInteger(w.cash)||w.st&&Object.values(w.st).some(n=>!Number.isFinite(n)||n<0))||!Number.isSafeInteger(G.logN||0))throw Error('Invalid turn result');
JSON.stringify({game:G,boundary,context:boundary?flow:null});`,{filename:'audited-skyline-turn-checkpoint'});
function validGame(game,actor){
 if(!game||typeof game!=='object'||!Array.isArray(game.players)||game.players.length<2||typeof actor!=='string'||game.players?.[game.turn]?.uid!==actor)fail('not-your-turn');
 const p=game.players[game.turn];if(p.ai)fail('unsupported-ai-turn',501);
 for(const x of game.players){if(x.tl!=null&&(!Number.isInteger(x.tl)||x.tl<1||x.tl>6))fail('invalid-turn-state');for(const k of ['rrUsed','passUsed','surgeUsed','shieldUsed'])if(x[k]!=null&&(!Number.isSafeInteger(x[k])||x[k]<0))fail('invalid-turn-state')}
 if(p.bankrupt)fail('not-your-turn');
}
function run(game,actor,context,choice){
 let input;try{input=JSON.stringify(game)}catch{fail('invalid-game-state')}if(typeof input!=='string'||Buffer.byteLength(input)>262144)fail('invalid-game-state');
 try{return JSON.parse(script.runInContext(vm.createContext({input,actor,frame:JSON.stringify(context),choice,validIdentities},{codeGeneration:{strings:false,wasm:false}}),{timeout:100}))}catch(e){if(e instanceof TurnError)throw e;const failure=new TurnError('invalid-turn-state');failure.cause=e;throw failure}
}
function applyRoll(game,actor,dice){
 validGame(game,actor);if(game.phase!=='pre'||(game.doubles||0)>2)fail('unsupported-turn-phase');
 if(!dice||Object.keys(dice).sort().join(',')!=='a,b,face,sv')fail('invalid-dice');let i=0;const values=[dice.a-1,dice.b-1,dice.sv-1];let expected;try{expected=sampleDice(game,actor,{draw:()=>values[i++]})}catch{fail('invalid-dice')}if(['a','b','sv','face'].some(k=>expected[k]!==dice[k]))fail('invalid-dice');
 const context={version:1,dice:{...dice},extraRoll:dice.a===dice.b,afterLanding:dice.face==='star'?'star':dice.face==='taxi'?'taxi':null};return run(game,actor,context,'roll');
}
function chooseTurn(game,actor,pending,choice){
 validGame(game,actor);if(game.phase!=='busy'||!pending||pending.context?.version!==1)fail('unsupported-turn-phase');
 if(pending.boundary?.kind==='purchase'){
  if(!['buy','decline'].includes(choice))fail('unsupported-turn-choice',501);
  if(pending.boundary.square!==game.players[game.turn].pos||game.own?.[pending.boundary.square]?.o!==-1)fail('stale-turn-choice');
  if(choice==='buy'&&!pending.boundary.canBuy)fail('cannot-afford-property');
 }else if(pending.boundary?.kind==='reroll'){if(choice!=='keep')fail('unsupported-turn-choice',501)}else fail('unsupported-turn-choice',501);
 return run(game,actor,pending.context,choice);
}
function jailState(game,actor){validGame(game,actor);const p=game.players[game.turn];if(game.phase!=='jail'||!p.inJail||p.pos!==10||!Number.isInteger(p.jailTurns)||p.jailTurns<0||p.jailTurns>=3||(game.doubles||0)!==0)fail('unsupported-jail-phase')}
function applyJailChoice(game,actor,choice){jailState(game,actor);if(!['payBail','useBailPass'].includes(choice))fail('unsupported-jail-choice',501);return run(game,actor,{version:1,dice:null,extraRoll:false,afterLanding:null},choice==='payBail'?'jail-pay':'jail-card')}
function applyJailRoll(game,actor,dice){jailState(game,actor);if(!dice||Object.keys(dice).sort().join(',')!=='a,b,face,sv')fail('invalid-dice');let i=0;const values=[dice.a-1,dice.b-1,dice.sv-1];let expected;try{expected=sampleJailDice(game,actor,{draw:()=>values[i++]})}catch{fail('invalid-dice')}if(['a','b','sv','face'].some(k=>expected[k]!==dice[k]))fail('invalid-dice');return run(game,actor,{version:1,dice:{...dice},extraRoll:false,afterLanding:null},'jail-roll')}
function jailView(game,actor){jailState(game,actor);return run(game,actor,{version:1,dice:null,extraRoll:false,afterLanding:null},'jail-view').boundary}
module.exports={applyRoll,chooseTurn,applyJailChoice,applyJailRoll,jailView,TurnError,sourceHash};
