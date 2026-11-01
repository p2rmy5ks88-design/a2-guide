/* Skyline Estates home screen (owner-approved reference, 31 Oct 2026).
   Presentation only: every value comes from existing game state and every control calls an existing
   action (startFromSetup, openOnline, homeTab, startWith). No rules, saves, rewards or prices change.
   - City tab: cinematic stage laid out on a 16:9 frame (1 --hd-u = 1% of the frame width).
   - All main menu sections: the left rail becomes a bottom navigation dock; Settings moves to the header. */
(()=>{
'use strict';
const HD_BG_LAGOS='art/home-lagos.jpg';
let hdLagosArt=null;{const i=new Image();i.onload=()=>{hdLagosArt=HD_BG_LAGOS;try{const t=document.getElementById('title');if(t&&!t.hidden&&setup.tab==='play'&&document.querySelector('#title .hd-stage'))homeTab('play')}catch(e){}};i.src=HD_BG_LAGOS}
const hdCityKey=()=>setup.city;
const DOCK=[['play','City','M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10'],['portfolio','Portfolio','M4 20V5M8 20V5M12 20V5M16 20V5M20 20V5M3 5h18M3 20h18'],
 ['collection','Collection','M12 3l8 9-8 9-8-9z'],['shop','Shop','M3 4h2l2.4 11h11l2-8H6.2M9 20a1 1 0 1 0 0-.1M17 20a1 1 0 1 0 0-.1'],
 ['ach','Awards','M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3M12 7l.8 1.7 1.8.2-1.3 1.2.4 1.8-1.7-.9-1.7.9.4-1.8-1.3-1.2 1.8-.2z'],
 ['progress','Progress','M4 20h16M6 20v-6M10 20V9M14 20v-8M18 20V5']];
const dockI=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${p}"/></svg>`;
const activeDock=()=>{const t=setup.tab||'play',s=SEC_OF[t]||'play';if(t==='ach')return 'ach';if(s==='world'||s==='play')return 'play';return s};

/* ---------- styles ---------- */
const css=`
#title .home.hd-dock{--hd-u:min(1vw,1.7778vh);--hd-ox:calc((100vw - 100*var(--hd-u))/2);--hd-oy:calc((100vh - 56.25*var(--hd-u))/2);--hd-dockh:max(44px,calc(6.3*var(--hd-u)));
 --hd-gold:#f2c457;--hd-gold2:#b9832b;--hd-navy:#0b1633;flex-direction:column;padding-bottom:calc(var(--hd-dockh) + max(10px,env(safe-area-inset-bottom,0px)) + 8px)}
#title .home.hd-dock>.rail{position:absolute!important;z-index:6!important;left:50%!important;bottom:max(8px,env(safe-area-inset-bottom,0px))!important;transform:translateX(-50%)!important;width:min(calc(91*var(--hd-u)),calc(100vw - 24px))!important;min-width:min(560px,calc(100vw - 24px))!important;height:var(--hd-dockh)!important;flex-direction:row!important;align-items:center!important;padding:0 calc(.6*var(--hd-u))!important;gap:0!important;border-radius:calc(var(--hd-dockh)/2.2)!important;background:linear-gradient(180deg,rgba(22,36,74,.97),rgba(9,17,40,.98))!important;border:2px solid rgba(242,196,87,.75)!important;box-shadow:0 0 0 1px rgba(0,0,0,.5),0 calc(.6*var(--hd-u)) calc(1.8*var(--hd-u)) rgba(0,0,0,.55),inset 0 1px 0 rgba(255,231,160,.25)!important;overflow:visible!important;border-right:2px solid rgba(242,196,87,.75)!important}
#title .home.hd-dock>.rail>:not(.tabs){display:none!important}
#title .home.hd-dock>.rail .tabs{flex:1;display:flex!important;flex-direction:row!important;align-items:center;justify-content:space-between;gap:0;overflow:visible!important;height:100%!important;max-height:none!important;padding:0!important}
#title .home.hd-dock .hd-di{position:relative;flex:1 1 0;max-width:calc(100%/6);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;height:calc(100% - 14px);margin:0 calc(1.3*var(--hd-u));border:0;border-radius:calc(var(--hd-dockh)/2.6);background:none;color:#e9edf7;
 font:700 max(10.5px,calc(.98*var(--hd-u)))/1 var(--body,'Manrope',system-ui,sans-serif);letter-spacing:.09em;text-transform:uppercase;cursor:pointer;transition:background .2s,color .2s,transform .15s}
#title .home.hd-dock .hd-di svg{width:max(20px,calc(2.1*var(--hd-u)));height:max(20px,calc(2.1*var(--hd-u)))}
#title .home.hd-dock .hd-di+.hd-di:before{content:'';position:absolute;left:calc(-1.3*var(--hd-u) - 1px);top:28%;height:44%;width:1px;background:rgba(255,255,255,.18)}
#title .home.hd-dock .hd-di.on:before,#title .home.hd-dock .hd-di.on+.hd-di:before{display:none}
#title .home.hd-dock .hd-di:hover{color:#fff;background:rgba(255,255,255,.06)}
#title .home.hd-dock .hd-di:active{transform:scale(.97)}
#title .home.hd-dock .hd-di.on{color:#fff6dc;background:radial-gradient(120% 140% at 50% 0%,#e0a93a 0%,#a8721f 55%,#6a4612 100%);box-shadow:0 0 calc(1.4*var(--hd-u)) rgba(242,196,87,.55),inset 0 0 0 2px #f6d27a,inset 0 2px 0 rgba(255,255,255,.35)}
#title .home.hd-dock .hd-di .dot{position:absolute;top:18%;right:30%;width:8px;height:8px;border-radius:50%;background:#ff4d4d;box-shadow:0 0 0 2px var(--hd-navy)}
#title .home.hd-dock .hd-di:focus-visible{outline:3px solid #ffe08a;outline-offset:2px}
#title .home.hd-dock .hmain{min-height:0}
#title .hd-gear{display:none}
#title .home.hd-on .hd-gear{flex:none;display:grid;place-items:center;width:max(40px,calc(3.1*var(--hd-u)));height:max(40px,calc(3.1*var(--hd-u)));border-radius:50%;border:2px solid rgba(242,196,87,.7);background:radial-gradient(circle at 50% 35%,#22325e,#0b1633);color:#f3f5fb;cursor:pointer}
#title .hd-gear svg{width:55%;height:55%}
#title .hd-gear:hover{color:#ffe08a}

/* ---------- City stage ---------- */
#title .home.hd-on{background:#070d22}
#title .home.hd-on>.rail{bottom:max(calc(1.25*var(--hd-u)),env(safe-area-inset-bottom,0px),6px)!important}
#title .home.hd-on .hd-bg{position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none;background:#0a1230}
#title .home.hd-on .hd-bg i{position:absolute;inset:0;background-size:cover;background-position:center 40%}
#title .home.hd-on .hd-bg .hd-photo{filter:brightness(.62) saturate(1.35) contrast(1.12) hue-rotate(-6deg)}
#title .home.hd-on .hd-bg .hd-grade{background:linear-gradient(180deg,rgba(40,30,140,.62) 0%,rgba(110,50,150,.42) 22%,rgba(255,140,70,.22) 38%,rgba(255,170,90,.08) 48%,rgba(20,24,70,.25) 62%,rgba(8,12,36,.72) 84%,rgba(5,9,26,.9) 100%);mix-blend-mode:hard-light}
#title .home.hd-on .hd-bg .hd-lights{background:radial-gradient(2px 2px at 20% 30%,#ffd98a,transparent),radial-gradient(2px 2px at 34% 26%,#ffe7b0,transparent),radial-gradient(2px 2px at 46% 34%,#ffd98a,transparent),radial-gradient(2px 2px at 58% 28%,#fff1c8,transparent);opacity:.7}
#title .home.hd-on .hd-bg .hd-glow{background:radial-gradient(60% 40% at 55% 45%,rgba(255,190,110,.18),transparent 70%),radial-gradient(120% 90% at 50% 40%,transparent 55%,rgba(3,6,20,.65) 100%)}
#title .home.hd-on .hd-bg.art .hd-grade{background:linear-gradient(180deg,rgba(0,0,0,0) 0%,rgba(0,0,0,0) 55%,rgba(5,9,26,.45) 85%,rgba(5,9,26,.75) 100%);mix-blend-mode:normal}
#title .home.hd-on .hd-bg.art .hd-photo{filter:brightness(1.14) saturate(1.22) contrast(1.045)}
#title .home.hd-on .hd-deco{position:absolute;pointer-events:none;mix-blend-mode:lighten;background-size:cover;-webkit-mask-image:radial-gradient(closest-side,#000 62%,transparent);mask-image:radial-gradient(closest-side,#000 62%,transparent)}
#title .home.hd-on .hd-bg.art .hd-deco{display:none}
#title .home.hd-on .hd-deco.d1{left:calc(var(--hd-ox) + 4*var(--hd-u));top:calc(var(--hd-oy) + 33*var(--hd-u));width:calc(11*var(--hd-u));height:calc(11*var(--hd-u));background-image:url(items/dice-classic.jpg)}
#title .home.hd-on .hd-deco.d2{right:calc(var(--hd-ox) + 1*var(--hd-u));top:calc(var(--hd-oy) + 30*var(--hd-u));width:calc(12*var(--hd-u));height:calc(12*var(--hd-u));background-image:url(items/bld-3.jpg)}
#title .home.hd-on .hmain{position:static}
#title .home.hd-on #rprof.topbar{position:absolute;z-index:5;left:calc(var(--hd-ox) + 4.8*var(--hd-u));right:calc(var(--hd-ox) + 1.2*var(--hd-u));top:calc(1.2*var(--hd-u) + env(safe-area-inset-top,0px));height:calc(7*var(--hd-u));min-height:44px;flex-wrap:nowrap;
 display:flex;align-items:flex-start;gap:calc(.8*var(--hd-u));background:none;border:0;box-shadow:none;padding:0;margin:0}
#title .home.hd-on #rprof.topbar{display:flex!important;grid-template-columns:none!important;gap:calc(.8*var(--hd-u))!important}
#title .home.hd-on #rprof>.grow{display:block!important;flex:1}
#title .home.hd-on #tbWho{display:flex;align-items:center;gap:calc(1*var(--hd-u));background:none;border:0;padding:0;color:#fff;text-align:left;cursor:pointer}
#title .home.hd-on #tbWho .rav{flex:none;width:calc(6.3*var(--hd-u));height:calc(6.3*var(--hd-u));min-width:42px;min-height:42px;border-radius:50%;overflow:hidden;display:grid;place-items:center;
 border:calc(.32*var(--hd-u)) solid #e8b84a;box-shadow:0 0 0 2px #6a4612,0 calc(.4*var(--hd-u)) calc(1.2*var(--hd-u)) rgba(0,0,0,.5);background:#1c2b52}
#title .home.hd-on #tbWho .rav>*{width:100%!important;height:100%!important;object-fit:cover}
#title .home.hd-on #rprof #tbWho .ri{display:flex!important;height:auto!important;flex-direction:column;gap:calc(.5*var(--hd-u));min-width:calc(14*var(--hd-u))}
#title .home.hd-on #rprof #tbWho .ri>b{display:flex!important;flex-direction:column;height:auto!important;max-height:none!important;overflow:visible!important;white-space:nowrap;font:800 max(15px,calc(1.75*var(--hd-u)))/1.1 var(--display,'Outfit',system-ui,sans-serif)!important;color:#fff!important;text-shadow:0 2px 6px rgba(0,0,0,.6)}
#title .home.hd-on #rprof #tbWho .ri>b small{display:block!important;font:600 max(11px,calc(1.12*var(--hd-u)))/1.25 var(--body,'Manrope',system-ui,sans-serif)!important;color:#e8ecf6!important;margin:calc(.3*var(--hd-u)) 0 0!important;opacity:1!important}
#title .home.hd-on #tbWho .ri>b small:before{content:none}
#title .home.hd-on #rprof #tbWho .xpbar{display:block;width:calc(14.3*var(--hd-u))!important;height:max(7px,calc(.85*var(--hd-u)))!important;border-radius:99px;background:rgba(8,14,36,.85);box-shadow:inset 0 0 0 1px rgba(242,196,87,.45);overflow:hidden}
#title .home.hd-on #tbWho .xpbar i{display:block;height:100%;background:linear-gradient(90deg,#c88a22,#ffd96b)}
#title .home.hd-on .hd-badge{flex:none;align-self:flex-start;margin:calc(1.1*var(--hd-u)) 0 0 calc(-.6*var(--hd-u));width:calc(2.6*var(--hd-u));height:calc(2.6*var(--hd-u));min-width:24px;min-height:24px}
#title .home.hd-on .hd-logo{position:absolute;left:50%;top:calc(-.6*var(--hd-u));transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;pointer-events:none;width:calc(26*var(--hd-u))}
#title .home.hd-on .hd-logo svg{width:calc(10*var(--hd-u));height:calc(3.6*var(--hd-u))}
#title .home.hd-on .hd-logo b{display:block;margin-top:calc(-.4*var(--hd-u));font:700 calc(3.25*var(--hd-u))/1 'Cinzel','Trajan Pro',Georgia,'Times New Roman',serif;letter-spacing:.04em;white-space:nowrap;
 background:linear-gradient(180deg,#fff3c4 0%,#f6cf63 38%,#c48a26 62%,#ffe08a 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 2px 0 #5a3a0c) drop-shadow(0 4px 8px rgba(0,0,0,.6))}
#title .home.hd-on .hd-logo span{display:block;width:100%;margin-top:calc(.5*var(--hd-u));border-top:2px solid rgba(242,196,87,.75);padding-top:calc(.45*var(--hd-u));text-align:center;font:700 calc(1*var(--hd-u))/1 var(--body,'Manrope',system-ui,sans-serif);letter-spacing:.38em;color:#f3f5fb;text-shadow:0 1px 4px #000}
#title .home.hd-on .tpill{display:flex;align-items:center;gap:calc(.6*var(--hd-u));height:max(36px,calc(2.75*var(--hd-u)));padding:0 calc(.5*var(--hd-u)) 0 calc(.7*var(--hd-u));border-radius:99px;border:2px solid rgba(242,196,87,.55);
 background:linear-gradient(180deg,rgba(20,32,66,.92),rgba(9,16,38,.92));color:#fff;font:800 max(13px,calc(1.15*var(--hd-u)))/1 var(--body,'Manrope',system-ui,sans-serif);box-shadow:0 2px 10px rgba(0,0,0,.45);margin-top:calc(.6*var(--hd-u))}
#title .home.hd-on .tpill .coinpill{background:none;border:0;padding:0 calc(.6*var(--hd-u)) 0 0;font:inherit;color:inherit;box-shadow:none}
#title .home.hd-on .tpill .plus{display:grid;place-items:center;width:calc(2*var(--hd-u));height:calc(2*var(--hd-u));min-width:24px;min-height:24px;border-radius:50%;background:linear-gradient(180deg,#ffe08a,#c88a22);color:#3a2504}
#title .home.hd-on #tbLeague{padding-right:calc(1*var(--hd-u))}
#title .home.hd-on #tbLeague svg{color:#f2c457}
#title .home.hd-on #rprof .hd-gear{margin-top:calc(.45*var(--hd-u))}
#title .home.hd-on #pane{position:absolute;inset:0;z-index:2;overflow:visible;padding:0;margin:0;background:none;border:0;box-shadow:none}
#title .home.hd-on #pane>.subtabs{display:none}
#title .hd-stage{position:absolute;left:var(--hd-ox);top:var(--hd-oy);width:calc(100*var(--hd-u));height:calc(56.25*var(--hd-u));pointer-events:none;color:#fff}
#title .hd-stage>*{pointer-events:auto;position:absolute}
#title .hd-city{left:calc(9.3*var(--hd-u));top:calc(13.2*var(--hd-u));width:max-content;max-width:calc(21*var(--hd-u));pointer-events:none}
#title .hd-city small{display:block;font:700 calc(1.4*var(--hd-u))/1 var(--display,'Outfit',system-ui,sans-serif);color:#f6cf63;text-shadow:0 2px 6px rgba(0,0,0,.7);white-space:nowrap}
#title .hd-city h1{margin:calc(.55*var(--hd-u)) 0 0;font:700 calc(4.25*var(--hd-u))/1 'Cinzel','Trajan Pro',Georgia,'Times New Roman',serif;letter-spacing:.02em;text-transform:uppercase;color:#fff;
 text-shadow:0 2px 0 #9aa6bf,0 4px 14px rgba(0,0,0,.75);white-space:nowrap}
#title .hd-city p{margin:calc(.7*var(--hd-u)) 0 0 calc(2.1*var(--hd-u));font:700 calc(1.05*var(--hd-u))/1 var(--body,'Manrope',system-ui,sans-serif);letter-spacing:.32em;text-transform:uppercase;color:#f3f5fb;text-shadow:0 1px 4px #000;white-space:nowrap}
#title .hd-city i{display:block;width:calc(13.5*var(--hd-u));height:2px;margin:calc(.55*var(--hd-u)) 0 0 calc(1.8*var(--hd-u));background:linear-gradient(90deg,transparent,#f2c457 20%,#f2c457 80%,transparent)}
#title .hd-cont{left:calc(32*var(--hd-u));top:calc(22.2*var(--hd-u) - max(34px,calc(2.6*var(--hd-u))));display:flex;align-items:center;gap:calc(.6*var(--hd-u));height:max(34px,calc(2.6*var(--hd-u)));padding:0 calc(1.2*var(--hd-u));border-radius:99px;border:2px solid #f2c457;
 background:linear-gradient(180deg,rgba(20,32,66,.94),rgba(9,16,38,.94));color:#fff;font:800 max(12px,calc(1.05*var(--hd-u)))/1 var(--body,'Manrope',system-ui,sans-serif);cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.5)}
#title .hd-cont small{font-weight:600;color:#cfd6e6}
#title .hd-spot{right:calc(1.9*var(--hd-u));top:calc(8.1*var(--hd-u));width:calc(27.4*var(--hd-u));height:calc(8.9*var(--hd-u));min-height:62px;display:flex;align-items:stretch;gap:calc(1.1*var(--hd-u));padding:calc(.45*var(--hd-u));
 border-radius:calc(1.6*var(--hd-u));border:2px solid #e9b949;background:linear-gradient(180deg,rgba(16,27,60,.94),rgba(8,14,34,.96));box-shadow:0 0 0 1px rgba(0,0,0,.5),0 calc(.6*var(--hd-u)) calc(1.8*var(--hd-u)) rgba(0,0,0,.55),0 0 calc(1.5*var(--hd-u)) rgba(242,196,87,.25);color:#fff;text-align:left;cursor:pointer}
#title .hd-spot .th{flex:none;width:calc(9.3*var(--hd-u));border-radius:calc(1.2*var(--hd-u));background-size:cover;background-position:center;box-shadow:inset 0 0 0 1px rgba(255,255,255,.15)}
#title .hd-spot .tx{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:calc(.35*var(--hd-u))}
#title .hd-spot .tag{align-self:flex-start;padding:calc(.25*var(--hd-u)) calc(.8*var(--hd-u));border-radius:99px;background:linear-gradient(180deg,#ffe08a,#d79b2c);color:#2b1b04;font:800 max(9px,calc(.95*var(--hd-u)))/1.1 var(--body,'Manrope',system-ui,sans-serif);letter-spacing:.06em}
#title .hd-spot b{font:800 max(14px,calc(1.85*var(--hd-u)))/1 var(--display,'Outfit',system-ui,sans-serif)}
#title .hd-spot small{font:600 max(10px,calc(1.05*var(--hd-u)))/1.2 var(--body,'Manrope',system-ui,sans-serif);color:#e5e9f4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#title .hd-spot .go{flex:none;align-self:center;display:grid;place-items:center;width:calc(2.3*var(--hd-u));height:calc(2.3*var(--hd-u));min-width:26px;min-height:26px;margin-right:calc(.6*var(--hd-u));border-radius:50%;background:linear-gradient(180deg,#ffe08a,#c88a22);color:#2b1b04;font:900 max(13px,calc(1.3*var(--hd-u)))/1 var(--body,'Manrope',system-ui,sans-serif)}
#title .hd-modes{left:calc(14.3*var(--hd-u));top:calc(23*var(--hd-u));width:calc(73.8*var(--hd-u));height:calc(15.9*var(--hd-u));display:flex;gap:calc(.35*var(--hd-u))}
#title .hd-mode{position:relative;flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding:0 calc(.8*var(--hd-u)) calc(1.1*var(--hd-u));border-radius:calc(2*var(--hd-u));cursor:pointer;color:#fff;text-align:center;
 border:calc(.3*var(--hd-u)) solid #f0c35a;background:var(--mb);box-shadow:0 0 0 calc(.15*var(--hd-u)) #6a4612,inset 0 calc(.5*var(--hd-u)) calc(1.2*var(--hd-u)) rgba(255,255,255,.25),inset 0 calc(-1*var(--hd-u)) calc(2*var(--hd-u)) rgba(0,0,0,.35),0 calc(1*var(--hd-u)) calc(2.2*var(--hd-u)) rgba(0,0,0,.6),0 0 calc(1.6*var(--hd-u)) var(--mg);
 transition:transform .18s,filter .18s}
#title .hd-mode:hover{transform:translateY(calc(-.35*var(--hd-u)));filter:brightness(1.08)}
#title .hd-mode:active{transform:translateY(0) scale(.985)}
#title .hd-mode:focus-visible{outline:3px solid #fff3c4;outline-offset:3px}
#title .hd-mode .art{position:absolute;left:50%;top:calc(-1.2*var(--hd-u));transform:translateX(-50%);width:calc(12.5*var(--hd-u));height:calc(8.6*var(--hd-u));background:center bottom/contain no-repeat;pointer-events:none;filter:drop-shadow(0 calc(.5*var(--hd-u)) calc(.6*var(--hd-u)) rgba(0,0,0,.45))}
#title .hd-mode .art:after{content:'';position:absolute;left:12%;right:12%;bottom:-6%;height:22%;border-radius:50%;background:radial-gradient(closest-side,rgba(255,220,140,.35),transparent);z-index:-1}
#title .hd-mode b{font:800 calc(2.05*var(--hd-u))/1.05 var(--display,'Outfit',system-ui,sans-serif);text-shadow:0 2px 0 rgba(0,0,0,.35),0 3px 8px rgba(0,0,0,.45);white-space:nowrap}
#title .hd-mode small{margin-top:calc(.55*var(--hd-u));font:600 max(10px,calc(1.12*var(--hd-u)))/1.15 var(--body,'Manrope',system-ui,sans-serif);color:#f6f2ea;text-shadow:0 1px 3px rgba(0,0,0,.6)}
#title .hd-mode .pb{margin-top:calc(.9*var(--hd-u));display:grid;place-items:center;width:calc(4.8*var(--hd-u));height:calc(2.45*var(--hd-u));min-height:24px;border-radius:99px;background:linear-gradient(180deg,#fff0a8,#f5c63f 45%,#c8901f);box-shadow:0 2px 0 #7a5212,0 4px 8px rgba(0,0,0,.4),inset 0 1px 0 #fff}
#title .hd-mode .pb svg{width:42%;height:60%;color:#1d1406}
#title .hd-mode.m1{--mb:linear-gradient(180deg,#f3b347 0%,#d47f1c 45%,#8a4a10 100%);--mg:rgba(255,170,60,.35)}
#title .hd-mode.m2{--mb:linear-gradient(180deg,#2fb37a 0%,#137a4c 50%,#0b4a2f 100%);--mg:rgba(60,220,140,.3)}
#title .hd-mode.m3{--mb:linear-gradient(180deg,#3b8cf0 0%,#1557c4 50%,#0c3279 100%);--mg:rgba(80,150,255,.35)}
#title .hd-mode.m4{--mb:linear-gradient(180deg,#a65ee6 0%,#7330bf 50%,#431977 100%);--mg:rgba(180,110,255,.35)}
#title .hd-panel{display:flex;align-items:center;border-radius:calc(1.5*var(--hd-u));border:2px solid #e9b949;background:linear-gradient(180deg,rgba(16,27,60,.94),rgba(8,14,34,.96));box-shadow:0 0 0 1px rgba(0,0,0,.5),0 calc(.6*var(--hd-u)) calc(1.6*var(--hd-u)) rgba(0,0,0,.55);color:#fff;cursor:pointer;text-align:left}
#title .hd-panel:focus-visible{outline:3px solid #fff3c4;outline-offset:2px}
#title .hd-aw{left:calc(11.7*var(--hd-u));top:calc(41.4*var(--hd-u));width:calc(24.8*var(--hd-u));height:calc(5.9*var(--hd-u));min-height:48px;gap:calc(1.2*var(--hd-u));padding:0 calc(1.6*var(--hd-u)) 0 calc(1*var(--hd-u))}
#title .hd-aw svg{flex:none;width:calc(4.8*var(--hd-u));height:calc(4.8*var(--hd-u))}
#title .hd-aw .tx{flex:1;display:flex;flex-direction:column;gap:calc(.35*var(--hd-u))}
#title .hd-aw small{font:600 max(11px,calc(1.2*var(--hd-u)))/1 var(--body,'Manrope',system-ui,sans-serif);color:#e8ecf6}
#title .hd-aw b{font:800 max(15px,calc(1.75*var(--hd-u)))/1 var(--display,'Outfit',system-ui,sans-serif)}
#title .hd-aw .bar{height:max(6px,calc(.75*var(--hd-u)));border-radius:99px;background:rgba(0,0,0,.5);box-shadow:inset 0 0 0 1px rgba(242,196,87,.35);overflow:hidden}
#title .hd-aw .bar i{display:block;height:100%;background:linear-gradient(90deg,#c88a22,#ffd96b)}
#title .hd-chg{left:calc(39*var(--hd-u));top:calc(42.3*var(--hd-u));width:calc(17.1*var(--hd-u));height:calc(3.9*var(--hd-u));min-height:44px;justify-content:center;gap:calc(.9*var(--hd-u));border-radius:99px;border-color:rgba(160,175,210,.55);
 font:700 max(13px,calc(1.45*var(--hd-u)))/1 var(--body,'Manrope',system-ui,sans-serif)}
#title .hd-chg svg{width:calc(1.9*var(--hd-u));height:calc(1.9*var(--hd-u));min-width:18px;min-height:18px}
#title .hd-sep{left:calc(57.9*var(--hd-u));top:calc(42.6*var(--hd-u));width:1px;height:calc(3.3*var(--hd-u));background:rgba(255,255,255,.25);pointer-events:none}
#title .hd-season{left:calc(59.5*var(--hd-u));top:calc(41.3*var(--hd-u));width:calc(30.2*var(--hd-u));height:calc(6*var(--hd-u));min-height:48px;overflow:hidden;padding:0 calc(1.2*var(--hd-u)) 0 calc(3*var(--hd-u));
 background:linear-gradient(90deg,rgba(14,20,56,.98) 0%,rgba(30,22,74,.9) 43%,rgba(30,22,74,.07) 82%),var(--sart) right 82%/80% auto no-repeat,#140f36}
#title .hd-season .tx{flex:1;display:flex;flex-direction:column;gap:calc(.35*var(--hd-u));text-shadow:0 2px 6px rgba(0,0,0,.7)}
#title .hd-season small{font:800 max(10px,calc(1.15*var(--hd-u)))/1 var(--body,'Manrope',system-ui,sans-serif);letter-spacing:.3em;color:#f2c457}
#title .hd-season b{font:800 max(17px,calc(2.6*var(--hd-u)))/1 var(--display,'Outfit',system-ui,sans-serif)}
#title .hd-season .go{flex:none;display:grid;place-items:center;width:calc(2.5*var(--hd-u));height:calc(2.5*var(--hd-u));min-width:28px;min-height:28px;border-radius:50%;border:2px solid #f2c457;background:rgba(8,14,34,.75);color:#f2c457;font:900 max(13px,calc(1.3*var(--hd-u)))/1 var(--body,'Manrope',system-ui,sans-serif)}
#title .hd-season .rdy{position:absolute;top:calc(.5*var(--hd-u));right:calc(4.6*var(--hd-u));padding:2px 8px;border-radius:99px;background:#ff4d4d;font:800 max(9px,calc(.85*var(--hd-u)))/1.2 var(--body,'Manrope',system-ui,sans-serif)}
#title .home.hd-dock .hd-di{font-size:max(11px,calc(1.05*var(--hd-u)))!important;font-weight:700!important;padding:0!important;min-height:0!important;width:auto!important}
#title .home.hd-dock .hd-di span{font:inherit!important;letter-spacing:.09em;margin-top:calc(.35*var(--hd-u))}
#title .home.hd-dock .hd-di svg{width:max(22px,calc(2.35*var(--hd-u)))!important;height:max(22px,calc(2.35*var(--hd-u)))!important;stroke-width:1.6}
#title .home.hd-on #rprof .tpill{height:max(38px,calc(2.9*var(--hd-u)))!important;font-size:max(13px,calc(1.3*var(--hd-u)))!important;padding:0 calc(1.1*var(--hd-u))!important}
#title .home.hd-on #rprof .tpill .coinpill i{width:calc(1.9*var(--hd-u))!important;height:calc(1.9*var(--hd-u))!important}
#title .home.hd-on #rprof .tpill svg{width:calc(1.7*var(--hd-u))!important;height:calc(1.7*var(--hd-u))!important}
#title .hd-spot small{white-space:normal!important;overflow:visible!important}
#title .hd-aw svg{width:calc(4.8*var(--hd-u))!important;height:calc(4.8*var(--hd-u))!important}
#title .hd-mode b{font-size:calc(2.2*var(--hd-u))!important}
#title .hd-mode small{font-size:max(10px,calc(1.15*var(--hd-u)))!important}
#title .hd-chg{font-size:max(13px,calc(1.45*var(--hd-u)))!important}
#title .home.hd-on #rprof .tpill,#title .home.hd-on #rprof .hd-gear,#title .hd-spot .go,#title .hd-season .go{position:relative}
#title .home.hd-on #rprof .tpill:after,#title .home.hd-on #rprof .hd-gear:after{content:'';position:absolute;inset:-8px -4px}
/* ---- refinement 2: physical 3D tiles, Canva Lagos art, panel polish ---- */
#title .hd-modes{gap:calc(.6*var(--hd-u));perspective:calc(90*var(--hd-u))}
#title .hd-mode{border:calc(.38*var(--hd-u)) solid transparent!important;border-radius:calc(2.1*var(--hd-u));
 background:radial-gradient(120% 60% at 50% 0%,rgba(255,255,255,.30),transparent 58%) padding-box,var(--mb) padding-box,
  linear-gradient(165deg,#fff4c8 0%,#f2c457 16%,#a8721f 40%,#ffe08a 60%,#b57b22 80%,#fff0b0 100%) border-box!important;
 box-shadow:0 calc(.45*var(--hd-u)) 0 #8a5a14,0 calc(.75*var(--hd-u)) 0 #3a2506,0 calc(1.5*var(--hd-u)) calc(2.6*var(--hd-u)) rgba(0,0,0,.62),0 0 calc(2.2*var(--hd-u)) var(--mg),
  inset 0 calc(.35*var(--hd-u)) calc(.5*var(--hd-u)) rgba(255,255,255,.35),inset 0 calc(-1.6*var(--hd-u)) calc(2.4*var(--hd-u)) rgba(0,0,0,.42)!important;
 transform:rotateX(4deg);transform-origin:50% 100%}
#title .hd-mode:hover{transform:rotateX(4deg) translateY(calc(-.45*var(--hd-u)));filter:brightness(1.07)}
#title .hd-mode:active{transform:rotateX(4deg) translateY(calc(.1*var(--hd-u))) scale(.985)}
#title .hd-mode:before{content:'';position:absolute;inset:calc(.3*var(--hd-u));border-radius:calc(1.75*var(--hd-u));box-shadow:inset 0 0 0 1px rgba(255,240,190,.5),inset 0 calc(4*var(--hd-u)) calc(3*var(--hd-u)) calc(-2*var(--hd-u)) rgba(255,255,255,.18);pointer-events:none}
#title .hd-mode:after{content:'';position:absolute;left:6%;right:6%;bottom:calc(-1.9*var(--hd-u));height:calc(1.5*var(--hd-u));border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.6),transparent);z-index:-1;pointer-events:none}
#title .hd-mode .art{top:calc(-2.5*var(--hd-u))!important;width:calc(14*var(--hd-u));height:calc(8.7*var(--hd-u))!important;filter:drop-shadow(0 calc(.6*var(--hd-u)) calc(.7*var(--hd-u)) rgba(0,0,0,.5))}
#title .hd-mode .art:after{display:none}
#title .hd-mode.m1 .art{top:calc(-1.5*var(--hd-u))!important;height:calc(7.8*var(--hd-u))!important}
#title .hd-mode small{white-space:nowrap;font-size:max(10px,calc(1.08*var(--hd-u)))!important;letter-spacing:-.005em}
#title .hd-mode{padding:0 calc(.5*var(--hd-u)) calc(1.1*var(--hd-u))!important}
#title .hd-mode b{text-shadow:0 calc(.14*var(--hd-u)) 0 rgba(60,30,0,.55),0 calc(.3*var(--hd-u)) calc(.8*var(--hd-u)) rgba(0,0,0,.5)}
#title .hd-mode .pb{width:calc(5.3*var(--hd-u));height:calc(2.65*var(--hd-u));border:calc(.14*var(--hd-u)) solid #8a5a14;background:linear-gradient(180deg,#fff7c4 0%,#ffd75a 38%,#f0b52c 62%,#b97e1b 100%);
 box-shadow:0 calc(.22*var(--hd-u)) 0 #5e3d0b,0 calc(.45*var(--hd-u)) calc(.8*var(--hd-u)) rgba(0,0,0,.45),inset 0 calc(.12*var(--hd-u)) 0 rgba(255,255,255,.85),inset 0 calc(-.2*var(--hd-u)) calc(.3*var(--hd-u)) rgba(120,70,0,.4)}
#title .home.hd-on .hd-logo b{-webkit-text-stroke:calc(.07*var(--hd-u)) #6b4510;font-size:calc(3.4*var(--hd-u))}
#title .home.hd-on .hd-logo svg{width:calc(11*var(--hd-u));height:calc(4*var(--hd-u))}
#title .home.hd-on .hd-logo span{border-top:0!important;padding-top:calc(.7*var(--hd-u));margin-top:calc(.35*var(--hd-u));font-size:calc(1.05*var(--hd-u))!important;letter-spacing:.42em;
 background:linear-gradient(90deg,transparent,rgba(242,196,87,.9) 20%,rgba(242,196,87,.9) 80%,transparent) top center/88% 2px no-repeat}
#title .hd-spot{gap:calc(.9*var(--hd-u))}
#title .hd-spot .th{width:calc(7.9*var(--hd-u))}
#title .hd-spot{padding-right:calc(.3*var(--hd-u))!important}
#title .hd-spot .go{margin-right:calc(.3*var(--hd-u))!important}
#title .hd-spot small{font-size:max(10px,calc(.98*var(--hd-u)))!important}
#title .hd-spot small.rw{color:#fff3c4}
#title .hd-spot .tx{overflow:hidden}
#title .hd-spot small{white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis}
#title .hd-spot b{font-size:calc(1.9*var(--hd-u))}
#title .hd-aw small{font-size:max(11px,calc(1.35*var(--hd-u)))!important}
#title .hd-aw b{font-size:max(15px,calc(2*var(--hd-u)))}
#title .hd-aw svg{width:calc(5.2*var(--hd-u))!important;height:calc(5.2*var(--hd-u))!important}
#title .hd-chg{font-size:max(13px,calc(1.6*var(--hd-u)))!important}
#title .hd-panel{box-shadow:0 0 0 1px rgba(0,0,0,.5),0 calc(.5*var(--hd-u)) 0 rgba(0,0,0,.35),0 calc(.9*var(--hd-u)) calc(1.8*var(--hd-u)) rgba(0,0,0,.55),inset 0 1px 0 rgba(255,231,160,.25)}
#title .home.hd-on .hd-bg.art .hd-photo{background-position:center center}
#title .home.hd-on .hd-bg.art .hd-grade{background:linear-gradient(180deg,rgba(10,10,40,.12) 0%,rgba(255,156,100,.035) 23%,rgba(0,0,0,0) 58%,rgba(5,9,26,.25) 82%,rgba(5,9,26,.64) 100%)!important;mix-blend-mode:normal}
#title .home.hd-on .hd-bg.art .hd-lights{display:none}
#title .hd-spot .th.garden{background-position:center 64%!important;background-size:cover!important}
#title .hd-spot small.rw{white-space:normal!important;overflow:hidden!important;text-overflow:clip!important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.15}
@media (max-height:540px){
 #title .home.hd-on #rprof .tpill{height:max(28px,calc(2.9*var(--hd-u)))!important;font-size:max(11px,calc(1.3*var(--hd-u)))!important}
 #title .home.hd-on #rprof .hd-gear{width:30px;height:30px}
 #title .home.hd-on #rprof .tpill{min-height:0!important;max-height:32px!important}
 #title .hd-aw,#title .hd-season{min-height:40px!important}
 #title .home.hd-on #rprof #tbWho .ri>b{font-size:max(12px,calc(1.75*var(--hd-u)))!important}
 #title .home.hd-on #rprof #tbWho .ri>b small{font-size:max(9.5px,calc(1.12*var(--hd-u)))!important}
 #title .hd-spot,#title .hd-aw,#title .hd-chg,#title .hd-season{min-height:0}
 #title .hd-spot small,#title .hd-aw small{font-size:max(8.5px,calc(1.05*var(--hd-u)))!important}
 #title .hd-spot small{white-space:nowrap!important;overflow:hidden!important}
 #title .hd-spot b,#title .hd-aw b{font-size:max(11px,calc(1.75*var(--hd-u)))}
 #title .hd-spot .tag{font-size:max(7.5px,calc(.95*var(--hd-u)))}
 #title .hd-mode .art{height:calc(7.2*var(--hd-u))!important;top:calc(-1.8*var(--hd-u))!important}
 #title .hd-mode.m1 .art{height:calc(6.6*var(--hd-u))!important;top:calc(-1.2*var(--hd-u))!important}
 #title .hd-mode small{white-space:normal!important;overflow:visible!important;text-overflow:clip!important;line-height:1.1!important;margin-top:2px!important}
 #title .hd-mode .pb{margin-top:4px!important}
 #title .hd-mode small{min-height:2.2em;display:flex!important;align-items:flex-start;justify-content:center}
 #title .hd-spot .th{width:calc(6.2*var(--hd-u))}
 #title .hd-spot small.rw{white-space:normal!important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.1;font-size:max(8.5px,calc(.98*var(--hd-u)))!important}
 #title .hd-spot b{font-size:max(11px,calc(1.6*var(--hd-u)))!important}
 #title .hd-spot .tx{gap:1px}
 #title .hd-spot{min-height:64px!important;height:auto!important}
 #title .hd-mode b{font-size:max(12px,calc(2.2*var(--hd-u)))!important}
 #title .hd-mode small{font-size:max(9px,calc(1.15*var(--hd-u)))!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
 #title .hd-mode .pb{min-height:18px}
 #title .hd-chg{font-size:max(11px,calc(1.45*var(--hd-u)))!important}
 #title .hd-season b{font-size:max(13px,calc(2.6*var(--hd-u)))}
 #title .hd-season small{font-size:max(8px,calc(1.15*var(--hd-u)))}
 #title .home.hd-dock .hd-di{font-size:max(8.5px,calc(1.05*var(--hd-u)))!important}
 #title .home.hd-dock .hd-di svg{width:max(17px,calc(2.35*var(--hd-u)))!important;height:max(17px,calc(2.35*var(--hd-u)))!important}
 #title .home.hd-on #rprof.topbar{left:max(env(safe-area-inset-left,0px),12px);right:max(env(safe-area-inset-right,0px),12px)}
 #title .home.hd-on .hd-badge{display:none}
 #title .home.hd-on .hd-logo{width:calc(22*var(--hd-u))}
 #title .home.hd-on .hd-logo b{font-size:calc(2.8*var(--hd-u))}
 #title .home.hd-dock{--hd-dockh:max(48px,calc(6.3*var(--hd-u)))}
 #title .home.hd-dock .hd-di span{margin-top:1px}
 #title .home.hd-dock .hd-di{height:calc(var(--hd-dockh) - 8px)!important;max-height:none!important}
 #title .hd-chg{min-height:40px!important;top:calc(41.8*var(--hd-u))!important}
}
@media (prefers-reduced-motion:reduce){#title .hd-mode,#title .home.hd-dock .hd-di{transition:none}}
`;
const st=document.createElement('style');st.id='hd-style';st.textContent=css;document.head.append(st);

/* ---------- background ---------- */
function hdPaintBg(B){const key=hdCityKey(),art=key==='lagos'&&hdLagosArt?hdLagosArt:null,photo=art||cityPhoto(setup.city)||cityPhoto(key);B.classList.toggle('art',!!art);
 B.innerHTML=`<i class="hd-photo" style="${photo?`background-image:url(${photo})`:`background:${CITY_DATA[setup.city]?.sky||'#0a1230'}`}"></i><i class="hd-grade"></i><i class="hd-glow"></i><i class="hd-lights"></i><span class="hd-deco d1"></span><span class="hd-deco d2"></span>`}
function hdBackground(on){const home=document.querySelector('#title .home');if(!home)return;let B=home.querySelector(':scope>.hd-bg');
 if(!on){if(B)B.remove();return}if(!B){B=document.createElement('div');B.className='hd-bg';B.setAttribute('aria-hidden','true');home.prepend(B)}hdPaintBg(B)}

/* ---------- dock ---------- */
function hdDock(){const home=document.querySelector('#title .home'),nav=home&&home.querySelector('.rail .tabs');if(!nav)return;home.classList.add('hd-dock');
 const D=daily(),dot=wheelReady()||!dailyEventView().done||D.list.some(id=>!D.done[id])||seasonClaimable()>0,on=activeDock();nav.innerHTML='';nav.setAttribute('aria-label','Main sections');
 DOCK.forEach(([id,label,p])=>{const b=document.createElement('button');b.type='button';b.className='hd-di'+(id===on?' on':'');b.setAttribute('role','tab');b.setAttribute('aria-selected',id===on?'true':'false');b.dataset.dock=id;
  b.innerHTML=`${dockI(p)}<span>${label}</span>${id==='progress'&&dot?'<em class="dot" aria-hidden="true"></em>':''}`;if(id==='progress'&&dot)b.setAttribute('aria-label','Progress, new items');
  b.onclick=()=>{sfx('tap');homeTab(id)};nav.append(b)})}

/* ---------- header additions (all sections): settings gear; City: logo and level badge ---------- */
const BADGE=`<svg class="hd-badge" viewBox="0 0 40 40" aria-hidden="true"><defs><radialGradient id="hdbg" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="#3a4f86"/><stop offset="1" stop-color="#0d1838"/></radialGradient><linearGradient id="hdgd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0a8"/><stop offset=".5" stop-color="#f2c457"/><stop offset="1" stop-color="#a8721f"/></linearGradient></defs>
 <circle cx="20" cy="20" r="18" fill="url(#hdbg)" stroke="url(#hdgd)" stroke-width="3"/><path d="M20 9l3.3 6.8 7.4 1-5.4 5.2 1.3 7.4L20 25.9l-6.6 3.5 1.3-7.4-5.4-5.2 7.4-1z" fill="url(#hdgd)"/></svg>`;
const LOGO=`<div class="hd-logo" aria-hidden="true"><svg viewBox="0 0 100 36"><defs><linearGradient id="hdlg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0a8"/><stop offset=".55" stop-color="#e9b949"/><stop offset="1" stop-color="#9c6a1c"/></linearGradient></defs>
 <path fill="url(#hdlg)" d="M20 36V22h6v14zM28 36V14h7v22zM37 36V6l4-6 4 6v30zM47 36V10h7v26zM56 36V18h6v18zM64 36V24h5v12zM31 16h1v2h-1zM49 13h1v2h-1zM40 9h2v2h-2z"/><path d="M6 33c14-5 26-7 44-7s30 2 44 7" fill="none" stroke="url(#hdlg)" stroke-width="2"/></svg><b>SKYLINE ESTATES</b><span>BUILD · INVEST · GROW</span></div>`;
function hdHeader(city){const R=document.querySelector('#rprof');if(!R)return;
 if(!R.querySelector('.hd-gear')){const g=document.createElement('button');g.type='button';g.className='hd-gear';g.id='hdGear';g.setAttribute('aria-label','Settings');g.innerHTML=svgI('gear',20);g.onclick=()=>{sfx('tap');homeTab('settings')};R.append(g)}
 R.querySelector('.hd-gear').classList.toggle('on',(SEC_OF[setup.tab]||'')==='settings');
 if(city){if(!R.querySelector('.hd-badge')){const w=R.querySelector('#tbWho');if(w)w.insertAdjacentHTML('afterend',BADGE)}if(!R.querySelector('.hd-logo'))R.insertAdjacentHTML('beforeend',LOGO);
  const sm=R.querySelector('#tbWho .ri>b small');if(sm){const lv=lvlOf(PREF.xp);sm.textContent=`Level ${lv} ${rankOf(lv)}`}
  const tb=R.querySelector('#tbWho .ri>b');if(tb&&tb.querySelector('.rar'))tb.querySelector('.rar').remove()}}

/* ---------- City pane ---------- */
const PLAY=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg>`;
const PIN=`<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="hdpin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset="1" stop-color="#c88a22"/></linearGradient></defs><path d="M12 22s7-7.2 7-12.5A7 7 0 0 0 5 9.5C5 14.8 12 22 12 22z" fill="url(#hdpin)"/><circle cx="12" cy="9.5" r="2.6" fill="#1b2340"/></svg>`;
const LAUREL=`<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="hdlr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0a8"/><stop offset=".55" stop-color="#e9b949"/><stop offset="1" stop-color="#8a5a14"/></linearGradient></defs>
 <circle cx="32" cy="30" r="15" fill="#13204a" stroke="url(#hdlr)" stroke-width="2.5"/><path d="M32 20l3 6.3 6.9.9-5 4.8 1.2 6.8L32 35.6l-6.1 3.2 1.2-6.8-5-4.8 6.9-.9z" fill="url(#hdlr)"/>
 <g fill="url(#hdlr)"><path d="M14 18c-3 6-3 14 1 20l2-1c-3-6-3-13 0-18zM10 26c1 2 3 3 5 3-1-2-3-3-5-3zM10 33c1 2 3 3 5 2-1-2-3-3-5-2zM13 40c1 2 3 2 5 1-1-2-3-2-5-1zM12 20c0 2 1 4 3 4 0-2-1-4-3-4z"/>
 <path d="M50 18c3 6 3 14-1 20l-2-1c3-6 3-13 0-18zM54 26c-1 2-3 3-5 3 1-2 3-3 5-3zM54 33c-1 2-3 3-5 2 1-2 3-3 5-2zM51 40c-1 2-3 2-5 1 1-2 3-2 5-1zM52 20c0 2-1 4-3 4 0-2 1-4 3-4z"/><path d="M20 46c4 4 8 5 12 5s8-1 12-5l-2-1c-3 3-6 4-10 4s-7-1-10-4z"/></g></svg>`;
function hdCityPane(T){const saved=loadSave(),c=CITY_DATA[setup.city],C=countryOf(setup.city),idx=CITY_ORDER.indexOf(setup.city)+1,n=cityDone(setup.city),S=season(),t=seasonTierNow(),cl=seasonClaimable(),sp=spotNow();
 const showOnline=!(IS_APP&&!FIRE);
 const sv=saved?`<button class="hd-cont" id="tCont" type="button">${PLAY.replace('<svg','<svg width="14" height="14"')}<span>Continue</span><small>Round ${saved.round} · ${esc((CITY_DATA[saved.set&&saved.set.city]||CITY_DATA.lagos).name)}</small></button>`:'';
 let spot='';if(sp){const k=Math.min(SPOT_GOAL,spotCount(sp.id)),R=roofDef(sp.reward),lag=sp.city==='lagos'&&hdLagosArt,rewardArt=sp.reward==='golden-garden'?'art/golden-rooftop-garden.svg':null,ph=rewardArt||(lag?hdLagosArt:cityPhoto(sp.city)),ready=spotClaimable();
  spot=`<button class="hd-spot" id="hdSpot" type="button" aria-label="City Spotlight: ${esc(sp.cityName)}, ${k} of ${SPOT_GOAL} matches${R?', reward '+esc(R.name):''}"><span class="th${rewardArt?' garden':''}" style="${ph?`background-image:url(${ph})${lag&&!rewardArt?';background-size:430% auto;background-position:3% 86%':''}`:'background:#22325e'}"></span><span class="tx"><span class="tag">CITY SPOTLIGHT</span><b>${esc(sp.cityName)}</b><small>${ready?'Reward ready to claim':`${k} / ${SPOT_GOAL} matches →`}</small>${R?`<small class="rw">🎁 ${esc(R.name)}</small>`:''}</span><span class="go" aria-hidden="true">→</span></button>`}
 T.innerHTML=`<div class="hd-stage">
  <div class="hd-city"><small>${esc(C.name)} · City ${idx} of ${CITY_ORDER.length}</small><h1>${esc(c.name)}</h1><p>${esc(c.blurb)}</p><i></i></div>${sv}${spot}
  <div class="hd-modes" role="group" aria-label="Game modes">
   <button class="hd-mode m1" id="qAI" type="button"><span class="art" style="background-image:url(art/hd-dice.png)"></span><b>Play Solo</b><small>Take on the city at your pace</small><span class="pb">${PLAY}</span></button>
   <button class="hd-mode m2" id="qPP" type="button"><span class="art" style="background-image:url(art/hd-pawns.png)"></span><b>Pass &amp; Play</b><small>2 – 6 friends on this device</small><span class="pb">${PLAY}</span></button>
   ${showOnline?`<button class="hd-mode m3" id="tOnline" type="button"><span class="art" style="background-image:url(art/hd-globe.png)"></span><b>Play Online</b><small>Friends on their own devices</small><span class="pb">${PLAY}</span></button>`:''}
   <button class="hd-mode m4" id="qCustom" type="button"><span class="art" style="background-image:url(art/hd-checklist.png)"></span><b>Custom Game</b><small>Players, rules, modes</small><span class="pb">${PLAY}</span></button>
  </div>
  <button class="hd-panel hd-aw" id="hdAwards" type="button" aria-label="City awards ${n} of ${CT.length}">${LAUREL}<span class="tx"><small>City Awards</small><b>${n} / ${CT.length}</b><span class="bar"><i style="width:${n/CT.length*100}%"></i></span></span></button>
  <button class="hd-panel hd-chg" id="pCity" type="button">${PIN}<span>Change City</span></button><span class="hd-sep" aria-hidden="true"></span>
  <button class="hd-panel hd-season" id="qSeason" type="button" style="--sart:url(${S.n===2?'art/skyline-gala.svg':'art/shop.jpg'})" aria-label="Season ${S.n}, ${esc(seasonName(S.n))}, tier ${t} of ${TIERS}${cl?', '+cl+' rewards ready':''}"><span class="tx"><small>SEASON ${S.n}</small><b>${esc(seasonName(S.n))}</b></span>${cl?`<span class="rdy">${cl} ready</span>`:''}<span class="go" aria-hidden="true">→</span></button>
 </div>`;
 const q=s=>T.querySelector(s);
 q('#pCity').onclick=()=>{sfx('tap');homeTab('world')};
 if(saved)q('#tCont').onclick=()=>{initAudio();startWith(saved)};
 if(q('#tOnline'))q('#tOnline').onclick=()=>{initAudio();openOnline()};
 q('#qAI').onclick=()=>{const me=setup.slots[0];startFromSetup(T,setup.slots.map((s,i)=>({...s,type:i===0?'human':i<4?'ai':'off',tok:i===0?me.tok:s.tok})))};
 q('#qPP').onclick=()=>{setup.slots.forEach((s,i)=>s.type=i<2?'human':s.type==='human'?'off':s.type);homeTab('custom');toast('Set each friend to Human, then tap Start game')};
 q('#qCustom').onclick=()=>homeTab('custom');q('#qSeason').onclick=()=>homeTab('season');q('#hdAwards').onclick=()=>homeTab('ach');
 if(q('#hdSpot'))q('#hdSpot').onclick=()=>homeTab('spotlight')}

/* ---------- wiring ---------- */
const priorHomeTab=homeTab;
homeTab=function(k){const r=priorHomeTab.apply(this,arguments);try{const home=document.querySelector('#title .home');if(home){const city=setup.tab==='play';home.classList.toggle('hd-on',city);hdBackground(city);hdDock();hdHeader(city)}}catch(e){console.error(e)}return r};
const priorPaneP=paneP;
paneP=function(T){try{hdCityPane(T)}catch(e){console.error(e);return priorPaneP.apply(this,arguments)}};
const priorRail=railProfile;
railProfile=function(){const r=priorRail.apply(this,arguments);try{hdHeader(setup.tab==='play')}catch(e){}return r};
window.SkylineHome={dock:DOCK.map(d=>d[0])};
// The game shows its first screen before this file loads; redraw it once with the new layout.
try{const t=document.getElementById('title');if(t&&!t.hidden&&t.querySelector('.home'))homeTab(setup.tab||'play')}catch(e){console.error(e)}
})();


