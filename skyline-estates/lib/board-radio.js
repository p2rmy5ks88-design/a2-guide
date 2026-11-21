/* Skyline FM on the Career board pages (owner request 21 Nov 2026).
   The main game's radio lives in index.html; the boards that open in their own page (City Ventures, Crossroads
   Capital, Dominion, Empire) use this small player with the same station, playlist and saved on/off setting
   (skylinePrefs.audio.radio and .vol). Browsers only start audio after a tap, so a saved "on" setting starts the
   radio on the player's first touch. Usage: SkylineBoardRadio.mount(container, beforeElement). */
(function(){'use strict';
if(window.SkylineBoardRadio)return;
const LIST=[['youre-my-home','You’re My Home'],['red-room','Red Room'],['chances-trap','Chances Trap'],['grinding-all-my-life','Grinding All My Life'],
 ['mans-not-hot','Man’s Not Hot'],['area-don-lock','Area Don Lock'],['papa-devine-bella','Papa Devine Bella'],['bigstan-in-love','Bigstan in Love (Stan-tastic)'],
 ['dusty-shoes','Dusty Shoes'],['sanctuary-and-battlefield','Sanctuary and Battlefield'],['lifestyle','Lifestyle'],['comfort','Comfort'],['intro','Intro'],['bad','Bad'],
 ['priority','Priority'],['skyline-estates','Skyline Estates'],['dum-da-dum-answer-am','Dum Da Dum Answer Am']];
const STATION='SKYLINE FM 101.1',PKEY='skylinePrefs';
const native=!!((window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform())||window.SKYLINE_DESKTOP);
const bases=native?['audio/fm/','../eko-estates/audio/fm/']:['../eko-estates/audio/fm/','audio/fm/'];
function prefs(){try{return JSON.parse(localStorage.getItem(PKEY)||'{}')||{}}catch(e){return{}}}
function audioPref(){const a=prefs().audio||{};return{radio:a.radio===true,vol:typeof a.vol==='number'?Math.max(0,Math.min(1,a.vol)):.8}}
function saveRadio(on){try{const p=prefs();p.audio=Object.assign({sfx:true,amb:true,radio:false,vol:.8},p.audio||{});p.audio.radio=on;localStorage.setItem(PKEY,JSON.stringify(p))}catch(e){}}
const css=`#boardRadio{pointer-events:auto;display:flex;align-items:center;gap:7px;height:44px;padding:0 12px 0 10px;border-radius:12px;border:1.5px solid #c79a3e;background:linear-gradient(#17517f,#0b2342);color:#fff;font:800 11.5px Manrope,system-ui,sans-serif;max-width:210px;box-shadow:0 6px 16px #0007}
#boardRadio .rl{display:flex;flex-direction:column;line-height:1.15;text-align:left;min-width:0}#boardRadio .rl b{font:800 9.5px Outfit,Manrope,system-ui,sans-serif;letter-spacing:.08em;color:#ffc61a}
#boardRadio .rl span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px}
#boardRadio .eq{display:flex;gap:2px;align-items:flex-end;height:14px}#boardRadio .eq i{width:3px;height:4px;background:#ffc61a;border-radius:1px}
#boardRadio.on .eq i{animation:brEq .9s ease-in-out infinite}#boardRadio.on .eq i:nth-child(2){animation-delay:.2s}#boardRadio.on .eq i:nth-child(3){animation-delay:.45s}
@keyframes brEq{50%{height:14px}}#boardRadio.compact{width:44px;padding:0;justify-content:center;flex:none}#boardRadio.compact .rl{display:none}@media (prefers-reduced-motion:reduce){#boardRadio.on .eq i{animation:none;height:10px}}`;
let el=null,audio=null,on=false,order=[],idx=-1,track=null,bad=0,baseIdx=0,fade=null;
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function render(){if(!el)return;el.classList.toggle('on',on);const label=on?(track?track[1]+' · Kenstylez':'Tuning in…'):'Radio off';
 el.setAttribute('aria-pressed',String(on));el.setAttribute('aria-label',on?'Skyline FM is playing '+label+'. Tap to turn the radio off':'Turn Skyline FM radio on');
 el.innerHTML=`<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span><span class="rl"><b>${STATION}</b><span></span></span>`;el.querySelector('.rl span').textContent=label;fit()}
// Show the station and track only when the bar has room; otherwise a 44pt equaliser button (same tap).
function fit(){if(!el||!el.parentNode)return;el.classList.remove('compact');const p=el.parentNode,r=el.getBoundingClientRect();
 const wraps=[...p.children].some(c=>c!==el&&c.offsetParent&&Math.abs(c.getBoundingClientRect().top-r.top)>8&&c.getBoundingClientRect().height>0)||p.scrollWidth>p.clientWidth+1||r.right>innerWidth;if(wraps)el.classList.add('compact')}
function ramp(to,ms,done){clearInterval(fade);const from=audio.volume,t0=performance.now();fade=setInterval(()=>{const k=Math.min(1,(performance.now()-t0)/ms);audio.volume=from+(to-from)*k;if(k>=1){clearInterval(fade);done&&done()}},40)}
function next(){if(!order.length||idx>=order.length-1){const last=order[order.length-1];do{order=shuffle(LIST.map((_,i)=>i))}while(order.length>1&&order[0]===last);idx=-1}
 idx++;track=LIST[order[idx]];play()}
function play(){if(!audio){audio=new Audio();audio.preload='auto';audio.setAttribute('playsinline','');
  audio.addEventListener('ended',()=>{if(on)next()});
  audio.addEventListener('playing',()=>{bad=0});
  audio.addEventListener('error',()=>{if(!on)return;if(baseIdx<bases.length-1){baseIdx++;play();return}bad++;if(bad>3){stop(false);return}next()})}
 audio.src=bases[baseIdx]+track[0]+'.mp3';audio.volume=0;const p=audio.play();if(p&&p.catch)p.catch(()=>{});ramp(audioPref().vol,900);render()}
function start(){if(on)return;on=true;if(audio&&audio.src&&!audio.ended&&audio.currentTime>0){const p=audio.play();if(p&&p.catch)p.catch(()=>{});ramp(audioPref().vol,600);render()}else next()}
function stop(save=true){if(!on)return;on=false;if(audio)ramp(0,300,()=>audio.pause());if(save)saveRadio(false);render()}
function toggle(){if(on)stop();else{saveRadio(true);start()}}
function mount(parent,before){if(el||!parent)return null;const st=document.createElement('style');st.textContent=css;document.head.append(st);
 el=document.createElement('button');el.id='boardRadio';el.type='button';el.onclick=e=>{e.stopPropagation();toggle()};render();parent.insertBefore(el,before||null);fit();addEventListener('resize',fit);try{new ResizeObserver(()=>fit()).observe(parent)}catch(e){}try{new MutationObserver(()=>requestAnimationFrame(fit)).observe(parent,{childList:true,subtree:true,characterData:true})}catch(e){}
 if(audioPref().radio){const go=e=>{removeEventListener('pointerdown',go,true);removeEventListener('keydown',go,true);if(e&&el.contains(e.target))return;if(!on&&audioPref().radio)start()};addEventListener('pointerdown',go,true);addEventListener('keydown',go,true)}
 document.addEventListener('visibilitychange',()=>{if(!audio||!on)return;if(document.hidden)audio.pause();else{const p=audio.play();if(p&&p.catch)p.catch(()=>{})}});
 return el}
window.SkylineBoardRadio=Object.freeze({mount,toggle,state:()=>({on,track:track&&track[0]})});
})();
