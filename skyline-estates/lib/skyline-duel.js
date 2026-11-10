/* Skyline Duel (Stage 2 prototype, web only, behind ?duel=1): a 1-vs-1 Championship over 15 rounds.
   Each player is dealt 3 streets of balanced value, the opening player gets SC 100M (the second player already gets
   the late-start bonus), and trades are switched off. Final Bell, scoring and results come from Championship.
   Approved spec: SKYLINE-DUEL.md. Online and ranked play come in later stages. */
(function(){'use strict';
const ROUNDS=15,DEAL=3,FIRST_BONUS=100;
const on=()=>!!(window.G&&G.set&&G.set.duel===1)||(()=>{try{return !!(G&&G.set&&G.set.duel===1)}catch(e){return false}})();
// Switched on for everyone (owner, 11 Nov 2026). ?duel=0 hides the card on this device for troubleshooting.
const flag=(()=>{try{if(/[?&]duel=0\b/.test(location.search))localStorage.setItem('skylineDuelPreview','0');return localStorage.getItem('skylineDuelPreview')!=='0'}catch(e){return true}})();
const say=t=>{try{window.SkylineCoach&&SkylineCoach.say(t,1)}catch(e){}};

// Deal and cash come from the shared rules (lcDuelSetup in living-city-rules.js), so online and offline match.
{const _ng=newGame;newGame=function(cfg){const r=_ng.apply(this,arguments);try{if(cfg&&cfg.set&&cfg.set.duel===1)lcDuelSetup()}catch(e){}return r}}
// No trades in a Duel: the computer never proposes one and the trade screen explains why.
{const _ot=openTrade;openTrade=async function(){if(on()){toast('No trades in a Skyline Duel.');say('No trades in a Skyline Duel.');return}return _ot.apply(this,arguments)}}
// Coach: announce the Duel at the start and the result at the end (recorded Voice A lines).
{const _sw=startWith;startWith=function(g){const r=_sw.apply(this,arguments);try{if(on()&&G.round===1&&!G.duelSaid){G.duelSaid=1;setTimeout(()=>say('Skyline Duel! Fifteen rounds. Make every move count.'),1200)}}catch(e){}return r}}
{const _fin=finish;finish=async function(){try{if(on()&&!G.duelEnd){G.duelEnd=1;const me=G.players.find(p=>!p.ai),w=standings()[0];if(me)say(w&&w.id===me.id?'Duel won! Brilliant play.':'Duel lost. Your rival takes this one.')}}catch(e){}return _fin.apply(this,arguments)}}

// Entry: a "Skyline Duel" button beside Play, only while the preview flag is on.
function startDuel(T){const me=setup.slots[0];startFromSetup(T,setup.slots.map((s,i)=>({...s,type:i===0?'human':i===1?'ai':'off',tok:i===0?me.tok:s.tok})),{mode:'timed',rounds:ROUNDS,championship:1,duel:1})}
function addEntry(T){try{if(T.querySelector('#qDuel'))return;const box=T.querySelector('.hd-modes')||T.querySelector('.herobtns');if(!box)return;
  const b=document.createElement('button');b.id='qDuel';b.type='button';
  if(box.classList.contains('hd-modes')){b.className='hd-mode m2 duel';b.innerHTML='<span class="art" style="background-image:url(art/hd-pawns.png)"></span><b>Skyline Duel</b><small>1 vs 1 · 15 rounds</small><span class="pb"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg></span>'}else{b.className='ghostbtn';b.textContent='⚔ Skyline Duel'}
  b.onclick=()=>startDuel(T);box.append(b)}catch(e){}}
// Installed after every script has loaded, so it wraps the final home screen (home-redesign replaces paneP).
function install(){const _pp=paneP;paneP=function(T){const r=_pp.apply(this,arguments);addEntry(T);return r};try{const T=document.querySelector('#tabBody,.hd-stage')?.parentElement;if(T)addEntry(T)}catch(e){}}
if(flag){if(document.readyState==='complete')install();else addEventListener('load',install,{once:true})}
window.SkylineDuel=Object.freeze({ROUNDS,DEAL,FIRST_BONUS,active:on,preview:flag,start:startDuel});
})();