/* Collection Vault — visual navigation over the existing inventory, upgrade and avatar systems.
   The four displays use existing game records. This layer does not change entitlements or rules. */
(()=>{
'use strict';
const originalVaultTab=homeTab;
const VAULT_TABS=[['tokens','Token Vault','items/tok-crown.jpg','Inspect token rarity, powers and evolution'],
 ['buildings','Buildings','items/bld-5.jpg','Explore the six real development stages'],
 ['vault-worlds','Board Worlds','items/surr-garden.jpg','Discover cosmetic board environments'],
 ['frames','Prestige','items/surr-marble.jpg','Showcase earned avatar frames']];
const vaultStyle=document.createElement('style');
vaultStyle.id='skyline-collection-vault-style';
vaultStyle.textContent=[
'#title .home.hd-dock #pane.sec-collection{background:radial-gradient(circle at 50% 0%,rgba(24,80,87,.5),transparent 62%),linear-gradient(180deg,#071b2a,#0b1e32)!important}',
'#title .home.hd-dock #pane.sec-collection>.subtabs{display:none!important}',
'#title .home.hd-dock #pane.sec-collection>.subpane{width:100%!important;min-height:0!important;max-width:none!important;margin:0!important;padding:0 1px 24px!important;overflow:visible!important}',
'#title .home.hd-dock #pane.sec-collection>.subpane>.refdash{max-width:none}',
'#title .home.hd-dock .cv-shell{padding:clamp(12px,1.4vw,22px) clamp(10px,1.6vw,24px) 16px;background:linear-gradient(150deg,rgba(19,53,68,.96),rgba(9,29,47,.97));border:1px solid rgba(225,187,105,.55);border-radius:22px;margin:6px 0 18px;box-shadow:0 18px 40px #0005,inset 0 1px #ffffff22;color:#f7f2e6}',
'#title .cv-top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px}',
'#title .cv-top .cv-eyebrow{color:#e5bd71;font-weight:800;letter-spacing:.2em;font-size:11px;text-transform:uppercase}',
'#title .cv-top h2{font-size:clamp(23px,2.4vw,36px);line-height:1.14;margin:3px 0 4px;color:#fff9e8}',
'#title .cv-top p{color:#b8d0d2;margin:0;font-size:13px;line-height:1.4}',
'#title .cv-profile-link{min-height:44px;border:1px solid #d5ad68;border-radius:24px;padding:8px 17px;background:#152f40;color:#f5da9d;font-weight:800;cursor:pointer}',
'#title .cv-profile-link:hover,#title .cv-profile-link:focus-visible{background:#234958;outline:2px solid #f6d691;outline-offset:2px}',
'#title .cv-categories{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(7px,1vw,16px)}',
'#title .cv-category{position:relative;isolation:isolate;overflow:hidden;min-width:0;min-height:125px;padding:0;display:flex;align-items:flex-end;text-align:left;border:2px solid #5b6574;border-radius:17px;background:#102a38;box-shadow:0 8px 17px #0006;cursor:pointer;color:white;transition:transform .16s,box-shadow .16s,border-color .16s}',
'#title .cv-category img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.72;z-index:0}',
'#title .cv-category:after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,#061423 1%,#091e30aa 49%,transparent 100%);z-index:1}',
'#title .cv-category:hover{transform:translateY(-3px);border-color:#ffe09d;box-shadow:0 12px 23px #0009}',
'#title .cv-category:focus-visible{outline:3px solid #fff2bc;outline-offset:2px}',
'#title .cv-category[aria-selected="true"]{border-color:#f6ca70;box-shadow:0 0 0 1px #c38e3d,0 0 18px #d49b4773,inset 0 0 15px #fff2ba1c}',
'#title .cv-category .cv-copy{position:relative;z-index:2;display:block;width:100%;padding:36px 12px 12px}',
'#title .cv-category b{display:block;font-size:clamp(14px,1.35vw,19px);line-height:1.12;color:#fff9ef}',
'#title .cv-category small{display:block;margin-top:5px;color:#e2c68d;font-size:clamp(10px,.82vw,12px);font-weight:700}',
'#title .cv-world-intro{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin:7px 2px 18px}',
'#title .cv-world-intro h3{margin:0 0 5px;font-size:23px;color:#f8e4b8}',
'#title .cv-world-intro p{font-size:13px;color:#bcd2d4;max-width:650px;margin:0;line-height:1.5}',
'#title .cv-world-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}',
'#title .cv-world-card{background:linear-gradient(180deg,#153747,#0d2434);border:1px solid #396374;border-radius:17px;overflow:hidden;box-shadow:0 12px 22px #0004;min-width:0}',
'#title .cv-world-card.cv-equipped{border-color:#e6c16f}',
'#title .cv-world-art{position:relative;aspect-ratio:1.45;overflow:hidden;background:#102b38}',
'#title .cv-world-art img{display:block;width:100%;height:100%;object-fit:cover}',
'#title .cv-world-tag{position:absolute;left:10px;top:10px;border-radius:15px;background:#071927e8;border:1px solid #dfbd72;padding:5px 9px;color:#ffebbd;font-size:11px;font-weight:800}',
'#title .cv-world-body{padding:12px}',
'#title .cv-world-body h4{font-size:17px;margin:0 0 5px;color:#f8efd7}',
'#title .cv-world-body p{font-size:12px;line-height:1.4;color:#b9d1d4;margin:0 0 10px;min-height:34px}',
'#title .cv-world-foot{display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap}',
'#title .cv-world-foot b{font-size:11px;color:#f0cb80}',
'#title .cv-open-shop{min-height:40px;border-radius:17px;border:1px solid #dfb86b;background:#ddad55;color:#182638;font-size:12px;font-weight:800;padding:5px 12px;cursor:pointer}',
'#title .cv-world-note{font-size:12px;color:#a9c1c5;margin:14px 3px 3px}',
'#title .home.hd-dock:has(.trusted-lobby)>.rail,#title .home.hd-dock:has(.trusted-room-entry)>.rail{display:none!important}',
'#title .home.hd-dock:has(.trusted-lobby),#title .home.hd-dock:has(.trusted-room-entry){padding-bottom:0!important}',
'#title .cv-profile-back{margin:6px 8px 15px;min-height:42px;background:linear-gradient(90deg,#193749,#102a39);color:#e9c987;border:1px solid #d1ac69;border-radius:19px;padding:8px 17px;font-weight:800;cursor:pointer}',
'@media(max-width:850px){#title .cv-category{min-height:86px;border-radius:13px}#title .cv-category .cv-copy{padding:22px 7px 7px}#title .cv-category small{font-size:10px}#title .cv-categories{gap:6px}#title .cv-world-grid{grid-template-columns:repeat(2,minmax(0,1fr))}#title .cv-world-card{font-size:12px}#title .cv-top p{display:none}}',
'@media(max-width:530px){#title .cv-shell{padding:7px 8px;border-radius:13px;margin:2px 0 7px}#title .cv-top{margin-bottom:5px}#title .cv-top h2{font-size:17px;margin:1px 0}#title .cv-top .cv-eyebrow{font-size:9px}#title .cv-profile-link{min-height:40px;padding:5px 10px;font-size:11px}#title .cv-category{min-height:64px}#title .cv-category b{font-size:11px}#title .cv-category small{font-size:9px;margin-top:1px}#title .cv-category img{opacity:.5}#title .cv-world-intro h3{font-size:17px}#title .cv-world-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}}'
].join('\n');
document.head.appendChild(vaultStyle);

function vaultCount(id){
 if(id==='tokens'){const all=TOKENS.concat(NEW_TOKENS);return all.filter(tokenUnlocked).length+' / '+all.length+' owned';}
 if(id==='buildings')return BLD.length+' development stages';
 if(id==='vault-worlds')return SURROUND_PREMIUM.filter(it=>itemOwned('surr',it.id)).length+' / '+SURROUND_PREMIUM.length+' owned';
 if(id==='frames'){const all=frameIds().map(frameDef).filter(Boolean);return all.filter(f=>f.own).length+' / '+all.length+' unlocked';}
 return '';
}
function vaultWorlds(){
 const owned=SURROUND_PREMIUM.filter(it=>itemOwned('surr',it.id)).length;
 return '<section class="cv-worlds"><div class="cv-world-intro"><div><h3>Board Worlds</h3><p>Explore the actual cosmetic surrounds available in Skyline Estates. Ownership and unlock conditions come from your saved progress; scenery never changes the rules.</p></div><strong>'+owned+' / '+SURROUND_PREMIUM.length+' collected</strong></div><div class="cv-world-grid">'+
 SURROUND_PREMIUM.map(it=>{
  const own=itemOwned('surr',it.id),eq=equippedSurround()===it.id;
  const status=eq?'Equipped':own?'Owned':'Not owned';
  return '<article class="cv-world-card'+(eq?' cv-equipped':'')+'"><div class="cv-world-art"><img loading="lazy" decoding="async" src="items/surr-'+it.id+'.jpg" alt="'+esc(it.name)+' surround preview"><span class="cv-world-tag">'+status+'</span></div><div class="cv-world-body"><h4>'+esc(it.name)+'</h4><p>'+esc(it.desc)+'</p><div class="cv-world-foot"><b>'+esc(ITEM_RAR.surr[it.id]||'R')+' · '+(own?'In your collection':nfmt(it.price)+' coins')+'</b><button class="cv-open-shop" data-vault-shop="'+it.id+'" type="button">View in Shop</button></div></div></article>';
 }).join('')+'</div><p class="cv-world-note">Only existing premium surrounds appear here. Equip, preview or purchase them in the Shop.</p></section>';
}
function decorateVault(request,actual){
 const pane=document.querySelector('#title #pane'),home=document.querySelector('#title .home');
 if(!pane||!home)return;
 if(actual==='cast'){
  const back=document.createElement('button');back.type='button';back.className='cv-profile-back';back.textContent='← Back to Collection Vault';
  back.onclick=()=>homeTab('collection');pane.prepend(back);
  return;
 }
 if((SEC_OF[setup.tab]||setup.tab)!=='collection')return;
 const key=request==='vault-worlds'?'vault-worlds':actual;
 if(!['tokens','buildings','frames','vault-worlds'].includes(key))return;
 const host=pane.querySelector('.subpane')||pane;
 if(key==='vault-worlds'){
  clearPreview();peekOver(null);
  host.innerHTML=vaultWorlds();pane.classList.remove('tab-frames');pane.classList.add('tab-vault-worlds');
  host.querySelectorAll('[data-vault-shop]').forEach(btn=>btn.onclick=()=>{setup.shopTab='surr';setup.shopTabSet=1;homeTab('shop')});
 }
 const nav=document.createElement('section');nav.className='cv-shell';nav.setAttribute('aria-label','Collection Vault');
 nav.innerHTML='<div class="cv-top"><div><span class="cv-eyebrow">Your Collection</span><h2>Collection Vault</h2><p>Collect, unlock and showcase your Skyline Estates treasures.</p></div><button type="button" class="cv-profile-link">Customize Avatar ↗</button></div><nav class="cv-categories" aria-label="Collection categories" role="tablist">'+
 VAULT_TABS.map(([id,name,art])=>'<button class="cv-category" data-vault-tab="'+id+'" role="tab" aria-selected="'+(id===key)+'" type="button"><img src="'+art+'" alt="" loading="lazy"><span class="cv-copy"><b>'+name+'</b><small>'+vaultCount(id)+'</small></span></button>').join('')+'</nav>';
 pane.prepend(nav);
 nav.querySelector('.cv-profile-link').onclick=()=>homeTab('cast');
 nav.querySelectorAll('[data-vault-tab]').forEach(btn=>btn.onclick=()=>{sfx('tap');homeTab(btn.dataset.vaultTab)});
}
homeTab=function(k){
 const actual=k==='collection'?'tokens':k==='vault-worlds'?'frames':k;
 const result=originalVaultTab.call(this,actual);
 try{decorateVault(k,actual)}catch(e){console.error('Collection Vault view:',e)}
 return result;
};
window.SkylineCollectionVault={tabs:VAULT_TABS.map(x=>x[0])};
try{if(document.querySelector('#title .home')&&!document.querySelector('#title').hidden&&['collection','tokens','frames','buildings'].includes(SEC_OF[setup.tab]||setup.tab))homeTab(setup.tab)}catch(e){console.error(e)}
})();


