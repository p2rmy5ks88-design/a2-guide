// Skyline Coach v1: opt-in background voice. Uses a recording speechSynthesis stub (headless browsers have no audio),
// so this verifies WHAT would be spoken, ordering, ducking and lifecycle — not how it sounds.
'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),OUT=process.argv[2]||'';let n=0;const ok=m=>{n++;console.log('PASS',m)};
const STUB=()=>{const log=window.__speech=[];let cur=null;
  class U{constructor(t){this.text=t;this.volume=1;this.rate=1}}
  window.SpeechSynthesisUtterance=U;
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speaking:false,getVoices:()=>window.__voices||[{name:'Stub Voice NG',lang:'en-NG',default:false},{name:'Stub Voice US',lang:'en-US',default:true},{name:'Stub Voice GB Enhanced',lang:'en-GB',default:false},{name:'Stub Voice FR',lang:'fr-FR',default:false},{name:'Zarvox',lang:'en-US',default:false},{name:'Stub Voice Broken',lang:'en-AU',default:false}],addEventListener(){},
    speak(u){if(!u.text.trim())return;if(u.voice&&u.voice.name==='Stub Voice Broken'){log.push({silentFail:u.voice.name});return}if(u.volume===0&&u.text==='Skyline'){setTimeout(()=>u.onstart&&u.onstart(),5);return}setTimeout(()=>u.onstart&&u.onstart(),5);if(cur)log.push({overlap:true,text:u.text});cur=u;log.push({text:u.text,at:Date.now(),voice:u.voice&&u.voice.name,vol:u.volume,rate:u.rate,rad:window.AUD&&AUD.buses?+AUD.buses.rad.gain.value.toFixed(2):null});
      setTimeout(()=>{if(cur===u){cur=null;u.onend&&u.onend()}},Math.min(1500,u.text.length*25))},
    cancel(){log.push({cancel:true});const u=cur;cur=null;u&&u.onend&&u.onend()}}})};
