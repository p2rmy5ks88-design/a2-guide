/* Optional web-only Market Pulse. Reuses Strategic Events' single event slot and
   shared price/rent hooks. No wallet, reward, native or online protocol changes. */
'use strict';
const MP_RULE=['Market Pulse + choices','Local games only. Replaces other city events. From round 3, a rotating district gets +10% rent, 15% cheaper building, or −10% rent for two rounds, then one neutral round. At the start of a turn, affected owners can keep their cash or pay SC 10M of match cash for an extra 10% building discount in that district until the event ends (25% maximum).'];
const MP_IDS=['pulseRise','pulseBuild','pulseSoft'];
Object.assign(EV2_DEFS,{
 pulseRise:{icon:'📈',name:'District Demand',kind:'rent',pct:10,rounds:2,why:'More visitors bring a modest, temporary rise in street rent.'},
 pulseBuild:{icon:'🏗️',name:'Permit Window',kind:'dev',pct:15,rounds:2,why:'A short permit window reduces construction costs in one district.'},
 pulseSoft:{icon:'📉',name:'Quiet Market',kind:'rent',pct:-10,rounds:2,why:'Lower demand gives visitors temporary rent relief in one district.'}
});
function mpOn(g=G){return !!(g&&g.set&&g.set.marketPulse===true&&g.mpVersion===1&&!g.online)}
function mpEvent(e=G&&G.ev2){return !!(e&&MP_IDS.includes(e.id))}
function mpEligible(pid,e=ev2Active()) {return mpOn()&&mpEvent(e)&&pid===G.turn&&!P(pid).bankrupt&&e.targets.some(i=>G.own[i].o===pid)}
function mpPermit(pid,e=ev2Active()){return mpOn()&&mpEvent(e)&&e.choices&&e.choices[pid]==='permit'}
{const previous=newGame;newGame=function(cfg){
 const on=cfg.set&&cfg.set.marketPulse===true;
 if(on)cfg={...cfg,set:{...cfg.set,events:false,events2:true}};
 previous(cfg);if(on){G.mpVersion=1;delete G.event}
}}
{const previous=ev2Active;ev2Active=function(g=G){if(g&&g.online&&g.set&&g.set.marketPulse)return null;return previous(g)}}
{const previous=ev2Start;ev2Start=function(){if(!mpOn())return previous();
 const n=G.ev2n||0,group=EV2_GROUPS[n%EV2_GROUPS.length],id=MP_IDS[n%MP_IDS.length],D=EV2_DEFS[id];
 G.ev2={v:1,id,city:G.set.city||'lagos',kind:D.kind,pct:D.pct,from:G.round,rounds:2,targets:GROUPS[group].slice(),group,name:D.name,area:GNAME[group],choices:{}};
 G.ev2n=n+1;const t=ev2Text(G.ev2);log(`${t.title}: ${t.eff}, ${t.dur}.`);if(!FAST)ev2Banner(G.ev2);
}}
{const previous=ev2Disc;ev2Disc=function(pid,i){const base=previous(pid,i),e=ev2Active();
 if(!mpPermit(pid,e)||!e.targets.includes(i)||SQ[i].t!=='prop')return base;
 return Math.round(SQ[i].h*((e.kind==='dev'?e.pct:0)+10)/100);
}}
{const previous=ev2Text;ev2Text=function(e){if(!mpEvent(e))return previous(e);const D=EV2_DEFS[e.id];
 return{title:`${D.icon} Market Pulse · ${e.name}`,eff:e.kind==='rent'?`street rent in ${e.area} ${e.pct>0?'+':''}${e.pct}%`:`building in ${e.area} costs ${e.pct}% less`,dur:`rounds ${e.from}–${e.from+1}`,why:D.why};
}}
function mpChoose(pid,choice,e=ev2Active()){
 if(!mpEligible(pid,e)||e!==ev2Active()||!['hold','permit'].includes(choice)||Object.hasOwn(e.choices,pid))return false;
 if(choice==='permit'&&P(pid).cash<10)return false;
 if(choice==='permit')P(pid).cash-=10;
 e.choices[pid]=choice;
 log(`${P(pid).name} ${choice==='permit'?`paid ${fmt(10)} of match cash for a district permit (+10% building discount in ${e.area} through round ${e.from+1})`:'kept their cash during the Market Pulse'}.`);
 save();if(!FAST){renderRoster();ev2Chip()}return true;
}
function mpAI(pid,e){
 // Pay only when presently legal construction savings exceed the fee with a
 // cash reserve. No hidden dice/landing knowledge and no free AI permits.
 const p=P(pid),saving=e.targets.filter(i=>canBuild(pid,i)).reduce((n,i)=>n+Math.round(SQ[i].h*.1),0);
 return p.cash>=210&&saving>=20?'permit':'hold';
}
/* Task 09: turn the permit choice into the player's own numbers (no price changes):
   which streets they can build on now, the extra saving per build and the break-even count. */
