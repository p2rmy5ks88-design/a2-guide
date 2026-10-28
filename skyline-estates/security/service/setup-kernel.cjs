// Internal prerequisites only: no public start/roll route or live client uses this module.
const crypto=require('node:crypto'),vm=require('node:vm');
const {source,sourceHash,section,line,cityRaw,validIdentities}=require('./audited-rules.cjs');
class SetupError extends Error{constructor(code){super(code);this.code=code}}
const fail=code=>{throw new SetupError(code)},plain=x=>x&&typeof x==='object'&&!Array.isArray(x);
const core=section('const W=1100','/* ================= SOUND ================= */');
// Preserve Fisher-Yates and every game rule, replacing only the random integer provider.
const shuffleDraw='Math.floor(Math.random()*(i+1))';
if(core.split(shuffleDraw).length!==2)throw Error('Audit shuffle randomness');
const secureCore=core.replace(shuffleDraw,'draw(i+1)');
const validation=section('function validateSave(g){','function decodeRemoteGame(code,d){');
const keys=section('const LATE_BONUS=100;','function keyReveal(){');
const registryScript=new vm.Script(core+'\n'+line('const NEW_TOKENS=')+'\n'+section('const FINISHES=[','const DICE_SKINS=')+'\n'+section('const CHARS=[','PREF.eq.char=')+'\n'+section('const THEMES={',"let CUR_THEME=")+`\nJSON.stringify({tokens:TOKENS.concat(NEW_TOKENS),colors:PCOL,finishes:FINISHES.map(x=>x.id),characters:CHARS.map(x=>x.id),themes:Object.keys(THEMES)})`);
const registry=JSON.parse(registryScript.runInNewContext({STARS:''},{timeout:100}));
const ruleLiteral=/rules:Object.assign\((\{minigames:true[^\n]+?\}),PREF.rules/.exec(source)?.[1];if(!ruleLiteral)throw Error('Audit default rules');
const defaultRules=new vm.Script('('+ruleLiteral+')').runInNewContext({},{timeout:100});
function fields(x,allowed){if(!plain(x)||Object.keys(x).some(k=>!allowed.includes(k)))fail('invalid-setup-fields')}
function normalize(config,{minPlayers=2}={}){
 if(![1,2].includes(minPlayers))fail('invalid-roster');
 fields(config,['code','settings','players']);if(typeof config.code!=='string'||!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/.test(config.code))fail('invalid-code');
 const input=config.settings;fields(input,['mode','city','theme','cash','rounds','ai','speed','timer',...Object.keys(defaultRules)]);
 const set={cash:1600,mode:'classic',rounds:20,ai:'normal',speed:'normal',timer:0,...defaultRules,...input};
 if(typeof set.city!=='string'||!Object.hasOwn(cityRaw,set.city)||!['classic','quick','timed'].includes(set.mode)||![1200,1600,2000].includes(set.cash)||![10,20,30,45].includes(set.rounds)||!['easy','normal','hard'].includes(set.ai)||!['normal','fast'].includes(set.speed)||![0,90].includes(set.timer)||Object.keys(defaultRules).some(k=>typeof set[k]!=='boolean'))fail('invalid-setup-settings');
 set.theme=Object.hasOwn(input,'theme')?input.theme:set.city;if(typeof set.theme!=='string'||!Object.hasOwn(cityRaw,set.theme)&&!registry.themes.includes(set.theme))fail('invalid-setup-settings');
 if(!Array.isArray(config.players)||config.players.length<minPlayers||config.players.length>6)fail('invalid-roster');
 const uids=new Set(),tokens=new Set(),colors=new Set();let humans=0;
 const players=config.players.map(p=>{
  fields(p,['uid','name','tok','col','ai','tl','fin','ch','estate']);
  if(p.estate!=null&&(!plain(p.estate)||Object.keys(p.estate).length>40||Object.entries(p.estate).some(([k,v])=>!/^([0-9]|[1-3][0-9])$/.test(k)||!Number.isInteger(v)||v<1||v>5)))fail('invalid-roster');
  if(typeof p.ai!=='boolean'||!registry.tokens.includes(p.tok)||!registry.colors.includes(p.col)||tokens.has(p.tok)||colors.has(p.col)||typeof p.name!=='string'||p.name.length>128||/[\x00-\x1f\x7f]/.test(p.name))fail('invalid-roster');
  tokens.add(p.tok);colors.add(p.col);
  if(p.uid===null){if(!p.ai)fail('invalid-roster')}else{if(typeof p.uid!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(p.uid)||['__proto__','constructor','prototype'].includes(p.uid)||uids.has(p.uid))fail('invalid-roster');uids.add(p.uid)}
  if(!p.ai)humans++;
  const tl=Object.hasOwn(p,'tl')?p.tl:1,fin=Object.hasOwn(p,'fin')?p.fin:null,ch=Object.hasOwn(p,'ch')?p.ch:null;
  if(!Number.isInteger(tl)||tl<1||tl>6||fin!==null&&!registry.finishes.includes(fin)||ch!==null&&!registry.characters.includes(ch))fail('invalid-roster');
  return{...p,tl,fin,ch};
 });
 if(!humans)fail('invalid-roster');return{code:config.code,set,players};
}
function checkedDraw(provider){if(typeof provider!=='function')fail('invalid-random-source');return max=>{const n=provider(max);if(!Number.isInteger(n)||n<0||n>=max)fail('invalid-random-result');return n}}
const initializeScript=new vm.Script(secureCore+'\n'+validation+'\n'+keys+'\n'+line('const BAD_WORDS=')+'\n'+line('function cleanName(s)')+`
Math.random=()=>{throw Error('Unaudited random draw')};
const config=JSON.parse(input);config.players=config.players.map(p=>({...p,name:cleanName(p.name)}));
newGame({cash:config.set.cash,set:config.set,players:config.players});
G.online=true;G.code=config.code;G.seq=1;
if(!validateSave({...G,online:false})||!validIdentities(G.players)||!Array.isArray(G.keys)||G.keys.length!==G.players.length)throw Error('Invalid initialized game');
JSON.stringify(G);`,{filename:'audited-skyline-setup'});
function initializeGame(config,{draw=crypto.randomInt}={}){
 const normalized=normalize(config),context=vm.createContext({input:JSON.stringify(normalized),draw:checkedDraw(draw),CITY_DATA:cityRaw,validIdentities},{codeGeneration:{strings:false,wasm:false}});
 return JSON.parse(initializeScript.runInContext(context,{timeout:100}));
}
let diceSource=section('async function rollDice(){','  if(FAST||!S3)return d;');
if(diceSource.split('Math.floor(Math.random()*6)').length!==4)throw Error('Audit dice randomness');
diceSource=diceSource.replace('async function rollDice(){','function sampleDice(){').replaceAll('Math.floor(Math.random()*6)','draw(6)')+'return {a:d[0],b:d[1],sv:d.sv||0,face:d.s??null};}\n';
const diceScript=new vm.Script(secureCore+'\n'+validation+'\n'+line('function endCheck(){')+'\n'+line('const SPEED_FACE=')+'\n'+line('function speedOn(p)')+'\n'+diceSource+`
Math.random=()=>{throw Error('Unaudited random draw')};G=JSON.parse(input);
if(!G.online||G.sim||!validateSave({...G,online:false})||!validIdentities(G.players)||G.players.some(p=>!Number.isSafeInteger(p.cash)))result={error:'invalid-game-state'};
else if(endCheck())result={error:'game-already-ended'};
else if(rollKind==='jail'?(G.phase!=='jail'||!P(G.turn).inJail||P(G.turn).pos!==10||P(G.turn).jailTurns>=3||P(G.turn).ai):(G.phase!=='pre'||P(G.turn).inJail))result={error:'unsupported-roll-phase'};
else if(typeof actor!=='string'||!actor||P(G.turn).uid!==actor||P(G.turn).bankrupt)result={error:'not-your-turn'};
else result={dice:sampleDice()};JSON.stringify(result);`,{filename:'audited-skyline-dice-generation'});
function sample(game,actor,{draw=crypto.randomInt}={},rollKind='roll'){
 let input;try{input=JSON.stringify(game)}catch{fail('invalid-game-state')}if(typeof input!=='string'||Buffer.byteLength(input)>262144)fail('invalid-game-state');
 const result=JSON.parse(diceScript.runInContext(vm.createContext({input,actor,rollKind,draw:checkedDraw(draw),CITY_DATA:cityRaw,validIdentities},{codeGeneration:{strings:false,wasm:false}}),{timeout:100}));if(result.error)fail(result.error);return result.dice;
}
const sampleDice=(game,actor,options)=>sample(game,actor,options,'roll'),sampleJailDice=(game,actor,options)=>sample(game,actor,options,'jail');
function sampleRerollDice(game,actor,options){const p=game?.players?.[game.turn];if(game?.phase!=='busy'||!p||p.inJail||p.ai||p.auto)fail('unsupported-reroll-phase');return sampleDice({...game,phase:'pre'},actor,options)}
module.exports={normalizeSetupConfig:normalize,sampleRerollDice,initializeGame,sampleDice,sampleJailDice,SetupError,sourceHash};
