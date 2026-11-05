/* Task 11: lighter first session.
   - The welcome "Show me how to play" tour is 4 slides (goal, roll, buy, build) instead of 8; cards,
     taxes, cash trouble and currencies are taught by in-match tips when they actually happen.
   - Menu › How to play keeps all 8 slides and adds "Replay tips".
   - Coach tips gain "Skip tips", fixed wording (Portfolio, not Properties) and moment-based tips.
   Returning players are never forced through anything: tips stop after two games unless replayed. */
(()=>{'use strict';
 if(window.SkylineFirstSession)return;
 const SHORT=['goal','roll','buy','build'];let short=false;
 const steps=tutSteps;tutSteps=function(){const all=steps.apply(this,arguments);if(!short)return all;
  const s=all.filter(x=>SHORT.includes(x.k));const last=s[s.length-1];
  if(last)s[s.length-1]={...last,p:last.p+' Short tips will pop up in your first games when cards, cash or the Lockup come up.'};return s};
 const tour=openTutorial;openTutorial=async function(fromWelcome){short=!!fromWelcome;try{return await tour.apply(this,arguments)}finally{short=false}};

 // Coach tips: correct label, plus moments the 4-slide tour no longer covers.
 const build=COACH.find(c=>c.id==='build');if(build)build.t='You own a full colour set! Open <b>Portfolio</b> to build homes, and rent goes up fast.';
 const me=()=>P(G.turn),at=()=>SQ[me().pos]||{};
 COACH.push(
  {id:'sc',when:()=>G.phase==='pre'&&G.round>=2,t:'<b>SC</b> on the board is match cash for this game only. Finishing games also earns <b>saved SC</b> for Collection upgrades and <b>Coins</b> for the Shop.'},
  {id:'card',when:()=>G.phase==='post'&&['chance','esusu'].includes(at().t),t:'<b>Lucky Break</b> and <b>City Hall</b> cards can pay you, move you or charge repairs on your buildings.'},
  {id:'tax',when:()=>G.phase==='post'&&at().t==='tax',t:'Tax squares cost the amount shown. Keep a little cash in reserve for them.'},
  {id:'lockup',when:()=>me().inJail,t:'In the <b>Lockup</b>: pay bail to leave now, or try to roll doubles. You still collect rent while you wait.'},
  {id:'cash',when:()=>me().cash<80&&propsOf(me().id).length>0,t:'Short of cash? Open <b>Portfolio</b> to mortgage a street for half its price or sell buildings. You can trade too.'}
 );
 coachTip=function(){if(FAST||!G||G.online||G.over||!PREF.welcomed||PREF.coachOff)return;const p=P(G.turn);if(!isLocalHuman(p))return;
  if((PREF.stats.games||0)>1&&!PREF.coachReplay)return;PREF.coach||={};
  const c=COACH.find(x=>!PREF.coach[x.id]&&(()=>{try{return x.when()}catch(e){return false}})());if(!c||$('#coach'))return;
  if(c.id==='end'&&!PREF.coach.buy)return;
  PREF.coach[c.id]=1;if(COACH.every(x=>PREF.coach[x.id]))PREF.coachReplay=0;savePref();
  const d=document.createElement('div');d.id='coach';d.setAttribute('role','status');
  d.innerHTML=`<span class="cpav">${charSVG(myChar(),34)}</span><span class="ctx">${c.t}</span><span class="cbtns"><button class="cok">Got it</button><button class="cskip" type="button">Skip tips</button></span>`;
  $('#ui').append(d);const close=()=>{d.classList.add('out');setTimeout(()=>d.remove(),300)};
  d.querySelector('.cok').onclick=close;d.querySelector('.cskip').onclick=()=>{PREF.coachOff=1;PREF.coachReplay=0;savePref();close();try{toast('Tips off. Turn them back on in Menu › How to play.')}catch{}};
  setTimeout(close,9000)};

 // Menu › How to play: full tour plus a Replay tips control.
 const modalBefore=modal;modal=function(o){if(o&&o.cls==='tutm'&&!short&&typeof o.onMount==='function'){const mount=o.onMount;
   o={...o,onMount:(pn,mclose)=>{mount(pn,mclose);const nav=pn.querySelector('.tnav');if(nav&&!nav.querySelector('#tReplay')){const b=document.createElement('button');b.id='tReplay';b.className='tbtn ghost';b.type='button';b.textContent='Replay tips';
    b.onclick=()=>{PREF.coach={};PREF.coachOff=0;PREF.coachReplay=1;savePref();b.textContent='Tips on ✓';b.disabled=true};nav.prepend(b)}}}}
  return modalBefore.apply(this,[o])};

 const st=document.createElement('style');st.textContent='#coach .cbtns{display:flex;flex-direction:column;gap:4px;flex:none}.tnav:has(#tReplay){grid-template-columns:auto auto auto 1fr}#coach .cskip{background:none;border:0;color:inherit;opacity:.75;font:600 11.5px system-ui;text-decoration:underline;cursor:pointer;min-height:28px}';document.head.append(st);
 window.SkylineFirstSession=Object.freeze({SHORT});
})();
