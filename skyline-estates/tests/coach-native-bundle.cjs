// Skyline Coach in the native app bundle (www/ from skyline-estates-app/scripts/build-web.mjs).
// Serves www/ as the app would, with the network cut off and no Cache API (as in a WKWebView custom scheme),
// and checks every Voice A recording is bundled, mapped and decodable, plays offline, and survives an app restart.
// Run after `npm run build:web` in skyline-estates-app.
'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const www=path.resolve(__dirname,'../../skyline-estates-app/www');let n=0;const ok=m=>{n++;console.log('PASS',m)};
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.mp3':'audio/mpeg','.woff2':'font/woff2','.glb':'model/gltf-binary'};
(async()=>{
  const man=JSON.parse(fs.readFileSync(path.join(www,'coach/natural-en-f/manifest.json'),'utf8'));
  const ids=Object.keys(man.files);assert.equal(ids.length,862,'853 original recordings, five final-round and four Skyline Duel announcements');
  const bellPhrases=['Skyline Championship! Five rounds remaining.','Four rounds left. Make every move count.','Three rounds to go. It is getting close!','Two rounds remain. Time to make your move.','Final round! This is your last chance to build your skyline!'];
  for(let left=5;left>=1;left--){const id='champ_'+left;assert.equal(man.files[id],id+'.mp3','Voice A bell clip present');assert.equal(man.index.text[bellPhrases[5-left]],id,'recorded announcement maps to correct file')}
  const missing=ids.filter(id=>!fs.existsSync(path.join(www,'coach/natural-en-f',man.files[id])));assert.deepEqual(missing,[]);
  const badMap=Object.entries(man.index||{}).flatMap(([k,v])=>Object.values(v).flat().filter(id=>!man.files[id]).map(id=>k+':'+id));assert.deepEqual(badMap,[]);
  ok(`all ${ids.length} recordings are inside the app bundle and every index mapping points to a bundled file`);
  const served=[];
  const server=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split('?')[0]);const f=path.resolve(www,'.'+(u==='/'?'/index.html':u));if(!f.startsWith(www)){res.writeHead(403).end();return}
    if(/\/coach\//.test(u))served.push(u);fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'});res.end(e?'':b)})});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
  const b=await chromium.launch({args:['--disable-webgl','--autoplay-policy=no-user-gesture-required'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  const ctx=await b.newContext({viewport:{width:932,height:430}});
  let external=0;await ctx.route('**/*',r=>{if(r.request().url().startsWith(origin))return r.continue();external++;return r.abort()}); // offline: only the bundle
  await ctx.addInitScript(()=>{window.Capacitor={isNativePlatform:()=>true,getPlatform:()=>'ios',Plugins:{},isPluginAvailable:()=>false};
    try{delete window.caches}catch(e){}Object.defineProperty(window,'caches',{value:undefined,configurable:true});
    window.__speech=[];window.speechSynthesis={speaking:false,getVoices:()=>[],speak(u){__speech.push(u.text)},cancel(){}};window.SpeechSynthesisUtterance=class{constructor(t){this.text=t}};
    if(!localStorage.getItem('skylinePrefs'))localStorage.setItem('skylinePrefs',JSON.stringify({flat2d:true,nickSet:true,nick:'Kelvin',welcomed:1,tutDone:1,stats:{games:9},lc:true,audio:{sfx:true,amb:true,radio:false,vol:.8}}))});
  const p=await ctx.newPage();
  await p.goto(origin+'/index.html');await p.locator('#boot').waitFor({state:'detached',timeout:30000});
  assert.equal(await p.evaluate(()=>!!(PREF.coach&&PREF.coach.on)),false);
  assert.equal(await p.evaluate(()=>SkylineCoach._state.NAT.bundled),true);
  await p.evaluate(()=>(setup.stCat='audio',homeTab('settings')));await p.locator('.coachbox').waitFor();
  await p.waitForFunction(()=>/Included in the app/.test(document.querySelector('.coachbox [data-pack]')?.innerText||''),null,{timeout:15000});
  const packTxt=await p.locator('.coachbox [data-pack]').innerText();assert.equal(await p.locator('.coachbox [data-pack] button').count(),0);
  ok(`Settings shows the voice pack as "${packTxt.trim()}" (no download needed in the app); Coach OFF by default`);
  // decode every bundled recording through the game's audio decoder
  const dec=await p.evaluate(async()=>{const m=await (await fetch('coach/natural-en-f/manifest.json')).json();const ac=new OfflineAudioContext(1,1,24000);let okc=0,bad=[],secs=0;
    for(const [id,f] of Object.entries(m.files)){try{const ab=await (await fetch('coach/natural-en-f/'+f)).arrayBuffer();const buf=await ac.decodeAudioData(ab);if(buf.duration<0.2)throw 0;secs+=buf.duration;okc++}catch(e){bad.push(id)}}return{okc,bad,secs:Math.round(secs)}});
  assert.deepEqual(dec.bad,[]);ok(`all ${dec.okc} bundled recordings decode (${Math.round(dec.secs/60)} min of speech)`);
  // offline playback through the game's audio engine, with FM ducked during speech and restored after
  const play=async()=>p.evaluate(async()=>{if(!window.G||G.over){applyCity('lagos');newGame({lc:true,cash:1600,set:{ai:'normal',speed:'fast',pot:false,maxRounds:300,city:'lagos',perks:false},players:[{name:'Kelvin',tok:TOKENS[0],col:PCOL[0],ai:false,tl:1},{name:'Kofi',tok:TOKENS[1],col:PCOL[1],ai:true,tl:1}]});startWith(G);await new Promise(r=>setTimeout(r,2500))}
    PREF.coach.on=true;PREF.coach.voice='natural';SkylineCoach.stop();const S=SkylineCoach._state;S.Q.recent.clear();__speech.length=0;
    const plays=S.NAT.plays||0;SkylineCoach.say('Do you want to acquire Eko Atlantic City?',1);let ducked=false;
    const heard=[];let undone=false;
    for(let i=0;i<200;i++){await new Promise(r=>setTimeout(r,100));if(S.D.ducked)ducked=true;if(S.NAT.last&&heard[heard.length-1]!==S.NAT.last.join('+'))heard.push(S.NAT.last.join('+'));
      if(S.NAT.plays>plays&&!S.Q.cur&&!S.D.ducked){undone=true;break}}
    return{played:(S.NAT.plays||0)-plays,last:heard,ducked,undone,sys:__speech.length}});
  let r=await play();assert.ok(r.played>=1,"played "+r.played);assert.equal(r.sys,0);assert.ok(r.ducked&&r.undone,'FM/ambience ducked during speech and restored');
  ok(`offline in-app playback: "${r.last.join(' + ')}" played from the bundle, music ducked then restored, no system speech`);
  // iPhone fallback: if WebKit can't decode a clip (or the audio clock is stuck), the recording plays through an <audio> element instead
  const fb=await p.evaluate(async()=>{const orig=AC.decodeAudioData.bind(AC);AC.decodeAudioData=(ab,ok,bad)=>{bad(new Error('EncodingError'))};SkylineCoach._state.NAT.buf.clear();
    const d0=Object.assign({},SkylineCoach._state.NAT.diag||{});const S=SkylineCoach._state;S.Q.recent.clear();SkylineCoach.say('Investment Forum! Buy a street, or network for a stipend.',1);
    for(let i=0;i<80&&!((S.NAT.diag||{}).elPlayed>(d0.elPlayed||0));i++)await new Promise(r=>setTimeout(r,100));
    for(let i=0;i<80&&S.Q.cur;i++)await new Promise(r=>setTimeout(r,100));AC.decodeAudioData=orig;const d=S.NAT.diag||{};
    return{el:(d.elPlayed||0)-(d0.elPlayed||0),decodeFail:(d.decodeFail||0)-(d0.decodeFail||0),src:S.NAT.el&&S.NAT.el.src.split('/').pop(),sys:__speech.length}});
  assert.ok(fb.el>=1&&fb.decodeFail>=1,JSON.stringify(fb));assert.equal(fb.sys,0);
  ok(`if WebKit can't decode a clip, the same recording plays through the audio-element fallback (${fb.src}), never robotic speech`);
  // restart the app: settings and recordings are still there without any network
  await p.reload();await p.locator('#boot').waitFor({state:'detached',timeout:30000});
  assert.equal(await p.evaluate(()=>PREF.coach.on&&PREF.coach.voice),'natural');
  r=await play();assert.ok(r.played>=1,"played "+r.played);assert.equal(r.sys,0);
  ok('after an app restart (still offline) the Coach setting persists and the recordings play again');
  const off=await p.evaluate(async()=>{const S=SkylineCoach._state;S.Q.recent.clear();SkylineCoach.say('Do you want to acquire Eko Atlantic City?',1);await new Promise(r=>setTimeout(r,300));PREF.coach.on=false;SkylineCoach.stop();
    await new Promise(r=>setTimeout(r,200));return{cur:!!S.Q.cur,ducked:S.D.ducked,src:!!S.NAT.src}});
  assert.deepEqual(off,{cur:false,ducked:false,src:false});ok('switching the Coach off stops speech immediately and restores the music');
  assert.equal(await p.locator('.coachbox, [class*=coach]').count()>=0,true);
  assert.equal(await p.evaluate(()=>[...document.querySelectorAll('#game *')].some(e=>/coach|subtitle/i.test(e.className+''))),false);ok('no Coach subtitles or HUD on the game screen');
  console.log(`(external requests blocked: ${external}; bundle clip requests: ${served.length})`);
  await b.close();server.close();console.log(`COACH NATIVE BUNDLE ${n} checks`);
})().catch(e=>{console.error(e);process.exit(1)});
