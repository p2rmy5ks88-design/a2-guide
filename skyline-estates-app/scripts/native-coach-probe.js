/* Native validation probe for Skyline Coach (CI only, never shipped). Inserted by scripts/inject-native-probe.sh coach.
   Each launch shows the next scene and writes what the Coach did into a small on-screen report for the screenshot:
   1 Dark game: every bundled Voice A recording decoded by WebKit, then a purchase line, a card and a corner played
     through the game's audio engine, Skyline FM ducked during speech and restored, Coach switched off mid-line.
   2 Daylight game: the same lines again (settings kept from launch 1, so this is after an app restart).
   3 Dark Settings → Sound, 4 Daylight Settings → Sound: the Coach section, saved game and Coach settings still there. */
(function(){var K='coachProbeStep',n=+(localStorage.getItem(K)||0);localStorage.setItem(K,String(n+1));
 var S=[['dark','game'],['light','game'],['dark','settings'],['light','settings']][n%4];
 var P={};try{P=JSON.parse(localStorage.getItem('skylinePrefs')||'{}')||{}}catch(e){}
 var first=!P.coach;
 P.nick='Ada';P.nickSet=true;P.welcomed=1;P.tutDone=1;P.stats=P.stats||{games:9};P.city='lagos';P.ui=S[0];P.lc=true;P.flat2d=false;
 P.audio=P.audio||{sfx:true,amb:true,radio:true,vol:.8};P.audio.radio=true;
 if(first)P.coach={on:true,voice:'natural',vol:.8,rate:1,mode:'important',style:'standard',v2:1}; // later launches keep whatever was saved
 localStorage.setItem('skylinePrefs',JSON.stringify(P));
 var R=[];function out(t){R.push(t);var d=document.getElementById('coachProbe');if(!d){d=document.createElement('div');d.id='coachProbe';
   d.style.cssText='position:fixed;left:6px;bottom:6px;z-index:2147483647;max-width:62vw;font:600 10px/1.35 -apple-system,system-ui,sans-serif;background:rgba(0,0,0,.72);color:#fff;padding:6px 8px;border-radius:8px;pointer-events:none;white-space:pre-wrap';document.body.appendChild(d)}
   d.textContent='COACH PROBE · launch '+(n+1)+' · '+S.join(' ')+'\n'+R.join('\n')}
 var wait=function(ms){return new Promise(function(r){setTimeout(r,ms)})};
 function fm(){try{return AUD&&AUD.buses?(+AUD.buses.rad.gain.value).toFixed(2):'n/a'}catch(e){return 'n/a'}}
 async function idle(St){for(var i=0;i<80&&(St.Q.cur||St.D.ducked);i++)await wait(100)}
 async function line(text,label){var C=SkylineCoach,St=C._state,N=St.NAT,minFm=9,ducked=false;await idle(St);await wait(300);var before=fm();St.Q.recent.clear();N.last=null;var t0=Date.now();C.say(text,1);
   for(var i=0;i<120;i++){await wait(100);var g=+fm();if(!isNaN(g))minFm=Math.min(minFm,g);if(St.D.ducked)ducked=true;if(N.last&&!St.Q.cur&&!St.D.ducked)break}
   var got=N.last?N.last.join('+'):'';var el=Date.now()-t0;await wait(2500);
   out(label+': '+(got?'played '+got:'NOT played')+' · FM '+before+' → '+(ducked?minFm.toFixed(2):'not ducked')+' → '+fm()+' after · '+(el/1000).toFixed(1)+'s · audio '+(typeof AC!=='undefined'&&AC?AC.state:'none'))}
 async function run(){var C=window.SkylineCoach;if(!C){out('Coach module missing');return}var St=C._state,N=St.NAT;
   out('bundled pack: '+N.bundled+' · Coach '+(PREF.coach&&PREF.coach.on?'ON':'OFF')+' · voice '+(PREF.coach&&PREF.coach.voice)+(first?'':' (kept from earlier launch)'));
   if(typeof AC!=='undefined'&&AC){var c0=AC.currentTime;await wait(1000);out('audio clock: '+AC.state+' · advanced '+(AC.currentTime-c0).toFixed(2)+'s in 1s · '+AC.sampleRate+' Hz')}
   var m=await (await fetch('coach/natural-en-f/manifest.json')).json(),ids=Object.keys(m.files);
   out('recordings in manifest: '+ids.length);
   async function decodeAll(){var okc=0,bad=0,secs=0,ac=new (window.AudioContext||window.webkitAudioContext)();
     for(var i=0;i<ids.length;i++){try{var ab=await (await fetch('coach/natural-en-f/'+m.files[ids[i]])).arrayBuffer();var b=await new Promise(function(res,rej){ac.decodeAudioData(ab,res,rej)});secs+=b.duration;okc++}catch(e){bad++}}
     try{ac.close()}catch(e){}out('recordings: '+ids.length+' in manifest · '+okc+' decoded by WebKit · '+bad+' failed · '+Math.round(secs/60)+' min')}
   var sv=localStorage.getItem('skylineSave');out('saved game: '+(sv?'present ('+Math.round(sv.length/1024)+' KB)':'none')+' · cash/coins prefs kept: '+(P.stats?'yes':'?'));
   if(S[1]!=='game'){out('Coach settings after restart: '+(PREF.coach.on?'ON':'OFF')+' · '+PREF.coach.voice+' · volume '+PREF.coach.vol);out('decoding every recording…');await decodeAll();return}
   await line('Do you want to acquire Eko Atlantic City?','purchase');
   await line('Lucky Break! Sponsor Eyo Festival. Make your choice.','card');
   await line('Investment Forum! Buy a street, or network for a stipend.','corner');
   await line('Eyo Festival is live! Lagos Island rents are up 50 percent.','event');
   await idle(St);St.Q.recent.clear();C.say('Do you want to acquire Eko Atlantic City?',1);for(var w=0;w<30&&!St.Q.cur;w++)await wait(50);await wait(300);var on=!!St.Q.cur;PREF.coach.on=false;C.stop();await wait(150);
   out('switch off mid-line: was speaking '+on+' → speaking '+!!St.Q.cur+', FM ducked '+St.D.ducked+' (FM '+fm()+')');PREF.coach.on=true;try{savePref()}catch(e){}
   var hud=[].slice.call(document.querySelectorAll('#game *')).some(function(e){return /coach|subtitle/i.test(String(e.className))});out('Coach HUD/subtitles on game screen: '+(hud?'FOUND':'none'))}
 function go(){if(document.getElementById('boot')||typeof homeTab!=='function'){return setTimeout(go,500)}
  if(S[1]==='settings'){setup.stCat='audio';homeTab('settings');setTimeout(function(){var c=document.querySelector('.coachbox');if(c)c.scrollIntoView({block:'center'});run().catch(function(e){out('error '+e)})},1500);return}
  try{applyCity('lagos');newGame({lc:true,cash:1600,set:{ai:'normal',speed:'normal',pot:false,maxRounds:300,city:'lagos',perks:false},players:[{name:'Ada',tok:TOKENS[0],col:PCOL[0],ai:false,tl:1},{name:'Kofi',tok:TOKENS[1],col:PCOL[1],ai:true,tl:1},{name:'Mei',tok:TOKENS[2],col:PCOL[2],ai:true,tl:1}]});startWith(G)}catch(e){out('start error '+e)}
  setTimeout(function(){try{GEN++;document.querySelector('#modals').innerHTML='';G.turn=0}catch(e){}
   run().catch(function(e){out('error '+e)})},4000)}
 setTimeout(go,1500)})();
