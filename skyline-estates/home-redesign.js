/* Skyline Estates home screen (owner-approved reference, 31 Oct 2026).
   Presentation only: every value comes from existing game state and every control calls an existing
   action (startFromSetup, openOnline, homeTab, startWith). No rules, saves, rewards or prices change.
   - City tab: cinematic stage laid out on a 16:9 frame (1 --hd-u = 1% of the frame width).
   - All main menu sections: the left rail becomes a bottom navigation dock; Settings moves to the header. */
(()=>{
'use strict';
const HD_BG_LAGOS='art/home-lagos.jpg';
let hdLagosArt=null;{const i=new Image();i.onload=()=>{hdLagosArt=HD_BG_LAGOS;const b=document.querySelector('#title .hd-bg');if(b&&hdCityKey()==='lagos')hdPaintBg(b)};i.src=HD_BG_LAGOS}
const hdCityKey=()=>{const c=setup.city;return CITY_DATA[c]&&countryOf(c)&&countryOf(c).key==='ng'&&/^(lagos|beach|night)$/.test(c)?'lagos':c};
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
#title .home.hd-on .hd-bg.art .hd-photo{filter:none}
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
#title .hd-city{left:calc(9.3*var(--hd-u));top:calc(13.9*var(--hd-u));width:max-content;max-width:calc(21*var(--hd-u));pointer-events:none}
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
 background:linear-gradient(90deg,rgba(14,20,56,.97) 0%,rgba(30,22,74,.9) 45%,rgba(30,22,74,.2) 75%),var(--sart) right center/60% auto no-repeat,#140f36}
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
 #title .hd-mode .art{height:calc(7.2*var(--hd-u));top:calc(-1.6*var(--hd-u))}
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
 let spot='';if(sp){const k=Math.min(SPOT_GOAL,spotCount(sp.id)),R=roofDef(sp.reward),ph=cityPhoto(sp.city),ready=spotClaimable();
  spot=`<button class="hd-spot" id="hdSpot" type="button" aria-label="City Spotlight: ${esc(sp.cityName)}, ${k} of ${SPOT_GOAL} matches${R?', reward '+esc(R.name):''}"><span class="th" style="${ph?`background-image:url(${ph})`:'background:#22325e'}"></span><span class="tx"><span class="tag">CITY SPOTLIGHT</span><b>${esc(sp.cityName)}</b><small>${ready?'Reward ready to claim':`${k} / ${SPOT_GOAL} matches →`}</small>${R?`<small>🎁 ${esc(R.name)}</small>`:''}</span><span class="go" aria-hidden="true">→</span></button>`}
 T.innerHTML=`<div class="hd-stage">
  <div class="hd-city"><small>${esc(C.name)} · City ${idx} of ${CITY_ORDER.length}</small><h1>${esc(c.name)}</h1><p>${esc(c.blurb)}</p><i></i></div>${sv}${spot}
  <div class="hd-modes" role="group" aria-label="Game modes">
   <button class="hd-mode m1" id="qAI" type="button"><span class="art" style="background-image:url(art/hd-dice.png)"></span><b>Play Solo</b><small>Take on the city at your pace</small><span class="pb">${PLAY}</span></button>
   <button class="hd-mode m2" id="qPP" type="button"><span class="art" style="background-image:url(art/hd-pawns.png)"></span><b>Pass &amp; Play</b><small>2 – 6 friends on this device</small><span class="pb">${PLAY}</span></button>
   ${showOnline?`<button class="hd-mode m3" id="tOnline" type="button"><span class="art" style="background-image:url(art/hd-globe.png)"></span><b>Play Online</b><small>Friends on their own devices</small><span class="pb">${PLAY}</span></button>`:''}
   <button class="hd-mode m4" id="qCustom" type="button"><span class="art" style="background-image:url(art/hd-sliders.png)"></span><b>Custom Game</b><small>Players, rules, modes</small><span class="pb">${PLAY}</span></button>
  </div>
  <button class="hd-panel hd-aw" id="hdAwards" type="button" aria-label="City awards ${n} of ${CT.length}">${LAUREL}<span class="tx"><small>City Awards</small><b>${n} / ${CT.length}</b><span class="bar"><i style="width:${n/CT.length*100}%"></i></span></span></button>
  <button class="hd-panel hd-chg" id="pCity" type="button">${PIN}<span>Change City</span></button><span class="hd-sep" aria-hidden="true"></span>
  <button class="hd-panel hd-season" id="qSeason" type="button" style="--sart:url(art/shop.jpg)" aria-label="Season ${S.n}, ${esc(seasonName(S.n))}, tier ${t} of ${TIERS}${cl?', '+cl+' rewards ready':''}"><span class="tx"><small>SEASON ${S.n}</small><b>${esc(seasonName(S.n))}</b></span>${cl?`<span class="rdy">${cl} ready</span>`:''}<span class="go" aria-hidden="true">→</span></button>
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