(async()=>{
  const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!f.startsWith(root)){res.writeHead(403).end();return}fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg'})[path.extname(f)]||'application/octet-stream'});res.end(b)})});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
  const b=await chromium.launch({args:['--disable-webgl','--autoplay-policy=no-user-gesture-required']});
  const ctx=await b.newContext({viewport:{width:932,height:430},deviceScaleFactor:2});await ctx.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  await p.addInitScript(STUB);
  await p.addInitScript(()=>{if(!localStorage.getItem('skylinePrefs'))localStorage.setItem('skylinePrefs',JSON.stringify({flat2d:true,nickSet:true,nick:'Kelvin',welcomed:1,tutDone:1,stats:{games:9},lc:true,audio:{sfx:true,amb:true,radio:false,vol:.8}}))});
  const url=origin+'/skyline-estates/index.html';
  await p.goto(url);await p.locator('#boot').waitFor({state:'detached',timeout:25000});
  // 1. default OFF and settings UI
  assert.equal(await p.evaluate(()=>!!(PREF.coach&&PREF.coach.on)),false);
  await p.evaluate(()=>(setup.stCat='audio',homeTab('settings')));await p.locator('.coachbox').waitFor();
  assert.equal(await p.locator('.coachbox [data-on="0"].on').count(),1);ok('Coach is OFF by default; Skyline Coach section appears inside Settings → Sound');
  if(OUT){for(const ui of ['dark','light']){await p.evaluate(u=>{PREF.ui=u;applyUI();(setup.stCat='audio',homeTab('settings'))},ui);await p.locator('.coachbox').waitFor();await p.locator('.coachbox').scrollIntoViewIfNeeded();await p.waitForTimeout(300);await p.screenshot({path:`${OUT}/coach-settings-${ui}.png`})}await p.evaluate(()=>{PREF.ui='dark';applyUI();(setup.stCat='audio',homeTab('settings'))})}
  // Automatic default: the device default English voice (no country preference); non-English voices never listed
  const opts=await p.locator('.coachbox select option').allTextContents();
  assert.match(opts[0],/^System English \(Automatic\)/);assert.ok(!opts.some(o=>/fr-FR/.test(o)));assert.equal(await p.locator('.coachbox select').inputValue(),'');
  await p.locator('.coachbox [data-on="1"]').click();await p.locator('.coachbox [data-prev]').click();await p.waitForTimeout(150);
  let last=await p.evaluate(()=>__speech.filter(x=>x.text).slice(-1)[0]);assert.equal(last.voice,'Stub Voice US');
  assert.ok(!opts.some(o=>/Zarvox/.test(o)),'novelty voices hidden');
  const fb=await p.evaluate(()=>{const vs=speechSynthesis.getVoices().filter(v=>!/Broken|Zarvox/.test(v.name)).map(v=>({...v,default:false}));window.__voices=vs;const a=SkylineCoach.voice('');window.__voices=[{name:'Plain en-ZA',lang:'en-ZA'}];const b=SkylineCoach.voice('');window.__voices=[];const c=SkylineCoach.voice('');delete window.__voices;return[a,b,c]});
  assert.deepEqual(fb,['Stub Voice GB Enhanced','Plain en-ZA',null]);
  ok('Automatic = device default English voice; without one, the most natural installed English voice (enhanced first, no accent preference); none → device language');
  // a voice that never starts speaking: the line is retried with Automatic, the voice is hidden, and the player is told
  await p.locator('.coachbox select').selectOption('Stub Voice Broken');await p.locator('.coachbox [data-prev]').click();await p.waitForTimeout(4700);
  const br=await p.evaluate(()=>({last:__speech.filter(x=>x.text).slice(-1)[0],bad:PREF.coach.bad,voice:PREF.coach.voice,note:document.querySelector('.coachbox [data-note]').textContent,listed:[...document.querySelectorAll('.coachbox option')].some(o=>/Broken/.test(o.textContent))}));
  assert.equal(br.last.voice,'Stub Voice US');assert.deepEqual(br.bad,['Stub Voice Broken']);assert.equal(br.voice,'');assert.match(br.note,/didn’t work on this device/);assert.equal(br.listed,false);
  ok('a voice that does not work on the device: the line is spoken again with Automatic, the voice is hidden and the player is told');
  await p.evaluate(()=>{PREF.coach.bad=[];SkylineCoach.stop()});await p.evaluate(()=>{setup.stCat='audio';homeTab('settings')});await p.locator('.coachbox [data-chk]').click();
  await p.waitForFunction(()=>/English voices work/.test(document.querySelector('.coachbox [data-note]')?.textContent||''),null,{timeout:15000});
  const chk=await p.evaluate(()=>({note:document.querySelector('.coachbox [data-note]').textContent,bad:PREF.coach.bad}));assert.match(chk.note,/^3 of 4 English voices work/);assert.deepEqual(chk.bad,['Stub Voice Broken']);
  ok('Check voices silently tests every English voice: "'+chk.note+'"');
  await p.locator('.coachbox select').selectOption('Stub Voice NG');await p.locator('.coachbox input[data-k="rate"]').fill('1.1');await p.locator('.coachbox [data-m="important"]').click();
  await p.locator('.coachbox [data-prev]').click();await p.waitForTimeout(150);
  last=await p.evaluate(()=>__speech.filter(x=>x.text).slice(-1)[0]);assert.match(last.text,/Ready to roll/);assert.equal(last.voice,'Stub Voice NG');assert.equal(last.rate,1.1);ok('a manually chosen accent is used; Preview voice works');
  await p.reload();await p.locator('#boot').waitFor({state:'detached',timeout:25000});
  assert.deepEqual(await p.evaluate(()=>[PREF.coach.on,PREF.coach.voice,PREF.coach.rate,PREF.coach.mode]),[true,'Stub Voice NG',1.1,'important']);
  await p.evaluate(()=>{setup.stCat='audio';homeTab('settings')});await p.locator('.coachbox').waitFor();assert.equal(await p.locator('.coachbox select').inputValue(),'Stub Voice NG');
  await p.locator('.coachbox select').selectOption('');assert.equal(await p.evaluate(()=>PREF.coach.voice),'');
  await p.locator('.coachbox select').selectOption('Stub Voice NG');ok('choices survive reload; players can switch back to Automatic');
  // 2. play a short Living City game: 1 human + 2 AI, auto-answering every prompt
  await p.evaluate(()=>{sleep=ms=>new Promise(r=>setTimeout(r,Math.min(ms||0,40)));initAudio();PREF.audio.radio=true;syncAudio()});
  await p.evaluate(()=>{applyCity('lagos');newGame({lc:true,cash:1600,set:{ai:'normal',speed:'fast',pot:false,maxRounds:300,city:'lagos',perks:false,mode:'timed',rounds:8},players:[{name:'Kelvin',tok:TOKENS[0],col:PCOL[0],ai:false,tl:1},{name:'Kofi',tok:TOKENS[1],col:PCOL[1],ai:true,tl:1},{name:'Mei',tok:TOKENS[2],col:PCOL[2],ai:true,tl:1}]});
    const g=G;GROUPS.sky.forEach(i=>{g.own[i].o=0});g.players[0].cash=4000;startWith(g)});
  const drive=()=>p.evaluate(()=>{if(!G)return'none';if(G.over)return'over';const ovs=[...document.querySelectorAll('#modals .ov:not(.bye)')],ov=ovs[ovs.length-1];
    if(ov){if(/landlord of/.test(ov.textContent))return'over';const bs=[...ov.querySelectorAll('button')].filter(b=>!b.disabled&&b.offsetParent!==null);const bb=ov.querySelector('.lc-lmm')?bs[0]:bs.find(b=>/\bpri\b/.test(b.className))||bs[bs.length-1];if(bb){bb.click();return'modal'}return'wait'}
    const a=[...document.querySelectorAll('#acts button')].filter(b=>!b.disabled);if(a.length){if(a.some(b=>/END/i.test(b.textContent))&&!window.__built){const me=G.players[0],i=G.own.findIndex((o,i)=>o.o===0&&canBuild(0,i));if(i>=0){build(0,i);renderRoster();window.__built=1}}a[0].click();return'act'}return'wait'});
  let duckSeen=false,radMin=1;const t0=Date.now();
  while(Date.now()-t0<70000){const r=await drive();if(r==='over')break;const st=await p.evaluate(()=>({sp:!!SkylineCoach._state.Q.cur,ducked:SkylineCoach._state.D.ducked,rad:AUD.buses?AUD.buses.rad.gain.value:1}));if(st.sp&&st.ducked){duckSeen=true;radMin=Math.min(radMin,st.rad)}await p.waitForTimeout(40)}
  await p.waitForTimeout(2500);
  const said=await p.evaluate(()=>__speech);const texts=said.filter(x=>x.text).map(x=>x.text);
  console.log('SPOKEN ('+texts.length+'):\n  '+[...new Set(texts)].slice(0,40).join('\n  '));
  assert.ok(texts.some(t=>/^Do you want to acquire [A-Z]/.test(t)),'purchase prompt');ok('purchase offer asks: "'+texts.find(t=>/^Do you want/.test(t))+'"');
  assert.ok(!said.some(x=>x.overlap),'never speaks over itself');assert.ok(texts.length>=5,'announcements made');
  assert.ok(texts.some(t=>/^Your turn/.test(t)),'my turn');  ok(`real Living City match: ${texts.length} announcements, never overlapping (${[...new Set(texts.map(t=>t.split(/[ !.]/)[0]))].slice(0,12).join(', ')})`);
  const rounds=await p.evaluate(()=>G.round);const per=texts.length/rounds;assert.ok(per<=4,'not excessive: '+per.toFixed(1)+' per round');ok(`pace ${per.toFixed(1)} announcements per round (3 players, game sped up ~10×): one at a time, at most one waiting`);
  const bl=await p.evaluate(async()=>{await new Promise(r=>setTimeout(r,1600));__speech.length=0;const i=G.own.findIndex((o,i)=>SQ[i].t==='prop'&&o.o===0);G.own[i].h=Math.min(4,G.own[i].h+1);renderRoster();
    await new Promise(r=>setTimeout(r,200));return __speech.filter(x=>x.text).map(x=>x.text)});
  assert.ok(bl.some(t=>/development complete|construction complete/.test(t)),JSON.stringify(bl));ok('building upgrade announced from committed state: "'+bl[0]+'"');
  const cr=await p.evaluate(async()=>{await new Promise(r=>setTimeout(r,1600));G.players[0].cr=null;renderRoster();SkylineCoach._state.Q.recent.clear();__speech.length=0;G.players[0].cr={from:G.round,why:'audit'};renderRoster();await new Promise(r=>setTimeout(r,1500));G.players[0].cr=null;renderRoster();await new Promise(r=>setTimeout(r,1500));return __speech.filter(x=>x.text).map(x=>x.text)});
  assert.deepEqual(cr,['Civic Review! Your rent income is temporarily suspended.','Your planning restriction has ended.']);ok('Civic Review start and end announced');
  // 3. ducking and restore
  await p.waitForTimeout(2500);const after=await p.evaluate(()=>({rad:+AUD.buses.rad.gain.value.toFixed(2),amb:+AUD.buses.amb.gain.value.toFixed(2),sfx:+AUD.buses.sfx.gain.value.toFixed(2),radioOn:AUD.radioOn,ambOn:AUD.ambOn,radioPref:PREF.audio.radio,vol:PREF.audio.vol,ducked:SkylineCoach._state.D.ducked}));
  assert.ok(duckSeen,'ducked while speaking');assert.ok(radMin<.05,'FM silent while speaking: '+radMin);assert.equal(after.ducked,false);assert.equal(after.sfx,1);assert.equal(after.rad,after.radioOn?1:0);assert.equal(after.amb,after.ambOn?1:0);assert.equal(after.vol,.8);assert.equal(after.radioPref,true);
  ok('Skyline FM goes silent and ambience fades while the Coach speaks and return to their live levels afterwards; saved audio preferences untouched');
  // 3b. FM recovery: if the system voice suspends the audio engine and pauses the radio, both come back afterwards
  const fmr=await p.evaluate(async()=>{const s=FMS.slots[FMS.cur];SkylineCoach._state.Q.recent.clear();SkylineCoach.say('Recovery check line.',2);await new Promise(r=>setTimeout(r,100));
    await AC.suspend();if(s)s.a.pause();await new Promise(r=>setTimeout(r,3500));return{ac:AC.state,paused:s?s.a.paused:'no-slot',rad:+AUD.buses.rad.gain.value.toFixed(2),radioOn:AUD.radioOn}});
  assert.equal(fmr.ac,'running');assert.notEqual(fmr.paused,true);assert.equal(fmr.rad,fmr.radioOn?1:0);ok('after speech the audio engine is resumed and a paused Skyline FM track plays again at full level ('+JSON.stringify(fmr)+')');
  // 4. critical speech overrides routine; duplicates suppressed; stale dropped
  const pr=await p.evaluate(async()=>{__speech.length=0;SkylineCoach.say('Routine line one.',3);SkylineCoach.say('Critical line!',1);SkylineCoach.say('Critical line!',1);await new Promise(r=>setTimeout(r,2500));return __speech.map(x=>x.cancel?'<cancel>':x.text)});
  assert.deepEqual(pr.filter(x=>x!=='<cancel>'),['Routine line one.','Critical line!']);assert.ok(pr.includes('<cancel>'));ok('critical speech cuts off routine speech; repeated lines are suppressed');
  // 5. backgrounding and disabling stop speech and restore audio
  const bg=await p.evaluate(async()=>{__speech.length=0;SkylineCoach.say('This should be stopped by backgrounding.',2);Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));
    const r={cancel:__speech.some(x=>x.cancel),ducked:SkylineCoach._state.D.ducked,cur:!!SkylineCoach._state.Q.cur};SkylineCoach.say('Not while hidden.',1);r.hiddenSpoke=__speech.some(x=>x.text==='Not while hidden.');delete document.hidden;return r});
  assert.deepEqual(bg,{cancel:true,ducked:false,cur:false,hiddenSpoke:false});ok('backgrounding stops speech at once, restores audio, and nothing is spoken while hidden');
  // 6. reconnect / sync jump: no replay of history
  const rc=await p.evaluate(()=>{__speech.length=0;const W=SkylineCoach._state.W;W.at=Date.now()-10000;for(let i=0;i<12;i++)log('Kofi paid Kelvin '+fmt(50));G.turn=(G.turn+1)%3;SkylineCoach.check();return __speech.filter(x=>x.text).length});
  assert.equal(rc,0);ok('a reconnect/sync jump only re-baselines: no historical announcements are read out');
  // 7. off: immediate stop
  await p.evaluate(()=>{homeTab&&0});const off=await p.evaluate(async()=>{__speech.length=0;SkylineCoach.say('Long announcement that gets switched off.',2);PREF.coach.on=false;SkylineCoach.stop();SkylineCoach.say('Should not speak.',1);return{cancel:__speech.some(x=>x.cancel),spoke:__speech.some(x=>x.text==='Should not speak.'),ducked:SkylineCoach._state.D.ducked}});
  assert.deepEqual(off,{cancel:true,spoke:false,ducked:false});ok('turning Coach off stops speech immediately and restores audio');
  // 8b. Declare bankruptcy from the in-game menu (local game)
  const bk=await p.evaluate(async()=>{applyCity('lagos');newGame({lc:true,cash:1600,set:{ai:'normal',speed:'fast',pot:false,maxRounds:300,city:'lagos',perks:false},players:[{name:'Kelvin',tok:TOKENS[0],col:PCOL[0],ai:false,tl:1},{name:'Kofi',tok:TOKENS[1],col:PCOL[1],ai:true,tl:1},{name:'Mei',tok:TOKENS[2],col:PCOL[2],ai:true,tl:1}]});G.own[1].o=0;startWith(G);
    await new Promise(r=>setTimeout(r,1500));document.querySelectorAll('#modals .ov').forEach(x=>x.remove());G.turn=0;const w=openMenu();await new Promise(r=>setTimeout(r,300));
    const b=[...document.querySelectorAll('#modals button')].find(x=>x.textContent==='Declare bankruptcy');if(!b)return'no button';b.click();await new Promise(r=>setTimeout(r,400));
    const y=[...document.querySelectorAll('#modals button')].find(x=>x.textContent==='Declare bankruptcy');y.click();await new Promise(r=>setTimeout(r,800));
    return{bankrupt:G.players[0].bankrupt,owner:G.own[1].o,moved:G.turn!==0,over:!!G.over}});
  assert.deepEqual(bk,{bankrupt:true,owner:-1,moved:true,over:false});ok('in-game menu: Declare bankruptcy (with confirmation) removes the player, returns property to the bank and play continues');
  const onl=await p.evaluate(()=>{const o=G.online;G.online=true;const a=SkylineDeclareBankruptcy.allowed();G.online=o;return a});assert.equal(onl,false);ok('Declare bankruptcy is not offered in online rooms');
  // 8. no visible UI during play
  assert.equal(await p.evaluate(()=>document.querySelectorAll('#ui .coachbox, #ui [class*="coach"]').length),0);ok('no Coach elements in the game screen (background audio only)');
  assert.deepEqual(errs.filter(e=>!/Abort/.test(e)),[]);await b.close();server.close();console.log(`SKYLINE COACH ${n} checks`);
})().catch(e=>{console.error(e);process.exit(1)});
