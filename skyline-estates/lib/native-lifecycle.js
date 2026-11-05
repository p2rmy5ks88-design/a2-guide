/* Task 13: background / foreground hardening (web and native WKWebView).
   - Skyline FM: the stream <audio> elements are paused while hidden and the playing one resumes on
     return if the radio is still on (suspending the AudioContext alone left an unrouted stream
     playing and downloading in the background).
   - Web: an in-progress local match is saved when the page is hidden (Safari may discard background
     tabs). Native already saves on appStateChange; online matches are server-authoritative.
   No change to game rules, saves format or audio settings. */
(()=>{'use strict';
 if(window.SkylineLifecycle)return;
 let resumeSlot=null;
 function hide(){
  try{const playing=FMS.slots.filter(s=>s&&s.a&&!s.a.paused);resumeSlot=playing[playing.length-1]||null;playing.forEach(s=>s.a.pause())}catch{}
  try{if(G&&!G.over&&!G.sim&&!G.online&&typeof save==='function')save()}catch{}
 }
 function show(){
  const s=resumeSlot;resumeSlot=null;
  try{if(s&&AUD.radioOn&&PREF.audio?.radio!==false){const p=s.a.play();if(p&&p.catch)p.catch(()=>{})}}catch{}
 }
 document.addEventListener('visibilitychange',()=>document.hidden?hide():show());
 addEventListener('pagehide',hide);
 try{const App=window.Capacitor?.Plugins?.App;App&&App.addListener('appStateChange',s=>s.isActive?show():hide())}catch{}
 window.SkylineLifecycle=Object.freeze({hide,show});
})();