function mpAdvice(p,e){
 const mine=e.targets.filter(i=>G.own[i].o===p.id),now=e.targets.filter(i=>canBuild(p.id,i));
 const per=mine.length?Math.max(1,Math.round(SQ[mine[0]].h*.1)):0,need=per?Math.ceil(10/per):0,last=e.from+1;
 if(!now.length)return `<b>Suggested: keep cash.</b> You can't build in ${esc(e.area)} right now (you need every street there, unmortgaged). A permit only pays off if you complete the district and build ${need} home${need===1?'':'s'} before the end of round ${last}.`;
 return `<b>Worth it if you build ${need}+ home${need===1?'':'s'} in ${esc(e.area)} by the end of round ${last}.</b> You can build on ${now.length} street${now.length===1?'':'s'} now, and each home saves an extra <b>${fmt(per)}</b> with a permit.`;
}
async function mpOffer(p){const e=ev2Active();
 if(!mpEligible(p.id,e)||Object.hasOwn(e.choices,p.id))return;
 if(p.ai||FAST){mpChoose(p.id,mpAI(p.id,e),e);return}
 // The decision repeats the event details; retire its transient banner so it
 // cannot cover the decision on a short landscape screen.
 document.querySelectorAll('.ev2ban').forEach(b=>b.remove());
 const game=G,generation=GEN,t=ev2Text(e);save();
 const choice=await modal({cls:'wide ev2modal mpmodal',html:`<div class="mh">${esc(p.name)} · District decision</div><div class="mtxt"><p><b>${esc(t.title)}</b><br>${esc(t.eff)} · ${esc(t.dur)}</p><p>Keep your match cash, or buy a district permit for <b>${fmt(10)}</b>. It adds <b>10% off building</b> in ${esc(e.area)} until the end of round ${e.from+1}. Total discount: ${e.kind==='dev'?25:10}%. The fee is paid now; savings depend on what you build.</p><p class="mp-verdict">${mpAdvice(p,e)}</p><p class="mp-rules">Normal ownership, even-building, mortgage and bank-supply rules still apply.</p><p>Available match cash: <b>${fmt(p.cash)}</b>. Saved SC and Coins are unaffected. Every player, including AI, gets the same offer while owning a street here.</p></div>`,btns:[{k:'hold',label:'Keep cash',primary:true},{k:'permit',label:`Permit · ${fmt(10)}`,disabled:p.cash<10}]});
 if(G!==game||GEN!==generation||G.turn!==p.id||G.over)return;
 mpChoose(p.id,choice==='permit'?'permit':'hold',e);
}
{const previous=playTurn;playTurn=function(p){if(!mpOn())return previous(p);return mpOffer(p).then(()=>previous(p))}}
{const previous=ev2Chip;ev2Chip=function(){previous();if(!mpOn())return;const c=$('#ev2chip');if(!c)return;
 const e=ev2Active();if(!e){c.innerHTML=`<b>📊 Market Pulse</b><span>Neutral market · next in round ${G.ev2Next||3}</span>`;return}
 const p=P(G.turn),s=c.querySelector('span');if(s&&mpPermit(p.id,e))s.textContent+=' · your permit: extra 10% off building';
}}
{const previous=ev2Info;ev2Info=function(){if(!mpOn())return previous();const e=ev2Active(),t=e?ev2Text(e):null;
 const next=EV2_GROUPS[(G.ev2n||0)%EV2_GROUPS.length],nextD=EV2_DEFS[MP_IDS[(G.ev2n||0)%3]];
 const rows=e?e.targets.map(i=>{const o=G.own[i];return `<tr><td>${esc(SQ[i].n)}</td><td>${o.o<0?'Unowned':esc(P(o.o).name)}${o.m?' · mortgaged':''}</td><td>Rent ${fmt(rentFor(i,7))}<br>Build ${fmt(devCost(G.turn,i))}</td></tr>`}).join(''):'';
 return modal({cls:'wide ev2modal mpmodal',html:`<div class="mh">📊 Market Pulse</div><div class="mtxt">${e?`<p><b>${esc(t.title)}</b><br>${esc(t.why)}</p><p>${esc(t.eff)} · ${esc(t.dur)} (${esc(ev2Left(e))}).</p><table class="ev2t">${rows}</table><p>Building prices shown for ${esc(P(G.turn).name)}. ${mpPermit(G.turn,e)?'Your permit adds 10% off building.':'No permit discount for you.'}</p>`:'<p>Neutral market: normal rents and building costs.</p>'}<p><b>Next:</b> ${esc(nextD.name)} in ${esc(GNAME[next])}, round ${G.ev2Next||3}. Districts rotate in board order; each event lasts two rounds, then one neutral round. One event at a time.</p><p>At the start of a turn, affected owners may keep cash or pay ${fmt(10)} of match cash for an extra 10% building discount until this event ends. Each player decides once per event; AI pays the same fee. Maximum discount: 25%. Selling refunds the normal half-price; property purchase prices, mortgages, stations, utilities, cards, dice and movement are unchanged.</p><p>Local matches only. Saved SC and Coins are unaffected. Older saved matches keep their original event rules.</p></div>`,btns:[{k:'ok',label:'OK',primary:true}]});
}}
{const previous=deedHTML;deedHTML=function(i){const h=previous(i),e=ev2Active();if(!mpOn()||!mpEvent(e)||!e.targets.includes(i))return h;
 return h+`<div class="ev2deed">${esc(P(G.turn).name)}: building ${fmt(devCost(G.turn,i))}${mpPermit(G.turn,e)?' · includes district permit':''}. Purchase and resale prices unchanged.</div>`;
}}
{const previous=ev2Valid;ev2Valid=function(g){
 if(!previous(g))return false;
 if(g.set.marketPulse!=null&&typeof g.set.marketPulse!=='boolean')return false;
 if(g.mpVersion!=null&&g.mpVersion!==1)return false;
 if(g.set.marketPulse===true&&(!mpOn(g)||!g.set.events2||g.set.events))return false;
 const e=g.ev2;if(!mpEvent(e))return !mpOn(g)||e==null;
 if(!mpOn(g)||!EV2_GROUPS.includes(e.group)||e.targets.length!==GROUPS[e.group].length||!e.targets.every((v,i)=>v===GROUPS[e.group][i]))return false;
 if(!e.choices||typeof e.choices!=='object'||Array.isArray(e.choices))return false;
 return Object.entries(e.choices).every(([k,v])=>/^[0-5]$/.test(k)&&+k<g.players.length&&['hold','permit'].includes(v));
}}
