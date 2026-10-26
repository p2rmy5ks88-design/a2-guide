// Test the game's actual save/load and turn functions, with deterministic dice and UI spies.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const source=process.env.SOURCE_REF?execFileSync('git',['show',`${process.env.SOURCE_REF}:skyline-estates/game.html`],{cwd:root,encoding:'utf8',maxBuffer:4e6}):fs.readFileSync(path.join(root,'skyline-estates/game.html'),'utf8');
const section=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
const functions=section('async function playTurnInner(p){','async function run(){')+section("const SKEY='skylineSave';",'try{window.claude?.hot');
const results=[];
async function test(name,fn){await fn();results.push(name);console.log('PASS',name)}
function fixture(phase='post',ai=false,dice=[[2,3]]){
  const events=[],storage=new Map();let roll=0;
  const players=[{id:0,name:'Test',ai,cash:1300,pos:5,bankrupt:false,inJail:false},{id:1,name:'Other',ai:false,cash:1700,pos:12,bankrupt:false,inJail:false}];
  const g={v:1,players,turn:0,round:2,first:0,phase,over:false,own:[{o:0,h:1,m:false}],houses:35,hotels:12,set:{}};
  const ctx={G:g,FAST:true,GEN:1,window:{},localStorage:{setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k)||null,removeItem:k=>storage.delete(k)},
    $:()=>null,P:i=>ctx.G.players[i],esc:x=>x,renderRoster(){},updateTools(){},setPrompt(){},camOverview(){},banner:async()=>{},
    actions:async(text,buttons)=>{events.push(['action',buttons[0].k])},sleep:async()=>{},toast(){},
    rollDice:async()=>{events.push(['roll']);return dice[roll++]||[2,3]},offerReroll:async()=>{},
    moveSteps:async(p,n)=>{events.push(['move',n]);p.pos=(p.pos+n)%40},land:async p=>{events.push(['land']);p.cash-=50},
    aiPostTurn:async()=>{events.push(['manage'])},placeToken(){},ownsAll:()=>false,GROUPS:{},
    st:p=>(p.st||(p.st={})),sendToJail:async p=>{events.push(['jail']);p.inJail=true;p.pos=10},
    jailTurn:async()=>{events.push(['jail-turn']);return 'stay'},speedResolve:async()=>{},Abort:class extends Error{}};
  vm.createContext(ctx);vm.runInContext(functions,ctx);
  return {ctx,events,storage,async resume(){ctx.save();ctx.G=ctx.loadSave();await ctx.playTurnInner(ctx.G.players[0])}};
}
(async()=>{
  await test('post-roll save resumes End Turn without moving or paying twice',async()=>{const f=fixture();await f.resume();assert.deepEqual(f.events,[['action','end']]);assert.equal(f.ctx.G.players[0].pos,5);assert.equal(f.ctx.G.players[0].cash,1300);assert.equal(f.ctx.G.own[0].h,1);assert.equal(f.ctx.G.houses,35)});
  await test('pre-roll save still rolls exactly once and then offers End Turn',async()=>{const f=fixture('pre');await f.resume();assert.deepEqual(f.events,[['action','roll'],['roll'],['move',5],['land'],['action','end']])});
  await test('AI post-roll resume manages assets without another roll',async()=>{const f=fixture('post',true);await f.resume();assert.deepEqual(f.events,[['manage']])});
  await test('third consecutive double after save still sends player to jail',async()=>{const f=fixture('pre',false,[[3,3]]);f.ctx.G.doubles=2;await f.resume();assert.deepEqual(f.events,[['action','roll'],['roll'],['jail'],['action','end']]);assert.equal(f.ctx.G.players[0].inJail,true);assert.equal(f.ctx.G.players[0].st.dbl3,1)});
  await test('turn advancement clears the saved double count',async()=>{const f=fixture();f.ctx.G.doubles=2;f.ctx.advanceTurn();assert.equal(f.ctx.G.doubles,0);assert.equal(f.ctx.G.turn,1)});
  await test('legacy pre-roll save without doubles remains playable',async()=>{const f=fixture('pre');await f.resume();assert.equal(f.events.filter(e=>e[0]==='roll').length,1)});
  await test('jail turn is not skipped on resume',async()=>{const f=fixture('jail');f.ctx.G.players[0].inJail=true;await f.resume();assert.deepEqual(f.events,[['jail-turn'],['action','end']])});
  await test('new busy-phase turn keeps the normal roll flow',async()=>{const f=fixture('busy');await f.resume();assert.equal(f.events[0][1],'roll');assert.equal(f.events.filter(e=>e[0]==='roll').length,1)});
  await test('bankrupt player cannot gain a turn on resume',async()=>{const f=fixture();f.ctx.G.players[0].bankrupt=true;await f.resume();assert.deepEqual(f.events,[])});
  await test('simulation and online games do not overwrite local saves',async()=>{for(const flag of ['sim','online']){const f=fixture();f.ctx.G[flag]=true;f.ctx.save();assert.equal(f.storage.size,0)}});
  if(!process.env.SOURCE_REF){const page=fs.readFileSync(path.join(root,'skyline-estates/index.html'),'utf8');assert.equal(section('async function playTurnInner(p){','async function run(){').replace(/\r\n/g,'\n'),page.slice(page.indexOf('async function playTurnInner(p){'),page.indexOf('async function run(){')).replace(/\r\n/g,'\n'));}
  console.log(`${results.length} turn/save regression tests passed`);
})().catch(e=>{console.error(e);process.exitCode=1});
