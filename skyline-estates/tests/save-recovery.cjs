const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {execFileSync}=require('node:child_process');const root=path.resolve(__dirname,'../..');
const source=process.env.SOURCE_REF?execFileSync('git',['show',`${process.env.SOURCE_REF}:skyline-estates/game.html`],{cwd:root,encoding:'utf8',maxBuffer:4e6}):fs.readFileSync(path.join(root,'skyline-estates/game.html'),'utf8');
const start=source.indexOf("const SKEY='skylineSave'"),code=source.slice(start,source.indexOf('try{window.claude?.hot',start));
const clone=x=>JSON.parse(JSON.stringify(x));let count=0;
function fixture(){
  const storage=new Map(),messages=[];const cards=Array.from({length:16},(_,i)=>({goojf:i===9}));
  const ctx={G:{v:1,players:[0,1].map(id=>({id,name:'P'+id,tok:'T',col:'#fff',ai:false,cash:1600,pos:0,inJail:false,jailTurns:0,goojf:[],declined:{},lastOffer:-9,bankrupt:false})),own:Array.from({length:40},()=>({o:-1,h:0,m:false})),turn:0,round:1,houses:36,hotels:12,pot:0,set:{mode:'classic',city:'lagos'},log:[],over:false,phase:'pre',chance:Array.from({length:16},(_,i)=>i),esusu:Array.from({length:16},(_,i)=>i)},
    FAST:false,toast:m=>messages.push(m),console:{warn(){}},SQ:Array.from({length:40},(_,i)=>({t:i===4?'tax':'prop'})),CITY_DATA:{lagos:{}},CHANCE:cards,ESUSU:cards,
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}};
  vm.createContext(ctx);vm.runInContext(code,ctx);return{ctx,storage,messages};
}
async function test(name,fn){await fn();count++;console.log('PASS',name)}
(async()=>{
  await test('malformed state is not offered as Continue',()=>{const f=fixture();f.storage.set('skylineSave','{}');assert.equal(f.ctx.loadSave(),null);assert.equal(f.storage.get('skylineSave'),'{}');assert.ok(f.messages.length)});
  await test('legacy v1 game loads without changing its rules or economy',()=>{const f=fixture();f.ctx.G.set.ffa=true;f.storage.set('skylineSave',JSON.stringify(f.ctx.G));assert.deepEqual(clone(f.ctx.loadSave()),clone(f.ctx.G))});
  await test('new writes have an explicit format version',()=>{const f=fixture();assert.equal(f.ctx.save(),true);const data=JSON.parse(f.storage.get('skylineSave'));assert.equal(data.saveVersion,1);assert.ok(data.savedAt>0);assert.deepEqual(data.game,clone(f.ctx.G))});
  await test('previous valid save is retained as backup',()=>{const f=fixture();f.ctx.save();f.ctx.G.players[0].cash=1500;f.ctx.save();assert.equal(JSON.parse(f.storage.get('skylineSave.backup')).game.players[0].cash,1600);assert.equal(f.ctx.loadSave().players[0].cash,1500)});
  await test('truncated current save recovers the prior checkpoint',()=>{const f=fixture();f.ctx.save();f.ctx.G.players[0].cash=1500;f.ctx.save();f.storage.set('skylineSave','{"game":');assert.equal(f.ctx.loadSave().players[0].cash,1600);assert.match(f.messages[0],/earlier saved turn/);assert.equal(f.storage.get('skylineSave'),'{"game":')});
  await test('legacy backup can be recovered',()=>{const f=fixture();f.storage.set('skylineSave','null');f.storage.set('skylineSave.backup',JSON.stringify(f.ctx.G));assert.equal(f.ctx.loadSave().round,1)});
  await test('bad backup and primary fail safely',()=>{const f=fixture();f.storage.set('skylineSave','null');f.storage.set('skylineSave.backup','[]');assert.equal(f.ctx.loadSave(),null);assert.equal(f.storage.size,2)});
  await test('future format is neither loaded nor overwritten',()=>{const f=fixture();const raw=JSON.stringify({saveVersion:2,game:f.ctx.G});f.storage.set('skylineSave',raw);f.storage.set('skylineSave.backup',JSON.stringify(f.ctx.G));assert.equal(f.ctx.loadSave(),null);assert.equal(f.ctx.save(),false);assert.equal(f.storage.get('skylineSave'),raw);assert.match(f.messages[0],/newer game version/)});
  await test('unsupported legacy version is preserved',()=>{const f=fixture();const g=clone(f.ctx.G);g.v=2;const raw=JSON.stringify(g);f.storage.set('skylineSave',raw);assert.equal(f.ctx.loadSave(),null);assert.equal(f.ctx.save(),false);assert.equal(f.storage.get('skylineSave'),raw)});
  const invalid={
    'missing settings':g=>delete g.set,'wrong board size':g=>g.own.pop(),'negative cash':g=>g.players[0].cash=-1,'nonfinite cash':g=>g.players[0].cash=Infinity,
    'wrong player id':g=>g.players[0].id=3,'invalid position':g=>g.players[0].pos=40,'invalid turn':g=>g.turn=99,'invalid round':g=>g.round=0,
    'invalid city':g=>g.set.city='missing','invalid mode':g=>g.set.mode='missing','invalid timed limit':g=>Object.assign(g.set,{mode:'timed',rounds:0}),
    'unknown phase':g=>g.phase='missing','invalid owner':g=>g.own[1].o=3,'unowned building':g=>g.own[1].h=1,
    'mortgaged building':g=>{g.own[1]={o:0,h:1,m:true};g.houses--},'ownership of tax square':g=>g.own[4].o=0,
    'house shortage':g=>g.houses--,'hotel surplus':g=>g.hotels++,'duplicate deck card':g=>g.chance[0]=1,'missing deck card':g=>g.esusu.pop(),
    'invalid bail pass':g=>{g.players[0].goojf.push({deck:'chance',idx:0});g.chance.shift()},'invalid held deck':g=>g.players[0].goojf.push({deck:'other',idx:9})
  };
  for(const [name,mutate] of Object.entries(invalid))await test('reject '+name,()=>{const f=fixture();mutate(f.ctx.G);assert.equal(f.ctx.validateSave(f.ctx.G),false)});
  await test('legitimate houses and towers conserve the bank',()=>{const f=fixture();f.ctx.G.own[1]={o:0,h:3,m:false};f.ctx.G.houses=33;f.ctx.G.own[2]={o:1,h:5,m:false};f.ctx.G.hotels=11;assert.equal(f.ctx.validateSave(f.ctx.G),true)});
  await test('held bail passes remain valid across saves',()=>{const f=fixture();f.ctx.G.chance.splice(9,1);f.ctx.G.players[0].goojf.push({deck:'chance',idx:9});assert.equal(f.ctx.save(),true);assert.equal(f.ctx.loadSave().players[0].goojf[0].idx,9)});
  await test('bad current data is retained before a new game replaces it',()=>{const f=fixture();f.storage.set('skylineSave','bad data');assert.equal(f.ctx.save(),true);assert.equal(f.storage.get('skylineSave.unreadable'),'bad data');assert.ok(f.ctx.loadSave())});
  await test('storage write failure keeps the last primary save',()=>{const f=fixture();f.ctx.save();const old=f.storage.get('skylineSave');f.ctx.localStorage.setItem=()=>{throw Error('quota')};f.ctx.G.players[0].cash=100;assert.equal(f.ctx.save(),false);assert.equal(f.storage.get('skylineSave'),old);assert.match(f.messages[0],/Could not save/)});
  await test('primary failure after backup still leaves recoverable data',()=>{const f=fixture();f.ctx.save();const old=f.storage.get('skylineSave');f.ctx.localStorage.setItem=(k,v)=>{if(k==='skylineSave')throw Error('quota');f.storage.set(k,v)};assert.equal(f.ctx.save(),false);assert.equal(f.storage.get('skylineSave'),old);assert.equal(f.storage.get('skylineSave.backup'),old)});
  await test('storage read failure is reported without throwing',()=>{const f=fixture();f.ctx.localStorage.getItem=()=>{throw Error('denied')};assert.equal(f.ctx.loadSave(),null);assert.match(f.messages[0],/storage settings/)});
  await test('repeated unreadable save warning is shown once',()=>{const f=fixture();f.storage.set('skylineSave','bad');f.ctx.loadSave();f.ctx.loadSave();assert.equal(f.messages.length,1)});
  await test('online and simulation completion cannot erase offline saves',()=>{for(const flag of ['online','sim']){const f=fixture();f.ctx.save();f.ctx.G[flag]=true;assert.equal(f.ctx.clearSave(),false);assert.ok(f.storage.get('skylineSave'))}});
  await test('completed offline game clears both active checkpoints',()=>{const f=fixture();f.ctx.save();f.ctx.save();f.ctx.G.over=true;assert.equal(f.ctx.clearSave(),true);assert.equal(f.ctx.loadSave(),null);assert.equal(f.storage.has('skylineSave.backup'),false)});
  await test('failed Save & exit keeps the active match open',async()=>{const f=fixture();let titles=0;Object.assign(f.ctx,{modal:async()=> 'quit',camMode:'follow',NET:{},esc:x=>x,GEN:10,showTitle:()=>titles++,save:()=>false});const a=source.indexOf('async function openMenu(){'),b=source.indexOf("$('#bAssets').onclick",a);vm.runInContext(source.slice(a,b),f.ctx);await f.ctx.openMenu();assert.equal(f.ctx.GEN,10);assert.equal(titles,0)});
  const page=fs.readFileSync(path.join(root,'skyline-estates/index.html'),'utf8');assert.equal(code.replace(/\r\n/g,'\n'),page.slice(page.indexOf("const SKEY='skylineSave'"),page.indexOf('try{window.claude?.hot',page.indexOf("const SKEY='skylineSave'"))).replace(/\r\n/g,'\n'));
  console.log(`${count} save recovery regression tests passed`);
})().catch(e=>{console.error(e);process.exitCode=1});