/* Estate Album: integrates with existing Property Upgrade Center, never replaces it. */
(()=>{
'use strict';
const style=document.createElement('style');style.id='skyline-estate-album';
style.textContent=[
'#title .home.hd-dock #pane.sec-portfolio{background:linear-gradient(180deg,#0b2838,#081b2e)!important}',
'#title .em-hero{position:relative;isolation:isolate;display:flex;align-items:flex-end;justify-content:space-between;gap:16px;overflow:hidden;min-height:112px;padding:20px 24px;margin:0 0 12px;border:1px solid #dcb971;border-radius:20px;box-shadow:0 13px 32px #0006;color:#ffefd4;background:#123246}',
'#title .em-hero:before{content:"";position:absolute;inset:0;z-index:-2;background:var(--em-bg) center 54%/cover no-repeat;filter:saturate(1.1)}',
'#title .em-hero:after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,#071b2ded 0%,#0c2439d9 44%,#0c243953 75%),linear-gradient(0deg,#07152280,transparent 65%)}',
'#title .em-eyebrow{color:#efd095;font-weight:800;letter-spacing:.19em;font-size:11px;text-transform:uppercase}',
'#title .em-hero h2{font-size:clamp(24px,2.5vw,37px);margin:5px 0;color:#fff9ea;line-height:1.1}',
'#title .em-hero p{margin:4px 0;color:#c9e1dd;font-size:13px;max-width:510px;line-height:1.35}',
'#title .em-totals{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;align-items:center}',
'#title .em-total{background:#071927e6;min-width:100px;padding:10px 13px;border:1px solid #bb965c;border-radius:13px;text-align:center}',
'#title .em-total strong{display:block;color:#f6d38c;font-size:23px;line-height:1}',
'#title .em-total span{display:block;color:#bed5d5;font-size:11px;margin-top:5px}',
'#title .em-album{background:linear-gradient(155deg,#112f40,#092335);border:1px solid #36586b;border-radius:19px;margin-bottom:12px;padding:14px;box-shadow:0 10px 24px #0005}',
'#title .em-album-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}',
'#title .em-match-open{min-height:44px;padding:8px 14px;border:1px solid #bfa36f;border-radius:12px;background:#18354a;color:#f7d28d;font-size:12px;font-weight:800;white-space:nowrap;cursor:pointer}#title .em-match-open:hover{background:#295167}#title .em-match-open:focus-visible{outline:3px solid #ffe2ab;outline-offset:2px}',
'#title .em-album-head h3{font-size:18px;color:#f7e0aa;margin:0 0 3px}',
'#title .em-album-head p{font-size:12px;color:#a9c8cf;margin:0}',
'#title .em-album-head small{font-size:11px;color:#eac27c;text-align:right}',
'#title .em-album-row{display:flex;gap:11px;overflow-x:auto;scroll-snap-type:x proximity;padding:3px 3px 11px;scrollbar-color:#c7a25f #183244;scrollbar-width:thin}',
'#title .em-district{min-width:185px;flex:0 0 185px;display:flex;gap:9px;align-items:center;border:1px solid #43697b;border-radius:14px;padding:10px;text-align:left;background:linear-gradient(145deg,#1b4353,#0b2536);color:#e7f3f2;cursor:pointer;scroll-snap-align:start}',
'#title .em-district:hover{border-color:#ffe1a0;box-shadow:0 0 12px #f3cf7750}',
'#title .em-district:focus-visible{outline:3px solid #ffdf91;outline-offset:2px}',
'#title .em-district.is-current{border-color:#ebc678;box-shadow:inset 0 0 0 1px #e5c17880,0 0 13px #e2bb6245;background:linear-gradient(145deg,#285258,#142c39)}',
'#title .em-district img{width:66px;height:76px;object-fit:contain;flex:none;filter:drop-shadow(0 4px 7px #000b)}',
'#title .em-district .em-info{min-width:0;display:block;flex:1}',
'#title .em-district b{font-size:12px;display:block;margin-bottom:5px;line-height:1.25;overflow-wrap:anywhere}',
'#title .em-district .em-count{font-size:12px;color:#f2d28e;font-weight:800;white-space:nowrap}',
'#title .em-district .em-count em{font-style:normal;color:#b2cad1;font-weight:500;font-size:10px}',
'#title .em-pips{display:flex;gap:4px;margin:6px 0 2px}',
'#title .em-pips i{display:block;flex:1;max-width:16px;height:6px;border-radius:6px;background:#354b59;border:1px solid #638293}',
'#title .em-pips i.owned{background:linear-gradient(90deg,#c89b46,#ffe6a0);border-color:#e7bd68;box-shadow:0 0 5px #dfb06180}',
'#title .em-district .em-state{font-size:10px;color:#a9c8cd;display:block;margin-top:4px}',
'#title .em-district .em-state.ready{color:#f3d58e}',
'@media(max-width:850px){#title .em-hero{min-height:67px;padding:9px 12px;border-radius:13px;gap:8px;margin-bottom:8px}#title .em-hero h2{font-size:17px;margin:3px 0}#title .em-hero p{font-size:10px}#title .em-eyebrow{font-size:9px}#title .em-total{min-width:60px;padding:7px 8px;border-radius:9px}#title .em-total strong{font-size:15px}#title .em-total span{font-size:9px}#title .em-album{padding:8px;border-radius:12px}#title .em-album-head{margin-bottom:6px}#title .em-album-head h3{font-size:13px}#title .em-album-head p{font-size:10px}#title .em-album-row{gap:7px;padding-bottom:6px}#title .em-district{min-width:137px;flex-basis:137px;padding:5px;gap:5px;border-radius:9px}#title .em-district img{width:42px;height:48px}#title .em-district b{font-size:10px}#title .em-district .em-state{font-size:9px}}',
'@media(max-width:580px){#title .em-hero p{display:none}#title .em-album-head p{display:none}#title .em-hero .em-totals{gap:4px}#title .em-total{min-width:48px;padding:6px}#title .em-total span{font-size:8px}}',
'#title .em-match-open{min-height:44px;padding:8px 12px;border:1px solid #f1d08c;border-radius:12px;background:linear-gradient(#21495b,#133146);color:#ffe2a3;font:800 12px system-ui;white-space:normal;cursor:pointer;max-width:240px}',
'#title .em-match-open:hover{background:#2a596a}#title .em-match-open:focus-visible{outline:3px solid #fff3bf;outline-offset:2px}',
'@media(max-width:850px){#title .em-match-open{min-height:40px;font-size:10px;padding:6px 9px;max-width:unset}}'
].join('\n');
document.head.appendChild(style);
const previous=panePortfolio;
panePortfolio=function(T){
 const result=previous.apply(this,arguments);
 try{
  const snap=window.SkylineEstateSnapshot();
  const fastbar=T.querySelector('.rf-fastbar'),upgradeHub=!!T.querySelector('.rf-fast-hub');
  if(fastbar){
   if(snap.hasSavedMatch){
    const link=document.createElement('button');
    link.type='button';link.className='em-match-open';
    link.setAttribute('aria-label','Resume saved match and open property building manager');
    link.textContent='Manage match buildings ↗';
    link.onclick=()=>window.SkylinePortfolioManageMatchBuildings();
    (fastbar.querySelector('.rf-fast-controls')||fastbar).append(link);
   }
   T.prepend(fastbar);
  }
  /* The Gallery is an overview, not a competing Upgrade Center screen.
     Keep the latter one click away at the top of every Portfolio view. */
  if(snap.tab!=='portfolio'||(snap.mobile&&snap.mobilePage!=='districts')||upgradeHub)return result;
  const districts=snap.groups,complete=snap.complete;
  const hero=document.createElement('section');hero.className='em-hero';
  hero.style.setProperty('--em-bg',"url('"+snap.photo+"')");
  hero.setAttribute('aria-label','Estate overview');
  hero.innerHTML='<div><span class="em-eyebrow">Your Property Empire · '+esc(snap.cityName)+'</span><h2>My Estate</h2><p>Explore your districts, inspect every property and grow your collection.</p></div>'+
   '<div class="em-totals"><div class="em-total"><strong>'+snap.ownedCount+'</strong><span>Owned this game</span></div><div class="em-total"><strong>'+complete+' / '+districts.length+'</strong><span>Complete sets</span></div></div>';
  const album=document.createElement('section');album.className='em-album';
  album.setAttribute('aria-label','District property album');
  const cards=districts.map(d=>{
   const have=d.rows.filter(r=>r.owned),show=have[0]||d.rows[0],
    level=Math.min(5,Math.max(0,show?.h||0)),completeSet=have.length===d.rows.length;
   return '<button class="em-district'+(snap.current===d.id?' is-current':'')+'" type="button" data-em-district="'+esc(d.id)+'" aria-label="'+esc(d.name)+', '+have.length+' of '+d.rows.length+' properties owned">'+
    '<img src="'+bldPic(level)+'" alt="" loading="eager" decoding="async"><span class="em-info"><b>'+esc(d.name)+'</b><span class="em-count">'+have.length+' / '+d.rows.length+' <em>owned</em></span>'+
    '<span class="em-pips">'+d.rows.map(r=>'<i class="'+(r.owned?'owned':'missing')+'" aria-hidden="true"></i>').join('')+'</span><span class="em-state'+(completeSet?' ready':'')+'">'+(completeSet?'Set complete ✓':have.length?'Keep building':'Properties to discover')+'</span></span></button>';
  }).join('');
  album.innerHTML='<header class="em-album-head"><div><h3>District Property Album</h3><p>Gold slots are owned properties; dark slots are still missing.</p></div><small>'+complete+' of '+districts.length+' sets complete</small></header><div class="em-album-row">'+cards+'</div>';
  T.prepend(album);
  if(fastbar)T.prepend(fastbar);
  T.prepend(hero);
  album.querySelectorAll('[data-em-district]').forEach(btn=>btn.onclick=()=>{
   window.SkylinePortfolioNavigateDistrict(btn.dataset.emDistrict);
  });
 }catch(e){console.error('Estate Album integration:',e)}
 return result;
};
/* Keep all six dock destinations readable and touch-accessible on narrow portrait phones. */
const portraitDock=document.createElement('style');
portraitDock.id='skyline-portrait-dock';
portraitDock.textContent='@media(max-width:480px) and (orientation:portrait){'+
'#title .home.hd-dock>.rail{width:calc(100vw - 8px)!important;min-width:0!important;max-width:none!important;height:58px!important;min-height:58px!important;padding:2px 4px!important;gap:0!important;border-radius:29px!important}'+
'#title .home.hd-dock .hd-di{flex:1 1 0!important;max-width:none!important;min-width:0!important;width:auto!important;margin:0!important;padding:3px 0!important;height:calc(100% - 4px)!important;min-height:44px!important;font-size:8px!important;letter-spacing:0!important;line-height:1.05!important;gap:3px!important;white-space:nowrap!important;border-radius:22px!important}'+
'#title .home.hd-dock .hd-di svg{width:18px!important;height:18px!important;flex:none!important}'+
'#title .home.hd-dock .hd-di+.hd-di:before{left:-1px!important}'+
'#title .home.hd-dock .hd-di .dot{right:7px!important;top:5px!important}'+
'#title .home.hd-dock #pane{padding-bottom:72px!important}'+
'}';
document.head.appendChild(portraitDock);
window.SkylineEstateAlbum={version:2,integrated:true};
})();
