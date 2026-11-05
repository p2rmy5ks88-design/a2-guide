/* Task 15: opt-in, on-device beta diary. Nothing is sent anywhere.
   - Off by default. Opening the game with ?beta=1 asks for consent; ?beta=0 turns it off and deletes it.
   - Records anonymous counts only: sessions, active dates, matches started / completed / left
     unfinished, match minutes, leaving mid-match, reconnects, tour finished/skipped, tips skipped.
     No names, account IDs, chat, purchases, locations or device identifiers.
   - ?beta=export shows the summary for the tester to copy into the feedback form. */
(()=>{'use strict';
 if(window.SkylineBetaDiary)return;
 const KEY='skylineBetaDiary',q=new URLSearchParams(location.search).get('beta');
 const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}};
 const store=d=>{try{localStorage.setItem(KEY,JSON.stringify(d))}catch{}};
 let D=load();
 const day=()=>new Date().toISOString().slice(0,10);
 const fresh=()=>({v:1,since:day(),sessions:0,days:[],started:0,completed:0,unfinished:0,minutes:[],leftMidMatch:0,reconnects:0,tour:{done:0,skip:0},tipsSkipped:0,online:{started:0,completed:0}});
 const on=()=>!!(D&&D.consent);
 const bump=f=>{if(!on())return;f(D);store(D)};
 function summary(){if(!D)return null;const m=D.minutes,avg=m.length?Math.round(m.reduce((a,b)=>a+b,0)/m.length):null;
  return{since:D.since,sessions:D.sessions,activeDays:D.days.length,returnDays:Math.max(0,D.days.length-1),started:D.started,completed:D.completed,unfinished:D.unfinished,avgMatchMinutes:avg,leftMidMatch:D.leftMidMatch,reconnects:D.reconnects,tour:D.tour,tipsSkipped:D.tipsSkipped,online:D.online}}
 async function ask(){const k=await modal({cls:'wide',html:`<div class="mh">Join the Skyline Estates beta diary?</div><div class="mtxt"><p>If you agree, this device keeps a small anonymous diary of how you play: how many sessions and matches, whether matches finish, how long they take, reconnects, and whether you finished or skipped the tutorial.</p><p><b>Nothing is sent anywhere.</b> No names, accounts, chats, purchases or locations are recorded. You choose whether to copy the summary into the feedback form, and you can stop and delete it any time by opening the game with <b>?beta=0</b>.</p></div>`,btns:[{k:'no',label:'No thanks'},{k:'yes',label:'Join the diary',primary:true}]});
  if(k==='yes'){D={...fresh(),consent:Date.now(),sessions:1,days:[day()]};store(D);toast('Beta diary on. Thank you!')}else{D=null;try{localStorage.removeItem(KEY)}catch{}}}
 async function exportView(){const s=summary();const text=s?JSON.stringify(s):'';
  await modal({cls:'wide',html:`<div class="mh">Beta diary summary</div><div class="mtxt">${s?`<p>Copy this into the feedback form. It contains only the counts listed.</p><textarea readonly rows="6" style="width:100%;font:12px monospace">${esc(text)}</textarea>`:'<p>The beta diary is off on this device.</p>'}</div>`,btns:s?[{k:'copy',label:'Copy',primary:true},{k:'close',label:'Close'}]:[{k:'close',label:'Close'}]}).then(k=>{if(k==='copy')try{navigator.clipboard.writeText(text);toast('Copied')}catch{}})}
 const boot=()=>{
  if(q==='0'){D=null;try{localStorage.removeItem(KEY)}catch{}try{toast('Beta diary off and deleted.')}catch{}}
  else if(q==='1'&&!on())setTimeout(ask,1500);
  else if(q==='export')setTimeout(exportView,1500);
  bump(d=>{d.sessions++;const t=day();if(!d.days.includes(t))d.days=[...d.days,t].slice(-60)})};
 if(document.readyState==='loading')addEventListener('DOMContentLoaded',boot,{once:true});else boot();
 // Matches (local and online). Simulations and FAST runs are never recorded.
 let match=null;
 const ng=newGame;newGame=function(){const r=ng.apply(this,arguments);if(on()&&G&&!G.sim&&!FAST){if(match&&!match.done)bump(d=>d.unfinished++);match={at:Date.now(),online:!!G.online,done:false};bump(d=>{d.started++;if(G.online)d.online.started++})}return r};
 const done=()=>{if(!match||match.done||!G||!G.over)return;match.done=true;const mins=Math.max(1,Math.round((Date.now()-match.at)/60000));bump(d=>{d.completed++;d.minutes=[...d.minutes,mins].slice(-100);if(match.online)d.online.completed++})};
 // The results screen is the reliable completion signal (some wrappers skip progressGameEnd).
 const md=modal;modal=function(o){try{if(o&&typeof o.html==='string'&&o.html.includes('class="endgrid"'))done()}catch{}return md.apply(this,arguments)};
 addEventListener('pagehide',()=>{if(match&&!match.done&&G&&!G.over&&!G.sim)bump(d=>d.leftMidMatch++)});
 addEventListener('online',()=>{if(match&&!match.done&&G&&G.online)bump(d=>d.reconnects++)});
 const tour=openTutorial;openTutorial=async function(fromWelcome){const r=await tour.apply(this,arguments);if(fromWelcome)bump(d=>{r==='skip'?d.tour.skip++:d.tour.done++});return r};
 document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('#coach .cskip'))bump(d=>d.tipsSkipped++)},true);
 window.SkylineBetaDiary=Object.freeze({summary,on});
})();
