/* Daylight on the Career boards (owner request 24 Nov 2026): when Settings → Colour theme is Daylight, the panels,
   buttons and menus of City Ventures, Crossroads Capital, Skyline Dominion and Crown Empire turn white and gold,
   like the classic game. The 3D boards themselves are unchanged. */
(function(){'use strict';
let ui='dark';try{ui=(JSON.parse(localStorage.getItem('skylinePrefs')||'{}').ui)||'dark'}catch(e){}
if(ui!=='light')return;
document.documentElement.classList.add('light');
const css=`
html.light{color-scheme:light;--panel:linear-gradient(160deg,#fffffff5,#f3f6faf5);--ink:#13284a}
html.light .panel,html.light #side>section,html.light #side>#actionbox,html.light #property,html.light #actionbox,html.light #holdings,
html.light #players .pl,html.light .pill,html.light #finish .box,html.light #boardGuide,html.light dialog{
 background:linear-gradient(160deg,#fffffff5,#f3f6faf5)!important;color:#13284a!important;border-color:#c9a24a!important;box-shadow:0 6px 18px #13284a2e!important}
html.light .panel *,html.light #side *,html.light #players .pl *,html.light .pill,html.light #finish .box *,html.light #boardGuide *,html.light #menu *,html.light #rules *,html.light #portfolio *{color:inherit}
html.light .panel h1,html.light .card h1,html.light #finish h2,html.light #boardGuide b,html.light #holdings .hh b{color:#9a6c12!important}
html.light .card h3,html.light #rules h3{color:#9a6c12!important}
html.light .panel small,html.light .card p,html.light .pft .hd,html.light .pfg h4 span,html.light .pft .sale,html.light #boardGuide .n{color:#526781!important}
html.light .btn:not(.primary),html.light #side button:not(.roll):not(.buy):not(.end),html.light #menuBtn,html.light #cameraButtons button:not(.active),html.light #sideToggle,html.light #boardGuide button:not(.ok),html.light #finish .sumBtns button:not(#returnCareer){
 background:linear-gradient(#ffffff,#eef2f7)!important;color:#13284a!important;border-color:#c9a24a!important}
html.light .screen{background:radial-gradient(circle at 50% 30%,#ffffffd9,#e9eef4f2)!important}
html.light #setup{background:radial-gradient(ellipse at 50% 40%,#ffffff,#e3e9f1 85%)!important}
html.light #setup .setupCard{background:#fff!important;color:#13284a!important}html.light #setup h1{color:#9a6c12!important}html.light #setup p,html.light #setup .muted{color:#526781!important}
html.light #setup select{background:#fff!important;color:#13284a!important}
html.light #bottom .player-chip{background:linear-gradient(135deg,color-mix(in srgb,var(--seat) 18%,#fff),#fff)!important;color:#13284a!important}
html.light .pfg{background:#13284a0d!important}
html.light #holdings .pip{border-color:#13284a55}
html.light #standings b,html.light #finish .sumGrid b,html.light #finish .sumRank b{color:#8a6414!important}
html.light #finish .sumGrid,html.light #finish .sumRank{background:#13284a0d!important}
html.light #holdings .g .nm,html.light #players .pl b{color:#13284a!important}
html.light #players .pl span{color:#8a6414!important}html.light #players .pl small,html.light #players .pl .val{color:#526781!important}
html.light .opt:not(.pri){background:#fff!important;color:#13284a!important;border-color:#c9a24a!important}html.light .opt:not(.pri) small{color:#526781!important}
html.light .opt.pri small{color:#3a2a08!important}
html.light #decision .tag,html.light .panel .tag{color:#526781!important}
html.light body,html.light #shell,html.light #bg{background:linear-gradient(180deg,#f6f8fb,#e3e9f1)!important}
html.light #gameName,html.light #heading h1{color:#13284a!important}html.light #subtitle,html.light #heading small{color:#9a6c12!important}
html.light #notice,html.light #toast{background:#ffffffee!important;color:#13284a!important;border-color:#c9a24a!important}`;
const st=document.createElement('style');st.id='board-daylight';st.textContent=css;
(document.head||document.documentElement).append(st);
})();
