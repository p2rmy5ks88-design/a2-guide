/* Game feel for every board (owner plan, phase 3, 24 Nov 2026): the classic game's sound effects and, on iPhone,
   light haptic taps for dice, buying, building, rent and winning.
   - Sound follows Settings → Audio → Game sounds (PREF.audio.sfx) and the volume.
   - Haptics follow Settings → Audio → Vibration (PREF.audio.haptics, on by default). iPhone app only
     (native SkylineHaptics plugin); elsewhere navigator.vibrate where the browser has it.
   SkylineFeel.play(kind)   kind: dice hop coin buy build card tap win bad
   SkylineFeel.haptic(kind) haptic only (used by the classic game, which has its own sound)
   SkylineFeel.event(e,me)  board event objects from City Ventures / Crossroads rules ({type,pid,to,...}) */
(function(){'use strict';
if(window.SkylineFeel)return;
const prefs=()=>{try{if(typeof PREF!=='undefined'&&PREF.audio)return PREF.audio}catch(e){}
 try{return (JSON.parse(localStorage.getItem('skylinePrefs')||'{}').audio)||{}}catch(e){return {}}};
const on=k=>{const a=prefs();return k==='sfx'?a.sfx!==false:a.haptics!==false};
const vol=()=>{const v=+prefs().vol;return Number.isFinite(v)?Math.max(0,Math.min(1,v)):.8};
let AC=null,bus=null;
function ctx(){if(AC)return AC;try{AC=new (window.AudioContext||window.webkitAudioContext)();bus=AC.createGain();bus.connect(AC.destination)}catch(e){AC=null}return AC}
['pointerdown','keydown'].forEach(t=>addEventListener(t,()=>{const c=ctx();if(c&&c.state==='suspended')c.resume().catch(()=>{})},{passive:true}));
function tone(f,d,type='sine',v=.08,when=0){const c=ctx();if(!c)return;const t=c.currentTime+when,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f,t);
 g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g).connect(bus);o.start(t);o.stop(t+d+.02)}
function noise(d,v=.1,when=0){const c=ctx();if(!c)return;const n=Math.floor(c.sampleRate*d),b=c.createBuffer(1,n,c.sampleRate),a=b.getChannelData(0);for(let i=0;i<n;i++)a[i]=(Math.random()*2-1)*(1-i/n);
 const s=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=1800;s.buffer=b;g.gain.value=v;s.connect(f).connect(g).connect(bus);s.start(c.currentTime+when)}
const SOUND={
 dice:()=>{for(let i=0;i<6;i++)noise(.05,.18,i*.07+Math.random()*.03)},
 hop:()=>tone(520+Math.random()*80,.07,'triangle',.05),
 coin:()=>{tone(988,.09,'square',.04);tone(1319,.18,'square',.04,.08)},
 buy:()=>[523,659,784].forEach((f,i)=>tone(f,.25,'triangle',.07,i*.07)),
 build:()=>{tone(392,.08,'square',.05);tone(587,.15,'square',.05,.07)},
 card:()=>{noise(.12,.08);tone(740,.12,'triangle',.05,.1)},
 tap:()=>tone(660,.05,'triangle',.04),
 win:()=>[523,659,784,1047,784,1047].forEach((f,i)=>tone(f,.3,'triangle',.07,i*.12)),
 bad:()=>{tone(300,.2,'square',.05);tone(220,.3,'square',.05,.15)}};
const HAPTIC={dice:'light',buy:'medium',build:'medium',win:'success',bad:'warning',jail:'warning',card:'light'};
let lastHaptic=0;
function haptic(kind){const style=HAPTIC[kind];if(!style||!on('haptics'))return;const now=Date.now();if(now-lastHaptic<120)return;lastHaptic=now;
 try{const C=window.Capacitor,P=C&&C.isNativePlatform&&C.isNativePlatform()&&C.Plugins&&C.Plugins.SkylineHaptics;
  if(P){P.impact({style}).catch(()=>{});return}
  if(navigator.vibrate)navigator.vibrate(style==='success'?[20,40,30]:style==='warning'?[30,30,30]:style==='medium'?18:10)}catch(e){}}
function play(kind){if(on('sfx')&&SOUND[kind]){try{if(bus)bus.gain.value=vol();SOUND[kind]()}catch(e){}}haptic(kind)}
const mine=(pid,me)=>pid!=null&&pid===me;
function event(e,me=0){if(!e)return;switch(e.type){
 case 'dice':return play('dice');
 case 'bought':case 'reserved':return mine(e.pid,me)?play('buy'):play('tap');
 case 'built':case 'landmark':return mine(e.pid,me)?play('build'):undefined;
 case 'rent':return mine(e.pid,me)?play('bad'):mine(e.to,me)?play('coin'):undefined;
 case 'card':case 'moment':return play('card');
 case 'stamp':case 'claim':case 'lp':case 'credit':return mine(e.pid,me)?play('coin'):undefined;
 case 'bankrupt':return mine(e.pid,me)?play('bad'):undefined;
 case 'over':return play(e.winner===me||(e.winners&&e.winners.includes&&e.winners.includes(me))?'win':'tap');
}}
window.SkylineFeel=Object.freeze({play,haptic,event});
})();
