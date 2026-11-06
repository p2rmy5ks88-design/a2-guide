/* Native validation probe (CI only, never shipped): each app launch shows the next Living City scene so the
   simulator/emulator can screenshot it. Inserted into www/index.html by scripts/inject-native-probe.sh. */
(function(){var K='lcProbeStep',n=+(localStorage.getItem(K)||0);localStorage.setItem(K,String(n+1));
 var L=[['dark','board'],['light','board'],['dark','review'],['light','card'],['dark','dev'],['light','landmark']];
 if(/iPhone|iPad/.test(navigator.userAgent))L=[['dark','dev'],['light','landmark'],['light','dev'],['dark','landmark']].concat(L);
 var S=L[n%L.length];
 // CI emulators have no GPU: on Android only the first scene uses the 3D board; the rest use the 2D board (same state).
 var flat=/Android/.test(navigator.userAgent)&&n%6!==0;
 localStorage.setItem('skylinePrefs',JSON.stringify({nick:'Ada',nickSet:true,welcomed:1,tutDone:1,stats:{games:9},city:'lagos',ui:S[0],lc:true,flat2d:flat}));
 function go(){if(document.getElementById('boot')||typeof homeTab!=='function'){return setTimeout(go,500)}
  homeTab('play');document.querySelector('#qAI').click();setTimeout(function(){try{GEN++;document.querySelector('#modals').innerHTML='';var me=G.players[0];me.ai=false;G.turn=0;
   var gr=GROUPS.sky;gr.forEach(function(j,k){G.own[j].o=0;G.own[j].h=[5,3,2][k];G.own[j].m=false});G.lm={sky:{i:gr[0],pid:0}};
   GROUPS.pink.forEach(function(j,k){G.own[j].o=1;G.own[j].h=[1,1,0][k]});G.houses=36-7-2;G.hotels=11;
   G.ev2={v:1,id:'fest',kind:'rent',pct:50,from:G.round,rounds:2,targets:GROUPS.pink.slice(),group:'pink',name:'Eyo Festival',area:'Surulere',city:'lagos'};G.set.events2=true;
   for(var i=0;i<40;i++)if(buyable(i))updateCell(i);if(window.SkylineLivingCity3D)SkylineLivingCity3D.all();ev2Chip();if(typeof camOverview==='function')camOverview(8,0);
   if(S[1]==='review'){me.cr={from:1,why:'audit'};lcReviewTurn(me)}
   if(S[1]==='card'){G.chance=[5].concat(G.chance.filter(function(x){return x!==5}));drawCard(me,'chance',[2,3])}
   if(S[1]==='dev'){openAssets(me)}
   if(S[1]==='landmark'){GROUPS.green.forEach(function(j){G.own[j].o=0;G.own[j].m=false});G.lmAsked={};lcOfferLandmarks(me)}
   document.title='PROBE '+S.join('-')}catch(e){document.title='PROBE ERROR '+e}},4000)}
 setTimeout(go,1500)})();
