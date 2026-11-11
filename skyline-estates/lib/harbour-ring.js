/* Skyline Duel · Harbour Ring (preview): 1 vs computer on a 24-space ring, iPhone landscape first.
   Rules live in lib/harbour-ring-rules.js. This file is the screen: a full-window overlay that never touches the
   classic match (G), saves, the economy or ranked play. It awards nothing. Entry: Game Modes → Harbour Ring. */
(function(){'use strict';
const HR=window.HarbourRingRules;if(!HR)return;
const E=s=>(typeof esc==='function'?esc(s):String(s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';'));
const tap=()=>{try{sfx('tap')}catch(e){}};
const RIVALS=['Kemi_A','Amara','Lars','Yuki','Sofia','Diego','Priya','Noah','Zara','Mateo'];
// Grid position of each space on the 9 × 5 ring (row, column), clockwise from Payday at the bottom right.
const POS=i=>i===0?[5,9]:i<=7?[5,9-i]:i===8?[5,1]:i<=11?[5-(i-8),1]:i===12?[1,1]:i<=19?[1,i-11]:i===20?[1,9]:[i-19,9];
const I=(p,w=1.8)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICON={payday:I('<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>'),
  permit:I('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 14l3 3 5-6"/>'),
  exchange:I('<path d="M7 7h11l-3-3M17 17H6l3 3"/>'),rush:I('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>'),
  event:I('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),tax:I('<path d="M12 3v14M7 8h10M5 14c0 4 3 6 7 6s7-2 7-6"/>'),
  ferry:I('<path d="M3 17c2 2 4 2 6 0s4-2 6 0 4 2 6 0M5 14l1-6h12l1 6M9 8V5h6v3"/>'),
  menu:I('<path d="M4 7h16M4 12h16M4 17h16"/>',2),feed:I('<path d="M4 6h16M4 12h10M4 18h13"/>',2),x:I('<path d="M6 6l12 12M18 6 6 18"/>',2.2),
  lock:I('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',2)};
const DIE={1:[[21,21]],2:[[11,11],[31,31]],3:[[11,11],[21,21],[31,31]],4:[[11,11],[31,11],[11,31],[31,31]],5:[[11,11],[31,11],[21,21],[11,31],[31,31]],6:[[11,10],[31,10],[11,21],[31,21],[11,32],[31,32]]};
const die=n=>`<span class="hr-die" role="img" aria-label="Die showing ${n}"><svg viewBox="0 0 42 42" aria-hidden="true">${DIE[n].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="4.5"/>`).join('')}</svg></span>`;

const css=`
#hr{position:fixed;inset:0;z-index:9000;display:grid;grid-template-rows:auto minmax(0,1fr) auto;gap:5px;box-sizing:border-box;
 padding:max(6px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(4px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));
 font-family:var(--body,'Manrope',system-ui,sans-serif);color:#fff;background:#0a1230 url(art/ring-golden.jpg) center 40%/cover;overflow:hidden;-webkit-user-select:none;user-select:none}
#hr:before{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,9,24,.45),rgba(5,9,24,.2) 40%,rgba(5,9,24,.6));pointer-events:none}
#hr>*:not(.hr-scrim):not(.hr-sheet){position:relative}
#hr button{font-family:inherit;color:inherit;cursor:pointer}
#hr button:focus-visible{outline:3px solid #fff3c4;outline-offset:2px}
.hr-top{display:flex;align-items:center;gap:8px;height:42px}
.hr-card{display:flex;align-items:center;gap:8px;height:40px;padding:0 10px 0 3px;border-radius:22px;background:rgba(8,14,34,.9);border:1.5px solid #f2c457;box-sizing:border-box;min-width:0}
.hr-card.r{flex-direction:row-reverse;padding:0 3px 0 10px;border-color:#ff5a5f}
.hr-card img{width:34px;height:34px;border-radius:50%;border:2px solid #f2c457;object-fit:cover;flex:none;background:#22325e}
.hr-card.r img{border-color:#ff5a5f}
.hr-card span{display:flex;flex-direction:column;gap:2px;min-width:0}
.hr-card.r span{align-items:flex-end}
.hr-card b{font:800 12.5px/1 var(--display,'Outfit',system-ui,sans-serif);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px}
.hr-card small{font:700 10.5px/1 var(--body,'Manrope',system-ui,sans-serif);color:#f2d58a;white-space:nowrap}
.hr-card.r small{color:#ffb3b5}
.hr-card.turn{box-shadow:0 0 0 3px rgba(242,196,87,.35)}.hr-card.r.turn{box-shadow:0 0 0 3px rgba(255,90,95,.35)}
.hr-mid{flex:1;display:flex;justify-content:center;align-items:center;gap:8px;min-width:0}
.hr-round{display:flex;flex-direction:column;align-items:center;gap:4px;padding:5px 12px;border-radius:14px;background:rgba(8,14,34,.9);border:1px solid rgba(255,255,255,.14)}
.hr-round b{font:800 12px/1 var(--display,'Outfit',system-ui,sans-serif);white-space:nowrap}
.hr-round b em{font-style:normal;color:#9aa6c2}.hr-round b i{font:700 10px var(--body,'Manrope',sans-serif);font-style:normal;color:#ff9da0;margin-left:4px}
.hr-segs{display:flex;gap:2px}.hr-segs i{width:9px;height:4px;border-radius:2px;background:rgba(255,255,255,.2)}
.hr-segs i.d{background:#f2c457}.hr-segs i.n{background:#fff}.hr-segs i.b{background:rgba(255,90,95,.6)}.hr-segs i.b.d{background:#ff5a5f}
.hr-who{padding:6px 10px;border-radius:12px;background:rgba(8,14,34,.9);font:800 11px/1 var(--display,'Outfit',sans-serif);white-space:nowrap}
.hr-board{display:grid;grid-template-columns:repeat(9,minmax(0,1fr));grid-template-rows:repeat(5,minmax(0,1fr));gap:3px;min-height:0}
.hr-t{position:relative;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;gap:1px;padding:8px 5px 3px;border-radius:7px;background:rgba(11,19,42,.93);border:1.5px solid rgba(255,255,255,.16);overflow:hidden;min-width:0;min-height:0;text-align:left}
.hr-t>i.st{position:absolute;left:0;right:0;top:0;height:6px}
.hr-t em{font:800 clamp(11px,3.4vh,14px)/1 var(--display,'Outfit',system-ui,sans-serif);font-style:normal}
.hr-t b{font:700 clamp(9px,2.6vh,10.5px)/1.1 var(--body,'Manrope',system-ui,sans-serif);color:#dfe6f4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hr-t.y{border:2px solid #f2c457;background:linear-gradient(180deg,rgba(78,60,18,.96),rgba(26,22,24,.96))}
.hr-t.r{border:2px solid #ff5a5f;background:linear-gradient(180deg,rgba(88,20,32,.96),rgba(28,12,22,.96))}
.hr-t .own{position:absolute;left:4px;bottom:3px;width:9px;height:9px}
.hr-t.y .own{background:#f2c457;clip-path:polygon(0 100%,0 30%,25% 60%,50% 0,75% 60%,100% 30%,100% 100%)}
.hr-t.r .own{background:#ff5a5f;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%)}
.hr-t .pp{position:absolute;right:4px;bottom:4px;display:flex;gap:2px;align-items:flex-end}
.hr-t .pp span{width:5px;height:8px;border-radius:1px 1px 0 0}.hr-t .pp span.tw{width:7px;height:13px}
.hr-t.y .pp span{background:#ffe39b}.hr-t.r .pp span{background:#ffb3b5}
.hr-t .lk{position:absolute;right:3px;top:8px;width:12px;height:12px;color:#9fd3ff}
.hr-t.s,.hr-t.c{align-items:center;text-align:center;padding:4px}
.hr-t.s{border-style:dashed}.hr-t.s svg{width:17px;height:17px;color:#9fd3ff}
.hr-t.c{border:1.5px solid rgba(242,196,87,.7);background:linear-gradient(180deg,#1f3163,#0b1430)}
.hr-t.c svg{width:18px;height:18px;color:#f2c457}.hr-t.c b{font-family:var(--display,'Outfit',sans-serif);font-weight:800;color:#fff;white-space:normal}
.hr-t.c em,.hr-t.s em{position:absolute;left:5px;top:4px;font-size:10px;opacity:.85}
.hr-t.tg{box-shadow:0 0 0 2px #fff,0 0 14px rgba(255,255,255,.55);z-index:1}
.hr-t .n{position:absolute;right:3px;top:9px;min-width:16px;height:16px;padding:0 3px;border-radius:8px;background:#fff;color:#0b1633;font:800 11px/16px var(--display,'Outfit',sans-serif);text-align:center;box-sizing:border-box}
.hr-tok{position:absolute;width:20px;height:20px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.6);object-fit:cover;z-index:2;background:#22325e;transition:transform .12s}
.hr-tok.a{right:3px;bottom:3px;border-color:#f2c457}
.hr-t.c .hr-tok.a{bottom:auto;top:3px}.hr-tok.b{right:4px;top:9px;border-color:#ff5a5f}
.hr-tok.hop{transform:translateY(-4px) scale(1.08)}
.hr-centre{grid-row:2/5;grid-column:2/9;position:relative;border-radius:12px;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;padding:8px 10px;min-height:0}
.hr-centre:before{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,9,24,0),rgba(5,9,24,.15) 45%,rgba(5,9,24,.78));pointer-events:none}
.hr-centre>*{position:relative}
.hr-title{align-self:center;display:flex;flex-direction:column;align-items:center;gap:2px;padding:5px 14px 6px;border-radius:12px;background:rgba(5,9,24,.55);color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.8)}
.hr-title b{font:700 18px/1 'Cinzel',Georgia,serif;letter-spacing:.06em}.hr-title small{font:700 8.5px/1 var(--body,'Manrope',sans-serif);letter-spacing:.3em;color:#f6e2a8}
.hr-sky{position:absolute;left:0;right:0;bottom:52px;height:78px;pointer-events:none}
.hr-sky svg{position:absolute;left:0;bottom:0;width:100%;height:100%;overflow:visible}
.hr-bld{transform-box:fill-box;transform-origin:50% 100%}
.hr-bld.rise{animation:hrRise .7s cubic-bezier(.2,.9,.3,1.2)}
@keyframes hrRise{from{transform:scaleY(.05);opacity:.4}to{transform:scaleY(1);opacity:1}}
.hr-timer{width:40px;height:40px;flex:none;border-radius:50%;display:grid;place-items:center;font:800 13px var(--display,'Outfit',sans-serif);color:#fff;
 background:radial-gradient(circle,#0b1633 0 15px,transparent 16px),conic-gradient(#f2c457 var(--p),rgba(255,255,255,.18) 0)}
.hr-timer.low{background:radial-gradient(circle,#0b1633 0 15px,transparent 16px),conic-gradient(#ff5a5f var(--p),rgba(255,255,255,.18) 0)}
html.light .hr-timer{color:#13284a;background:radial-gradient(circle,#fff 0 15px,transparent 16px),conic-gradient(#d9a23a var(--p),rgba(19,40,74,.15) 0)}
html.light .hr-timer.low{background:radial-gradient(circle,#fff 0 15px,transparent 16px),conic-gradient(#d63b4a var(--p),rgba(19,40,74,.15) 0)}
.hr-act{display:flex;align-items:center;gap:8px;min-height:44px}
.hr-act p{flex:1;margin:0;font:600 11.5px/1.3 var(--body,'Manrope',sans-serif);color:#eef2fb;text-shadow:0 1px 4px rgba(0,0,0,.8)}
.hr-act p b{color:#fff}
.hr-die{width:30px;height:30px;flex:none;border-radius:7px;background:#fdf6e3;box-shadow:0 3px 8px rgba(0,0,0,.5);display:grid;place-items:center}
.hr-die svg{width:24px;height:24px;fill:#1b2340}
.hr-b{flex:1 1 0;min-width:0;min-height:44px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:4px 6px;border-radius:12px;border:1.5px solid rgba(255,255,255,.28);background:rgba(8,14,34,.92)}
.hr-b b{font:800 13px/1 var(--display,'Outfit',sans-serif)}
.hr-b small{font:600 10px/1.15 var(--body,'Manrope',sans-serif);color:#cfd7e8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.hr-b.g{border-color:#fff1b8;background:linear-gradient(180deg,#ffe7a3,#d9a23a);color:#241703}.hr-b.g small{color:#4a3208}
.hr-b.bad{border-color:#ff5a5f}.hr-b.bad b{color:#ffc2c4}
.hr-b[disabled]{opacity:.45;cursor:default}
.hr-bid{display:flex;align-items:center;gap:6px}
.hr-bid output{min-width:86px;text-align:center;font:800 15px var(--display,'Outfit',sans-serif)}
.hr-bid .hr-b{flex:none;width:44px}
.hr-bot{display:flex;align-items:center;gap:12px;height:44px}
.hr-ib{position:relative;width:44px;height:44px;flex:none;border-radius:50%;border:1.5px solid rgba(255,255,255,.25);background:rgba(8,14,34,.9);display:grid;place-items:center;padding:0}
.hr-ib svg{width:18px;height:18px}
.hr-ib em{position:absolute;top:3px;right:3px;min-width:14px;height:14px;border-radius:7px;background:#ff5a5f;font:800 9px/14px var(--display,'Outfit',sans-serif);font-style:normal;color:#fff}
.hr-score{flex:1;display:flex;align-items:center;gap:8px;height:26px;padding:0 10px;border-radius:13px;background:rgba(8,14,34,.88)}
.hr-score b{font:800 11px var(--display,'Outfit',sans-serif)}.hr-score b.a{color:#f2c457}.hr-score b.b{color:#ff9da0}
.hr-score span{flex:1;display:flex;height:8px;border-radius:4px;overflow:hidden}
.hr-score span i{display:block;height:100%;transition:width .4s}.hr-score span i.a{background:linear-gradient(90deg,#b9832b,#f2c457)}.hr-score span i.b{background:linear-gradient(90deg,#ff5a5f,#a8243a)}
.hr-scrim{position:absolute;inset:0;z-index:5;background:rgba(3,6,18,.5)}
.hr-sheet{position:absolute;z-index:6;box-sizing:border-box;display:flex;flex-direction:column;background:linear-gradient(180deg,#121d40,#080e24);border:1.5px solid rgba(242,196,87,.45);box-shadow:0 18px 40px rgba(0,0,0,.6);color:#fff;overflow:auto}
.hr-sheet.side{right:max(16px,env(safe-area-inset-right));top:8px;bottom:8px;width:min(300px,46vw);border-radius:18px}
.hr-sheet.up{left:max(16px,env(safe-area-inset-left));right:max(16px,env(safe-area-inset-right));bottom:0;height:min(240px,64vh);border-radius:18px 18px 0 0;border-bottom:0;padding:6px 16px 12px}
.hr-sheet.mid{left:50%;top:50%;transform:translate(-50%,-50%);width:min(440px,80vw);max-height:90vh;border-radius:18px;padding:14px 16px}
.hr-sh{display:flex;align-items:flex-start;gap:10px;padding:10px 8px 6px 14px}
.hr-sh div{flex:1;display:flex;flex-direction:column;gap:3px;min-width:0}
.hr-sh small{font:800 10px/1 var(--body,'Manrope',sans-serif);letter-spacing:.16em}
.hr-sh b{font:800 18px/1.1 var(--display,'Outfit',sans-serif)}
.hr-sh span{font:600 11px/1.2 var(--body,'Manrope',sans-serif);color:#c9d3e6}
.hr-x{width:44px;height:44px;flex:none;border:0;border-radius:50%;background:rgba(255,255,255,.06);display:grid;place-items:center;padding:0}.hr-x svg{width:18px;height:18px}
.hr-rows{margin:6px 14px 10px;display:flex;flex-direction:column;gap:2px;font:600 11.5px/1.2 var(--body,'Manrope',sans-serif);color:#dfe6f4}
.hr-rows div{display:flex;justify-content:space-between;gap:10px;padding:4px 6px;border-radius:6px}
.hr-rows div.now{background:rgba(242,196,87,.16);color:#fff;font-weight:800}
.hr-note{margin:auto 14px 12px;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);display:flex;gap:8px;align-items:center;font:600 11px/1.3 var(--body,'Manrope',sans-serif)}
.hr-note svg{width:18px;height:18px;flex:none;color:#9fd3ff}
.hr-tabs{display:flex;gap:4px;padding:3px;border-radius:12px;background:rgba(255,255,255,.06);align-self:flex-start;margin-top:8px}
.hr-tabs button{height:36px;padding:0 14px;border-radius:9px;border:0;background:none;font:700 12px var(--display,'Outfit',sans-serif)}
.hr-tabs button[aria-selected="true"]{background:#f2c457;color:#241703}
.hr-feed{margin:8px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:7px;font:600 12px/1.3 var(--body,'Manrope',sans-serif);color:#dfe6f4;overflow:auto}
.hr-feed li{display:flex;gap:9px}.hr-feed li i{flex:none;margin-top:4px;width:8px;height:8px;border-radius:50%;background:#9aa6c2}
.hr-feed li i.a{background:#f2c457}.hr-feed li i.b{background:#ff5a5f}
.hr-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:10px;font:600 12px/1.3 var(--body,'Manrope',sans-serif)}
.hr-stats div{display:flex;flex-direction:column;gap:4px}
.hr-res{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center}
.hr-res h2{margin:0;font:800 26px/1 var(--display,'Outfit',sans-serif)}
.hr-res .row{display:flex;gap:10px;width:100%}
.hr-list{display:flex;flex-direction:column;gap:6px;margin-top:8px}
.hr-list .hr-b{flex:none;flex-direction:row;justify-content:space-between;padding:0 12px}
html.light #hr{color:#13284a;background-color:#bfdcf2;background-image:url(art/ring-day.jpg)}
html.light #hr:before{background:linear-gradient(180deg,rgba(235,244,252,.35),rgba(235,244,252,0) 40%,rgba(235,244,252,.45))}
html.light .hr-card,html.light .hr-round,html.light .hr-who,html.light .hr-score,html.light .hr-ib,html.light .hr-b{background:rgba(255,255,255,.95);color:#13284a;border-color:rgba(19,40,74,.2)}
html.light .hr-card{border-color:#d9a23a}html.light .hr-card.r{border-color:#d63b4a}
html.light .hr-card small{color:#8a5a10}html.light .hr-card.r small{color:#a8243a}
html.light .hr-round b em{color:#5b6a88}html.light .hr-round b i{color:#b3263a}
html.light .hr-segs i{background:rgba(19,40,74,.15)}html.light .hr-segs i.d{background:#d9a23a}html.light .hr-segs i.b{background:rgba(214,59,74,.35)}html.light .hr-segs i.b.d{background:#d63b4a}html.light .hr-segs i.n{background:#13284a}
html.light .hr-centre:before{background:linear-gradient(180deg,rgba(255,255,255,0),rgba(255,255,255,0) 45%,rgba(235,244,252,.55))}
html.light .hr-b.g{background:linear-gradient(180deg,#ffe7a3,#d9a23a);border-color:#b9832b;color:#241703}html.light .hr-b.g small{color:#4a3208}
html.light .hr-t{background:rgba(255,255,255,.95);border-color:rgba(19,40,74,.18);color:#13284a}
html.light .hr-t b{color:#3d4d6b}
html.light .hr-t.y{border:2.5px solid #d9a23a;background:linear-gradient(180deg,#fff6dc,#fff)}
html.light .hr-t.r{border:2.5px solid #d63b4a;background:linear-gradient(180deg,#ffe5e7,#fff)}
html.light .hr-t.y .pp span{background:#b9832b}html.light .hr-t.r .pp span{background:#c22d3d}
html.light .hr-t.y .own{background:#b9832b}html.light .hr-t.r .own{background:#c22d3d}
html.light .hr-t.s{background:rgba(240,246,255,.95)}html.light .hr-t.s svg{color:#2f6fd0}
html.light .hr-t.c{border-color:#d9a23a;background:linear-gradient(180deg,#fff3cf,#f6dc93)}html.light .hr-t.c svg{color:#7a4f0a}html.light .hr-t.c b{color:#3a2504}
html.light .hr-t.tg{box-shadow:0 0 0 2.5px #13284a,0 0 14px rgba(19,40,74,.45)}html.light .hr-t .n{background:#13284a;color:#fff}
html.light .hr-b small{color:#3d4d6b}html.light .hr-b.g{color:#241703}html.light .hr-b.bad b{color:#b3263a}
html.light .hr-score b.a{color:#8a5a10}html.light .hr-score b.b{color:#b3263a}
@media (max-height:360px){.hr-t em{font-size:11px}.hr-title{display:none}}
@media (prefers-reduced-motion:reduce){.hr-score span i,.hr-tok{transition:none}.hr-bld.rise{animation:none}}
`;

let s=null,root=null,me=0,ai=1,view={tok:null,sheet:null,tab:'feed',seen:0,auto:false,speed:1},timer=null,tick=null,built=new Set();
const SAVE_KEY='skylineRingSave',TIMER_KEY='skylineRingTimer';let TURN_MS=25000;
const timerOn=()=>{try{return localStorage.getItem(TIMER_KEY)!=='off'}catch(e){return true}};
// The match is saved after every step (its own key; the classic save is never touched) and resumes from Game Modes.
function persist(){try{if(s&&!s.over)localStorage.setItem(SAVE_KEY,JSON.stringify({v:1,at:Date.now(),s}));else localStorage.removeItem(SAVE_KEY)}catch(e){}}
function loadRing(){try{const o=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(o&&o.v===1&&o.s&&o.s.v===1&&Array.isArray(o.s.tiles)&&o.s.tiles.length===24&&!o.s.over&&o.s.decision)return o.s}catch(e){}return null}
function dropSave(){try{localStorage.removeItem(SAVE_KEY)}catch(e){}}
const D=()=>s&&HR.pending(s);
const name=p=>s.players[p].name;
const fmt=HR.fmt;

function districtOf(t){return s.districts[t.d]}
function tileHTML(t){const [r,c]=POS(t.i),tg=view.targets&&view.targets[t.i];let cls='hr-t',inner='';
  if(t.k==='prop'){cls+=t.o===me?' y':t.o===ai?' r':'';const Dd=districtOf(t);
    inner=`<i class="st" style="background:${Dd.color}"></i><em>${t.i}</em><b>${E(Dd.name)}</b>`;
    if(t.o>=0)inner+=`<i class="own" aria-hidden="true"></i>`;
    if(t.lv)inner+=`<span class="pp" aria-hidden="true">${t.lv===4?'<span class="tw"></span>':'<span></span>'.repeat(t.lv)}</span>`;
    if(t.lock>s.round)inner+=`<span class="lk">${ICON.lock}</span>`}
  else{cls+=t.k==='corner'?' c':' s';inner=`<em>${t.i}</em>${ICON[t.id]||''}<b>${E(t.n)}</b>`}
  if(tg){cls+=' tg';inner+=`<span class="n">${tg}</span>`}
  const pos=view.tok||s.players.map(p=>p.pos);
  pos.forEach((q,p)=>{if(q===t.i)inner+=`<img class="hr-tok ${p===me?'a':'b'}${view.hop===p?' hop':''}" src="${E(s.players[p].avatar)}" alt="">`});
  const label=t.k==='prop'?`${t.i}, ${t.n}, ${districtOf(t).name}, ${t.o===me?'yours':t.o===ai?name(ai)+"'s":'for sale '+fmt(t.p)}`:`${t.i}, ${t.n}`;
  return `<button class="${cls}" data-i="${t.i}" style="grid-row:${r};grid-column:${c}" aria-label="${E(label)}">${inner}</button>`}

function outcome(p,target,passes){const t=s.tiles[target],P=s.players[p];let txt='';
  if(t.k==='prop'){if(t.o<0)txt=P.cash>=t.p?`Buy ${fmt(t.p)}`:'Sealed bid';else if(t.o===p)txt=HR.canBuild(s,t,p)?`Build ${fmt(HR.buildCost(t))}`:'Your street';else txt=`Rent ${fmt(HR.rent(s,t))}`}
  else txt={payday:'Payday +'+fmt(HR.CFG.paydayLand),permit:'Free build',exchange:'Swap streets',rush:'Rents +50%',event:'City Event',tax:'Port Tax',ferry:'Sail to a corner'}[t.id]||t.n;
  return (passes?'Salary · ':'')+txt}
function moveKind(p,target){const t=s.tiles[target];if(t.k==='prop'&&t.o>=0&&t.o!==p)return 'bad';if(t.k==='prop'&&t.o===p&&HR.canBuild(s,t,p))return 'g';return ''}

function actHTML(){const d=D();if(!d)return '';
  if(s.over)return `<p>Match over</p>`;
  const mine=d.type==='bid'?s.bids&&s.bids[me]==null:d.p===me;
  if(!mine){const who=d.type==='bid'?name(ai):name(d.p);return `${s.dice?die(s.dice[0])+die(s.dice[1]):''}<p><b>${E(who)}</b> ${d.type==='bid'?'is placing a secret bid…':'is thinking…'}</p>`}
  if(view.auto)return `<p>Playing…</p>`;
  const P=s.players[me];
  switch(d.type){
    case 'move':return die(s.dice[0])+die(s.dice[1])+s.options.map(o=>{const passes=(P.pos-P.home+24)%24+o.steps>=24;return `<button class="hr-b ${moveKind(me,o.target)}" data-move="${o.steps}"><b>Move ${o.steps}</b><small>${E(outcome(me,o.target,passes))}</small></button>`}).join('');
    case 'buy':{const t=s.tiles[d.tile];return `<p>Buy <b>${E(t.n)}</b> (${E(districtOf(t).name)}) for <b>${fmt(t.p)}</b>?</p><button class="hr-b g" data-a="buy"><b>Buy</b><small>${fmt(t.p)}</small></button><button class="hr-b" data-a="pass"><b>Pass</b><small>Sealed bid</small></button>`}
    case 'bid':{const t=s.tiles[d.tile];view.bid=view.bid==null?Math.min(P.cash,t.p):Math.min(view.bid,P.cash);
      return `<p>Secret bid for <b>${E(t.n)}</b> · list ${fmt(t.p)}</p><span class="hr-bid"><button class="hr-b" data-bid="-10" aria-label="Lower bid"><b>−</b></button><output aria-live="polite">${fmt(view.bid)}</output><button class="hr-b" data-bid="10" aria-label="Raise bid"><b>+</b></button></span><button class="hr-b g" data-a="bid" style="flex:none;width:96px"><b>Bid</b></button><button class="hr-b" data-a="nobid" style="flex:none;width:72px"><b>Skip</b></button>`}
    case 'build':{const t=s.tiles[d.tile];return `<p>Build ${t.lv===3?'a <b>tower</b>':'a <b>house</b>'} on <b>${E(t.n)}</b>?</p><button class="hr-b g" data-a="build"><b>Build</b><small>${fmt(d.cost)}</small></button><button class="hr-b" data-a="skip"><b>Not now</b></button>`}
    case 'takeover':{const t=s.tiles[d.tile];return `<p>Offer <b>${fmt(d.price)}</b> to take over <b>${E(t.n)}</b>? ${E(name(ai))} can block it for ${fmt(Math.round(t.p*HR.CFG.block))}.</p><button class="hr-b g" data-a="offer"><b>Make offer</b><small>${fmt(d.price)}</small></button><button class="hr-b" data-a="skip"><b>No</b></button>`}
    case 'defend':{const t=s.tiles[d.tile];return `<p><b>${E(name(ai))}</b> offers <b>${fmt(d.price)}</b> for your <b>${E(t.n)}</b>.</p><button class="hr-b g" data-a="accept"><b>Take ${fmt(d.price)}</b></button><button class="hr-b bad" data-a="block" ${P.cash<d.block?'disabled':''}><b>Block</b><small>Pay ${fmt(d.block)} · lock ${HR.CFG.lockRounds} rounds</small></button>`}
    case 'permit':return `<p><b>Permit Office:</b> one free build.</p>`+d.choices.slice(0,3).map(i=>`<button class="hr-b g" data-permit="${i}"><b>${E(s.tiles[i].n)}</b><small>${s.tiles[i].lv===3?'Tower':'House '+(s.tiles[i].lv+1)}</small></button>`).join('')+`<button class="hr-b" data-a="skip" style="flex:none;width:64px"><b>Skip</b></button>`;
    case 'exchange':return `<p><b>Exchange:</b> swap one of your streets.</p><button class="hr-b g" data-a="exlist"><b>Choose swap</b><small>${d.choices.length} option${d.choices.length>1?'s':''}</small></button><button class="hr-b" data-a="skip"><b>Skip</b></button>`;
    case 'ferry':return `<p><b>Ferry:</b> sail to a corner.</p>`+HR.CORNERS.filter(c=>c!==P.pos).map(c=>`<button class="hr-b" data-ferry="${c}"><b>${E(s.tiles[c].n)}</b></button>`).join('')+`<button class="hr-b" data-a="skip" style="flex:none;width:64px"><b>Stay</b></button>`;
  }return ''}

// The skyline in the centre: one building per built street, gold for you on the left, red for the rival on the right.
// House 1 is a low-rise, 2 a mid-rise, 3 a high-rise, a tower gets a crown and a spire. New buildings rise into place.
const SHAPE=[null,[18,20],[18,34],[22,48],[24,62]];
function building(x,lv,c,cls){const [w,h]=SHAPE[lv],y=78-h,win=[];
  for(let r=y+6;r<74;r+=7)for(let q=x+4;q<x+w-4;q+=5)win.push(`<rect x="${q}" y="${r}" width="2.4" height="3" rx=".5"/>`);
  let top='';if(lv===3)top=`<rect x="${x+4}" y="${y-6}" width="${w-8}" height="7" rx="1" fill="url(#hr-${c})"/>`;
  if(lv===4)top=`<rect x="${x+5}" y="${y-8}" width="${w-10}" height="9" rx="1" fill="url(#hr-${c})"/><rect x="${x+w/2-1}" y="${y-20}" width="2" height="13" fill="url(#hr-${c})"/><circle cx="${x+w/2}" cy="${y-21}" r="2" fill="${c==='a'?'#fff4c8':'#ffd6d8'}"/>`;
  return `<g class="hr-bld${cls}" filter="url(#hr-glow-${c})">${top}<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="url(#hr-${c})"/><g fill="${c==='a'?'#fff7d6':'#ffe2e3'}" opacity=".85">${win.join('')}</g></g>`}
function towersHTML(){const now=new Set(),out=[];
  [me,ai].forEach(p=>{const ts=HR.tilesOf(s,p).filter(t=>t.lv>0).sort((a,b)=>b.lv-a.lv||b.p-a.p).slice(0,8);let x=p===me?24:536;
    ts.forEach(t=>{const w=SHAPE[t.lv][0],key=t.i+':'+t.lv;now.add(key);if(p!==me)x-=w;out.push(building(x,t.lv,p===me?'a':'b',built.size&&!built.has(key)?' rise':''));if(p===me)x+=w+6;else x-=6})});
  built=now;
  return `<svg viewBox="0 0 560 78" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><defs>
    <linearGradient id="hr-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7a3"/><stop offset="1" stop-color="#a8721f"/></linearGradient>
    <linearGradient id="hr-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb3b5"/><stop offset="1" stop-color="#8f1d2f"/></linearGradient>
    <filter id="hr-glow-a" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#f2c457" flood-opacity=".7"/></filter>
    <filter id="hr-glow-b" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#ff5a5f" flood-opacity=".7"/></filter></defs>${out.join('')}</svg>`}

function timerHTML(turnP){const left=view.deadline?Math.max(0,Math.ceil((view.deadline-Date.now())/1000)):0;
  if(!s.over&&turnP===me&&view.deadline&&!view.auto){const pct=Math.round(100*Math.min(1,(view.deadline-Date.now())/TURN_MS));return `<span class="hr-timer${left<=5?' low':''}" role="timer" aria-label="Your turn, ${left} seconds left" style="--p:${pct}%">${left}</span>`}
  return `<span class="hr-who">${s.over?'Final':turnP===me?'Your turn':E(name(ai))+"'s turn"}</span>`}
function render(){if(!root||!s)return;const d=D(),P=s.players;
  view.targets=null;if(d&&d.type==='move'&&d.p===me&&!view.auto&&!view.tok){view.targets={};s.options.forEach(o=>{view.targets[o.target]=o.steps})}
  const segs=Array.from({length:HR.CFG.rounds},(_,k)=>{const r=k+1;return `<i class="${r<s.round?'d':r===s.round?'n':''}${r>=HR.CFG.bell?' b':''}"></i>`}).join('');
  const bell=s.round>=HR.CFG.bell?'Final Bell':`Final Bell in ${HR.CFG.bell-s.round}`;
  const a=Math.max(1,HR.score(s,me)),b=Math.max(1,HR.score(s,ai)),pa=Math.round(100*a/(a+b));
  const turnP=d&&d.p>=0?d.p:s.turn,newLog=s.log.length-view.seen;
  root.innerHTML=`
  <header class="hr-top">
    <button class="hr-card${turnP===me?' turn':''}" data-a="stats" aria-label="Your stats"><img src="${E(P[me].avatar)}" alt=""><span><b>${E(P[me].name)}</b><small>${fmt(P[me].cash)} cash</small></span></button>
    <div class="hr-mid"><div class="hr-round"><b>Round ${Math.min(s.round,HR.CFG.rounds)} <em>of ${HR.CFG.rounds}</em><i>${bell}</i></b><span class="hr-segs" aria-hidden="true">${segs}</span></div>
      ${timerHTML(turnP)}</div>
    <button class="hr-card r${turnP===ai?' turn':''}" data-a="stats" aria-label="${E(name(ai))} stats"><img src="${E(P[ai].avatar)}" alt=""><span><b>${E(P[ai].name)}</b><small>${fmt(P[ai].cash)} cash</small></span></button>
  </header>
  <div class="hr-board">${s.tiles.map(tileHTML).join('')}
    <div class="hr-centre"><div class="hr-title"><b>HARBOUR RING</b><small>${s.districts.length} CITIES THIS MATCH</small></div><div class="hr-sky" aria-hidden="true">${towersHTML()}</div><div class="hr-act" aria-live="polite">${actHTML()}</div></div>
  </div>
  <footer class="hr-bot">
    <button class="hr-ib" data-a="menu" aria-label="Match menu">${ICON.menu}</button>
    <div class="hr-score" role="img" aria-label="Score ${pa}% to ${100-pa}%"><b class="a">${pa}%</b><span><i class="a" style="width:${pa}%"></i><i class="b" style="width:${100-pa}%"></i></span><b class="b">${100-pa}%</b></div>
    <button class="hr-ib" data-a="feed" aria-label="Match feed${newLog>0?', '+newLog+' new':''}">${ICON.feed}${newLog>0?`<em>${Math.min(9,newLog)}</em>`:''}</button>
  </footer>${sheetHTML()}`}

function propRows(t){const rows=[];const m=HR.CFG.rentMult,mult=(s.rush[t.o]?HR.CFG.rushMult:1)*(s.round>=HR.CFG.bell?HR.CFG.bellMult:1);
  const r=x=>fmt(Math.round(t.p*x*mult));const comp=HR.complete(s,t);
  rows.push([`Street only`,r(m[0]),t.lv===0&&!comp]);rows.push([`With the district`,r(m[0]*2),t.lv===0&&comp]);
  [1,2,3].forEach(k=>rows.push([`${k} house${k>1?'s':''}`,r(m[k]),t.lv===k]));rows.push(['Tower',r(m[4]),t.lv===4]);return rows}
function sheetHTML(){const v=view.sheet;if(!v)return '';
  if(v.k==='tile'){const t=s.tiles[v.i];if(t.k!=='prop'){const info={payday:`Land here for +${fmt(HR.CFG.paydayLand)}. Salary of ${fmt(HR.CFG.payday)} is paid for every full lap from your own start.`,permit:'One free house or tower on a district you own.',exchange:`Swap one of your streets for one of your rival's, paying the price gap plus ${fmt(HR.CFG.exchangeFee)}. Complete districts are protected.`,rush:'Your rents are +50% until your next turn.',event:'A random city event: money in or out.',tax:`Pay ${HR.CFG.portTax*100}% of your cash.`,ferry:'Sail to any corner and use it.'}[t.id];
      return `<div class="hr-scrim" data-a="close"></div><aside class="hr-sheet side" role="dialog" aria-label="${E(t.n)}"><div class="hr-sh"><div><small style="color:#f6e2a8">${t.i} · ${t.k==='corner'?'CORNER':'SPECIAL'}</small><b>${E(t.n)}</b></div><button class="hr-x" data-a="close" aria-label="Close">${ICON.x}</button></div><p class="hr-rows" style="font-weight:600">${E(info||'')}</p></aside>`}
    const Dd=districtOf(t),own=t.o<0?'For sale':t.o===me?'Yours':'Owned by '+name(ai),comp=HR.complete(s,t);
    return `<div class="hr-scrim" data-a="close"></div><aside class="hr-sheet side" role="dialog" aria-label="${E(t.n)}, ${E(Dd.name)}" style="border-color:${t.o===ai?'rgba(255,90,95,.6)':'rgba(242,196,87,.5)'}">
      <div style="height:8px;flex:none;background:${Dd.color}"></div>
      <div class="hr-sh"><div><small style="color:${Dd.color}">${t.i} · ${E(Dd.name.toUpperCase())}</small><b>${E(t.n)}</b><span>${E(t.area||'')}${t.area?' · ':''}Price ${fmt(t.p)}${comp?' · district complete':''}</span></div><button class="hr-x" data-a="close" aria-label="Close property details">${ICON.x}</button></div>
      <div class="hr-rows"><div style="padding-top:0"><span>${E(own)}</span><span>${t.lv===4?'Tower':t.lv?t.lv+' house'+(t.lv>1?'s':''):''}</span></div>${propRows(t).map(([a,b,now])=>`<div class="${now&&t.o>=0?'now':''}"><span>${a}${now&&t.o>=0?' (now)':''}</span><span>${b}</span></div>`).join('')}</div>
      ${comp?`<div class="hr-note">${ICON.lock}<span>Protected: no takeover or Exchange while ${E(Dd.name)} is a complete district.</span></div>`:t.lock>s.round?`<div class="hr-note">${ICON.lock}<span>Locked against takeovers until round ${t.lock}.</span></div>`:''}
    </aside>`}
  if(v.k==='feed'){const L=s.log.slice().reverse().slice(0,30);
    const body=view.tab==='feed'?`<ul class="hr-feed">${L.map(l=>`<li><i class="${l.p===me?'a':l.p===ai?'b':''}"></i><span><b>R${l.round}</b> ${E(l.txt)}</span></li>`).join('')||'<li>No moves yet.</li>'}</ul>`
      :`<div class="hr-stats">${[me,ai].map(p=>{const ds=s.districts.filter(dd=>s.tiles.some(t=>t.k==='prop'&&t.d===dd.d&&t.o===p&&HR.complete(s,t)));
        return `<div><b style="color:${p===me?'#f2c457':'#ff9da0'}">${E(name(p))}</b><span>Net worth ${fmt(HR.netWorth(s,p))}</span><span>Cash ${fmt(s.players[p].cash)}</span><span>Streets ${HR.tilesOf(s,p).length} · towers ${HR.towers(s,p)}</span><span>Complete: ${ds.map(x=>E(x.name)).join(', ')||'none'}</span><span>Laps ${s.players[p].laps}</span></div>`}).join('')}</div>`;
    return `<div class="hr-scrim" data-a="close"></div><section class="hr-sheet up" role="dialog" aria-label="Match feed and stats"><div style="display:flex;align-items:center;gap:8px"><div class="hr-tabs" role="tablist"><button role="tab" data-tab="feed" aria-selected="${view.tab==='feed'}">Match feed</button><button role="tab" data-tab="stats" aria-selected="${view.tab==='stats'}">Stats</button></div><div style="flex:1"></div><button class="hr-x" data-a="close" aria-label="Close panel" style="margin-top:8px">${ICON.x}</button></div>${body}</section>`}
  if(v.k==='menu')return `<div class="hr-scrim" data-a="close"></div><section class="hr-sheet mid" role="dialog" aria-label="Match menu"><div class="hr-sh" style="padding:0 0 8px"><div><small style="color:#f6e2a8">PREVIEW</small><b>Harbour Ring</b><span>1 vs computer · 15 rounds · saved as you play · no rewards yet</span></div><button class="hr-x" data-a="close" aria-label="Close">${ICON.x}</button></div>
      <p class="hr-rows" style="margin:4px 0 10px;line-height:1.45">Roll two dice, then move by either die or the total. Buy streets or let them go to a sealed bid. Own both streets of a city to build. Land on a lone rival street to offer a takeover; the owner can take the money or block it. Most net worth after round 15 wins; each tower adds ${fmt(HR.CFG.towerBonus)}.</p>
      <div class="hr-res"><div class="row"><button class="hr-b g" data-a="close"><b>Resume</b></button><button class="hr-b" data-a="timer"><b>Turn timer: ${timerOn()?'On':'Off'}</b><small>${TURN_MS/1000} seconds, then the computer moves for you</small></button></div>
        <div class="row"><button class="hr-b" data-a="leave"><b>Save &amp; leave</b><small>Continue later from Game Modes</small></button><button class="hr-b bad" data-a="abandon"><b>Abandon match</b></button></div></div></section>`;
  if(v.k==='exchange'){const d=D();return `<div class="hr-scrim" data-a="close-ex"></div><section class="hr-sheet mid" role="dialog" aria-label="Choose a swap"><div class="hr-sh" style="padding:0"><div><small style="color:#f6e2a8">EXCHANGE</small><b>Choose a swap</b></div><button class="hr-x" data-a="close-ex" aria-label="Close">${ICON.x}</button></div>
      <div class="hr-list">${d.choices.slice(0,6).map((c,k)=>`<button class="hr-b" data-ex="${k}"><b>${E(s.tiles[c.give].n)} → ${E(s.tiles[c.take].n)}</b><small>${fmt(c.cost)}</small></button>`).join('')}</div></section>`}
  if(v.k==='end'){const w=s.winner,[fa,fb]=[HR.score(s,me),HR.score(s,ai)];
    return `<div class="hr-scrim"></div><section class="hr-sheet mid hr-res" role="dialog" aria-label="Match result"><small style="font:800 10px Manrope,sans-serif;letter-spacing:.2em;color:#f6e2a8">HARBOUR RING · RESULT</small><h2>${w===me?'You win!':E(name(ai))+' wins'}</h2>
      <div class="hr-stats" style="width:100%;text-align:left">${[[me,fa],[ai,fb]].map(([p,sc])=>`<div><b style="color:${p===me?'#f2c457':'#ff9da0'}">${E(name(p))}${s.players[p].bankrupt?' · bankrupt':''}</b><span>Score ${fmt(sc)}</span><span>Cash ${fmt(s.players[p].cash)} · streets ${HR.tilesOf(s,p).length} · towers ${HR.towers(s,p)}</span></div>`).join('')}</div>
      <div class="row"><button class="hr-b g" data-a="again"><b>Play again</b></button><button class="hr-b" data-a="home"><b>Home</b></button></div></section>`}
  return ''}

function after(){if(!s)return;persist();clearTimeout(timer);
  const d0=D(),mine0=d0&&!s.over&&(d0.type==='bid'?s.bids&&s.bids[me]==null:d0.p===me),key=d0?s.moves+':'+d0.type+':'+(d0.tile!=null?d0.tile:'')+':'+(d0.p):'';
  if(mine0&&timerOn()&&!view.auto){if(view.dkey!==key){view.dkey=key;view.deadline=Date.now()+TURN_MS}}else{view.deadline=0;view.dkey=key}
  render();if(s.over){view.sheet={k:'end'};render();return}
  const d=D();
  if(d.type==='bid'){if(s.bids[ai]==null){HR.act(s,ai,HR.ai(s,ai));if(!s.over&&D()!==d)return after()}
    if(view.auto&&s.bids&&s.bids[me]==null){timer=setTimeout(()=>{HR.act(s,me,HR.ai(s,me));after()},delay(300))}return}
  if(d.p===ai||view.auto)timer=setTimeout(()=>runFor(d.p),delay(d.type==='move'?650:550))}
const delay=ms=>Math.max(0,Math.round(ms*view.speed));
function onTick(){if(!s||!root)return;if(!view.deadline||view.tok)return;
  if(view.sheet&&view.sheet.k==='menu'){view.deadline+=250;return}
  const el=root.querySelector('.hr-timer');const left=view.deadline-Date.now();
  if(left<=0){view.deadline=0;view.sheet=null;const d=D();if(!d||s.over)return;s.log.push({round:s.round,p:me,txt:'Time ran out: the computer chose for you'});
    const a=HR.ai(s,me);if(d.type==='move')return animate(me,a.steps,()=>{HR.act(s,me,a);after()});HR.act(s,me,a);view.bid=null;return after()}
  if(el){const sec=Math.ceil(left/1000);el.textContent=sec;el.style.setProperty('--p',Math.round(100*left/TURN_MS)+'%');el.classList.toggle('low',sec<=5);el.setAttribute('aria-label',`Your turn, ${sec} seconds left`)}}
function runFor(p){if(!s||s.over)return;const d=D();if(!d||d.p!==p)return after();const a=HR.ai(s,p);
  if(d.type==='move')return animate(p,a.steps,()=>{HR.act(s,p,a);after()});
  HR.act(s,p,a);after()}
function animate(p,steps,done){const from=s.players[p].pos;view.tok=s.players.map(x=>x.pos);let k=0;
  const step=()=>{if(!s)return;k++;view.tok[p]=(from+k)%24;view.hop=p;render();if(k<steps)timer=setTimeout(step,delay(110));else timer=setTimeout(()=>{view.tok=null;view.hop=null;done()},delay(160))};
  step()}

function onClick(e){const b=e.target.closest('button,[data-a]');if(!b||!s)return;const a=b.dataset;
  if(a.i!=null&&!a.a){tap();view.sheet={k:'tile',i:+a.i};return render()}
  if(a.tab){view.tab=a.tab;return render()}
  if(a.a==='close'||a.a==='close-ex'){view.sheet=s.over?{k:'end'}:null;return render()}
  if(a.a==='feed'){tap();view.sheet={k:'feed'};view.seen=s.log.length;return render()}
  if(a.a==='stats'){tap();view.sheet={k:'feed'};view.tab='stats';return render()}
  if(a.a==='menu'){tap();view.sheet={k:'menu'};return render()}
  if(a.a==='leave'){tap();persist();return close()}
  if(a.a==='abandon'||a.a==='home'){tap();dropSave();return close()}
  if(a.a==='again'){tap();dropSave();return start()}
  if(a.a==='timer'){try{localStorage.setItem(TIMER_KEY,timerOn()?'off':'on')}catch(e){}view.dkey=null;view.sheet=null;return after()}
  const d=D();if(!d||s.over||view.tok)return;
  const mine=d.type==='bid'?s.bids&&s.bids[me]==null:d.p===me;if(!mine)return;
  const go=act=>{tap();view.sheet=null;HR.act(s,me,act);view.bid=null;after()};
  if(a.move){const n=+a.move;tap();return animate(me,n,()=>{HR.act(s,me,{steps:n});after()})}
  if(a.bid){view.bid=Math.max(0,Math.min(s.players[me].cash,(view.bid||0)+(+a.bid)));return render()}
  if(a.permit)return go({tile:+a.permit});
  if(a.ferry)return go({corner:+a.ferry});
  if(a.ex!=null){const c=d.choices[+a.ex];return go({give:c.give,take:c.take})}
  switch(a.a){case 'buy':return go({yes:true});case 'pass':return go({yes:false});case 'bid':return go({bid:view.bid});case 'nobid':return go({bid:0});
    case 'build':return go({yes:true});case 'offer':return go({yes:true});case 'accept':return go({block:false});case 'block':return go({block:true});
    case 'exlist':view.sheet={k:'exchange'};return render();case 'skip':return go(d.type==='exchange'?{}:d.type==='permit'?{}:d.type==='ferry'?{}:{yes:false})}}
function onKey(e){if(e.key==='Escape'&&view.sheet&&view.sheet.k!=='end'){view.sheet=null;render()}}

function cities(){return CITY_ORDER.map(k=>({key:k,name:CITY_DATA[k].name,country:(countryOf(k)||{}).name||'',props:CITY_DATA[k].props}))}
function myAvatar(){const i=document.querySelector('#tbWho .rav img');return i&&i.getAttribute('src')||'avatars/small/skyline_avatar_02_96.png'}
function start(opts={}){clearTimeout(timer);if(opts.resume){s=opts.resume;built=new Set(s.tiles.filter(t=>t.lv>0).map(t=>t.i+':'+t.lv));view={tok:null,sheet:null,tab:'feed',seen:s.log.length,auto:!!opts.auto,speed:opts.speed!=null?opts.speed:1};mount();after();return s}
  const seed=opts.seed||((Date.now()^Math.floor(Math.random()*1e9))>>>0);built=new Set();
  let rv=1+(seed%20);const mineAv=myAvatar();if(mineAv.includes(`_${String(rv).padStart(2,'0')}_`))rv=rv%20+1;
  const first=opts.first!=null?opts.first:seed&1;
  s=HR.newMatch({seed,first,cities:cities(),players:[{name:(typeof PREF==='object'&&PREF.nick)||'You',avatar:mineAv},{name:RIVALS[seed%RIVALS.length],ai:true,avatar:`avatars/small/skyline_avatar_${String(rv).padStart(2,'0')}_96.png`}]});
  view={tok:null,sheet:null,tab:'feed',seen:0,auto:!!opts.auto,speed:opts.speed!=null?opts.speed:1};
  mount();after();return s}
function onHide(){if(document.hidden)persist()}
function mount(){if(!root){root=document.createElement('div');root.id='hr';root.setAttribute('role','application');root.setAttribute('aria-label','Harbour Ring match');document.body.append(root);root.addEventListener('click',onClick);document.addEventListener('keydown',onKey);document.addEventListener('visibilitychange',onHide)}
  clearInterval(tick);tick=setInterval(onTick,250);
  try{if(window.SkylineKeepAwake)SkylineKeepAwake.set(true)}catch(e){}}
function close(){clearTimeout(timer);clearInterval(tick);if(root){root.removeEventListener('click',onClick);document.removeEventListener('keydown',onKey);document.removeEventListener('visibilitychange',onHide);root.remove();root=null}s=null;
  try{if(window.SkylineKeepAwake)SkylineKeepAwake.set(false)}catch(e){}
  try{homeTab('play')}catch(e){}}

{const st=document.createElement('style');st.id='hr-style';st.textContent=css;document.head.append(st)}
// Entry in the Game Modes panel of the home screen.
function addEntry(T){try{const box=T.querySelector('.hd-gm-list');if(!box||box.querySelector('#qRing'))return;const b=document.createElement('button');b.id='qRing';b.type='button';b.className='hd-gm-item';
  const saved=loadRing();
  b.innerHTML=`<span class="ic" style="padding:0;overflow:hidden;background:none"><img src="art/ring-icon.png" alt="" width="34" height="34" style="width:100%;height:100%;object-fit:cover;border-radius:inherit"></span><span class="tx"><b>Harbour Ring</b><small>${saved?`Continue · round ${saved.round} of ${HR.CFG.rounds}`:'1 vs 1 · new board'}</small></span>`;
  b.onclick=()=>{try{initAudio()}catch(e){}const sv=loadRing();sv?start({resume:sv}):start()};box.append(b)}catch(e){}}
function install(){const _pp=paneP;paneP=function(T){const r=_pp.apply(this,arguments);addEntry(T);return r};try{const T=document.querySelector('.hd-stage')?.parentElement;if(T)addEntry(T)}catch(e){}}
if(document.readyState==='complete')install();else addEventListener('load',install,{once:true});
window.HarbourRing=Object.freeze({start,close,active:()=>!!s,state:()=>s,saved:loadRing,setAuto:on=>{view.auto=!!on;after()},setSpeed:x=>{view.speed=x},setTurnSeconds:n=>{TURN_MS=n*1000;view.dkey=null}});
})();
