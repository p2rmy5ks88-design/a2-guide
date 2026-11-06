// Living City rules-core parity: the same seeded matches played (a) in the full app (Chromium, every UI library) and
// (b) headless in Node with ONLY the game core + rule libraries (no DOM: a universal stub) must end in identical state.
// This is the server's execution model (Phase 2). Usage: node tests/living-city-parity.cjs [lcSeeds=10] [classicSeeds=4]
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..'),RULE_LIBS=['lib/market-pulse.js','lib/ai-styles.js','lib/living-city-rules.js'];
const NL=+(process.argv[2]||10),NC=+(process.argv[3]||4);
const MATCH=`(async(seed,lc)=>{let s=seed;Math.random=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296};FAST=true;GEN++;applyCity('lagos');
 newGame({lc,cash:1600,set:{ai:'normal',speed:'fast',pot:false,maxRounds:300,city:'lagos',perks:false},players:[0,1,2].map(i=>({name:NAMES[i],tok:TOKENS[i],col:PCOL[i],ai:true,tl:1}))});G.sim=true;
 let err=null;const pe=window.__onErr;window.__onErr=e=>err=e;try{await run()}finally{window.__onErr=pe}
 const g=JSON.parse(JSON.stringify(G));delete g.log;delete g.logN;delete g.masteryId;delete g.lastDice;
 return JSON.stringify({err:err&&String(err),g})})`;
function headless(){const {readSources,createRuntime}=require('../online/headless-runtime.cjs');const rt=createRuntime(readSources(ROOT));const play=rt.run(MATCH);return(seed,lc)=>play(seed,lc)}
const digest=s=>crypto.createHash('sha256').update(s).digest('hex').slice(0,16);
(async()=>{
  const server=headless();
  const browser=await chromium.launch({headless:true,args:['--disable-webgl'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  const page=await browser.newPage();await page.route('https://**/*',r=>r.abort());
  await page.addInitScript(()=>localStorage.setItem('skylinePrefs',JSON.stringify({nick:'Sim',nickSet:true,welcomed:1,tutDone:1,flat2d:true,stats:{games:9}})));
  await page.goto('file://'+path.join(ROOT,'index.html'));await page.locator('#boot').waitFor({state:'detached',timeout:25000});
  const cases=[...Array(NL)].map((_,k)=>[40000+k,true]).concat([...Array(NC)].map((_,k)=>[41000+k,false]));let same=0;
  for(const [seed,lc] of cases){
    const a=JSON.parse(await page.evaluate(([m,seed,lc])=>(0,eval)(m)(seed,lc),[MATCH,seed,lc]));
    const b=JSON.parse(await server(seed,lc));
    assert.equal(a.err,null,'client error '+a.err);assert.equal(b.err,null,'server error '+b.err);
    const ha=digest(JSON.stringify(a.g)),hb=digest(JSON.stringify(b.g));
    if(ha!==hb){if(process.env.DIFF)console.log(JSON.stringify(a.g.ev2),"\n",JSON.stringify(b.g.ev2));const diff=Object.keys(a.g).filter(k=>JSON.stringify(a.g[k])!==JSON.stringify(b.g[k]));throw Error(`seed ${seed} lc=${lc} differs: ${diff.join(',')}`)}
    same++;console.log(`PASS seed ${seed} ${lc?'living-city':'classic'} rounds ${a.g.round} rv ${a.g.rv??'-'} state ${ha}`)}
  await browser.close();console.log(`PARITY ${same}/${cases.length} identical (app with UI vs headless rules core)`);
})().catch(e=>{console.error(e);process.exit(1)});
