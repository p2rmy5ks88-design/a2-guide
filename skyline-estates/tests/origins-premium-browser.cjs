/* Skyline Origins approved-art re-anchor.
   Renders the ACTUAL 40-space Classic board in an isolated visual-review
   iframe with premium HUD and richer 3D city. No production bundle mutation. */
'use strict';
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const engine=process.env.VISUAL_ENGINE==='webkit'?'webkit':'chromium';
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg','.woff2':'font/woff2'};
(async()=>{
 const server=http.createServer((q,r)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(q.url.split('?')[0]));
  if(!file.startsWith(root+path.sep)){r.writeHead(403).end();return}
  fs.readFile(file,(err,buf)=>{r.writeHead(err?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});r.end(err?'missing':buf)});
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await ({chromium,webkit}[engine]).launch({
  headless:true,...(engine==='chromium'?{executablePath:process.env.CHROME_PATH||undefined,
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{})
 });
 const out=process.env.ORIGINS_SHOTS||null;
 let checks=0;
 try{
  for(const vp of [{name:'iphone-retina',width:956,height:440,dpr:3},{name:'small-landscape',width:844,height:390,dpr:3},{name:'desktop',width:1366,height:768,dpr:1}]){
   const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:vp.dpr,hasTouch:vp.dpr>1,serviceWorkers:'block',reducedMotion:'reduce'});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',err=>errors.push('wrapper: '+String(err)));
   await context.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:')?route.continue():route.abort());
   await context.addInitScript(()=>{
    localStorage.setItem('skylinePrefs',JSON.stringify({nick:'Origins QA',nickSet:true,welcomed:1,tutDone:1,xp:3000,
     flat2d:false,rig:false,ui:'dark',coach:{on:false},coachOff:1,stats:{games:5}}));
   });
   await page.goto('http://127.0.0.1:'+server.address().port+'/skyline-estates/origins-premium-lab.html',{waitUntil:'load'});
   const frame=page.frameLocator('#originsGame');
   await frame.locator('#boot').waitFor({state:'detached',timeout:60000});
   await frame.locator('html.origins-premium-v1').waitFor({timeout:15000});
   const subframe=page.frames().find(f=>f.url().includes('/skyline-estates/index.html'));
   assert(subframe,'the real existing Skyline Estates game is embedded');
   subframe.on('pageerror',e=>errors.push('game: '+String(e)));
   const initial=await subframe.evaluate(()=>{
    FAST=true;GEN++;
    newGame({lc:true,cash:1600,set:{city:'skyline',mode:'timed',rounds:30,ai:'normal',career:'origins'},
     players:['Origins QA','Kofi','Mei','Lucas'].map((name,i)=>({name,tok:TOKENS[i],col:PCOL[i],ai:i>0}))});
    const groups=Object.keys(GROUPS);
    groups.forEach((g,k)=>GROUPS[g].forEach((i,j)=>{G.own[i]={o:k%4,h:j===0?Math.min(5,k%5+1):1,m:false}}));
    G.round=8;G.turn=0;G.phase='pre';
    FAST=false;document.querySelector('#title').hidden=true;document.querySelector('#ui').hidden=false;
    applyTheme('beach');buildBoard();
    for(let i=0;i<40;i++)updateCell(i);
    renderRoster();camOverview(0,0);
    // The real game button builder supplies the roll control and a correct
    // player prompt; this review fixture never casts dice or writes a save.
    void actions('<b>Origins QA</b>, your turn.',[{k:'roll',label:'Roll dice',primary:true}]);
    return {props:G.own.length,players:G.players.length,state:JSON.stringify({players:G.players,own:G.own,round:G.round,turn:G.turn}),
     saves:Object.fromEntries(['skylineCircuitSave','skylineCircuitTabletopRebootSave'].map(k=>[k,localStorage.getItem(k)]))};
   });
   assert.equal(initial.props,40,'the board uses all original 40 Skyline Origins spaces');
   assert.equal(initial.players,4,'the four original gameplay seats remain');
   const review=await subframe.evaluate(()=>{
    const before=JSON.stringify({players:G.players,own:G.own,round:G.round,turn:G.turn});
    const res=window.SkylineOriginsPremiumLab.refresh();
    const tokenChildren=tok3.map(t=>t?.kids.length||0);
    const tokenTypes=tok3.map(t=>t?.originsPremiumIdentity?.kids?.[3]?.kids?.[2]?.geo);
    window.SkylineOriginsPremiumLab.refresh();
    const markersStable=tok3.every((t,i)=>!!t?.originsPremiumIdentity&&t.kids.length===tokenChildren[i]);
    const markersUnique=new Set(tokenTypes).size===4;
    const after=JSON.stringify({players:G.players,own:G.own,round:G.round,turn:G.turn});
    const board=S3.boardCanvas,canvas=document.querySelector('#gl');
    return {...res,markersStable,markersUnique,sameGame:before===after,rootClass:document.documentElement.classList.contains('origins-premium-v1'),
     water:THEMES.beach.water,cell:BOARDS.beach.cell,mark:!!document.querySelector('#originsPremiumMark'),
     harbourCount:S3.centers.beach?.originsHarbourCount||0,
     neighbourhoodCount:S3.centers.beach?.originsTownhouses||0,
     waterTexture:!!S3.originsWaterTex&&S3.waterMat.tex===S3.originsWaterTex,
     screenMarkerCount:document.querySelectorAll('#originsTokenMarkers .originsTokenBadge').length,
     oversizedIslandVisible:ROOT.kids.some(n=>n.visible!==false&&(n.mat===S3.islandMat||n.mat===S3.rimMat)),
     stats:document.querySelector('#originsPremiumStats')?.textContent,
     expectedCash:typeof fmt==='function'?fmt(G.players[0].cash):null,
     premiumCameraPitch:camT.pitch,
     rollBackground:getComputedStyle(document.querySelector('#acts .bigb')).backgroundImage,
     roster:document.querySelectorAll('#roster .pcard').length,
     gameView:{w:canvas.width,h:canvas.height,cssw:canvas.clientWidth,cssh:canvas.clientHeight},
     gameKeys:Object.fromEntries(['skylineCircuitSave','skylineCircuitTabletopRebootSave'].map(k=>[k,localStorage.getItem(k)]))};
   });
   assert.equal(review.ready,true,'actual WebGL scene initialized');
   assert.equal(review.buildings,15,'fifteen additional distinct landmark buildings surround the civic plaza');
   assert.equal(review.harbourCount,15,'fifteen real waterfront backdrop towers accompany the main board');
   assert.equal(review.neighbourhoodCount,8,'eight residential buildings enrich the real 3D city');
   assert(review.waterTexture,'the existing 3D ocean mesh has a rippled teal/gold water texture');
   assert.equal(review.screenMarkerCount,4,'all four real player pieces receive camera-projected labels');
   assert.equal(review.oversizedIslandVisible,false,'the oversized polygon no longer covers the blue water surrounding the 40-space square');
   assert(Math.abs(review.premiumCameraPitch-.62)<.005,'default Origins camera is lower and more isometric for stronger building depth');
   assert(review.rollBackground.includes('239, 103, 102'),'approved red Roll Dice action overrides the original gold theme: '+review.rollBackground);
   assert.equal(review.sameGame,true,'visual refresh never changes ownership, players or turns');
   assert.equal(review.rootClass,true,'premium look only activates inside the isolated lab');
   assert.equal(review.water,'#0c5578','approved deep-blue water is used in actual 3D game materials');
   assert.equal(review.cell,'#fff0d6','ivory board tiles have a richer luxury palette');
   assert.equal(review.mark,true);
   assert.equal(review.roster,4);
   assert.equal(review.tokens,4,'four actual moving pieces have strong physical identifiers');
   assert(review.markersStable,'visual refresh does not duplicate token geometry');
   assert(review.markersUnique,'all four markers are different 3D silhouette shapes');
   assert(review.stats.includes('Properties')&&review.stats.includes('Skyline Cash'),'the new live HUD reads real match values');
   assert(review.stats.includes(review.expectedCash),'new portfolio uses the same actual displayed currency units as the original roster');
   assert.deepEqual(review.gameKeys,initial.saves,'the premium visual patch writes neither the Board 1 nor Circuit saves');
   assert(review.gameView.w/review.gameView.cssw>=(vp.dpr>1?1.7:.9),
     'WebGL backing resolution is suitable for the tested DPR tier: '+JSON.stringify(review.gameView));
   checks+=22;
   await page.waitForTimeout(5200); // let legitimate achievement popups clear before the layout snapshot
   assert.equal(await frame.locator('#acts .bigb').count(),1,'the actual game Roll Dice action is visible inside the styled HUD');checks++;
   const markerLayout=await subframe.evaluate(()=>{
    const chips=Array.from(document.querySelectorAll('#originsTokenMarkers .originsTokenBadge'));
    const rects=chips.filter(el=>!el.hidden).map(el=>el.getBoundingClientRect());
    const noOverlap=rects.every((a,i)=>rects.slice(i+1).every(b=>
     a.right<=b.left+1||b.right<=a.left+1||a.bottom<=b.top+1||b.bottom<=a.top+1));
    return {visible:rects.length,noOverlap,
     inViewport:rects.every(v=>v.left>=0&&v.top>=0&&v.right<=innerWidth&&v.bottom<=innerHeight)};
   });
   assert.equal(markerLayout.visible,4,'all four player labels are visible');
   assert(markerLayout.noOverlap,'grouped token labels must not overlap: '+JSON.stringify(markerLayout));
   assert(markerLayout.inViewport,'all player labels fit within landscape: '+JSON.stringify(markerLayout));
   checks+=3;
   const boardFrame=await subframe.evaluate(()=>{
    const m=CAMM.vp,cv=document.querySelector('#gl'),r=cv.getBoundingClientRect();
    const corners=[];
    for(const x of [-6.3,6.3])for(const z of [-6.3,6.3]){
     const a=m[0]*x+m[8]*z+m[12],b=m[1]*x+m[9]*z+m[13],
      w=m[3]*x+m[11]*z+m[15];
     corners.push({x:r.left+(a/w+1)*.5*r.width,
      y:r.top+(1-b/w)*.5*r.height});
    }
    return {mode:camMode,target:camT.L,actual:camS.L,corners,
     fullPerimeter:corners.every(p=>p.x>=5&&p.x<=innerWidth-5&&
       p.y>=6&&p.y<=innerHeight-8)};
   });
   assert.equal(boardFrame.mode,'board','Origins default is a stable full-perimeter strategy camera');
   assert(boardFrame.fullPerimeter,'all four original board corners fit on iPhone Safari: '+JSON.stringify(boardFrame));
   assert(Math.abs(boardFrame.target-19.4)<.15,'default 3D camera should not revert to clipped overview: '+JSON.stringify(boardFrame));
   checks+=3;
   const cover=await subframe.evaluate(()=>{
    const r1=document.querySelector('#roster').getBoundingClientRect(),
      r2=document.querySelector('#originsPremiumStats').getBoundingClientRect(),
      act=document.querySelector('#acts').getBoundingClientRect(),
      mark=document.querySelector('#originsPremiumMark').getBoundingClientRect();
    return {separate:r1.top>=r2.bottom,view:r2.right<=innerWidth+1,act:act.right<=innerWidth+1&&act.bottom<=innerHeight+2,
      mark:mark.right<innerWidth/2};
   });
   assert(cover.separate&&cover.view&&cover.act&&cover.mark,'premium HUD elements are positioned without cutting off gameplay edges: '+JSON.stringify(cover));
   checks++;
   if(out){
    fs.mkdirSync(out,{recursive:true});
    const file=path.join(out,engine+'-'+vp.name+'.png');
    // A clean, real gameplay frame: suppress only a transient trophy toast
    // created by test-fixture construction. It is not part of the default HUD,
    // and removing the test toast does not affect the game state.
    await subframe.evaluate(()=>{
      const guard=document.createElement('style');guard.id='origins-qa-hide-transient';
      guard.textContent='.achpop{visibility:hidden!important}';
      document.head.appendChild(guard);
    });
    // Exclude the review-only watermark, never the authoritative game view.
    await page.locator('#reviewLabel').evaluate(el=>el.hidden=true);
    await page.screenshot({path:file,fullPage:false});
    await page.locator('#reviewLabel').evaluate(el=>el.hidden=false);
    await subframe.evaluate(()=>document.querySelector('#origins-qa-hide-transient')?.remove());
    const buf=fs.readFileSync(file);
    assert.equal(buf.readUInt32BE(16),vp.width*vp.dpr,'screenshot is actually captured in Retina device pixels');
    assert.equal(buf.readUInt32BE(20),vp.height*vp.dpr,'screenshot height retains landscape Retina pixels');
    checks+=2;
   }
   if(vp.name==='desktop'){
    await subframe.evaluate(()=>{void playTurn(G.players[0])});
    const roll=frame.getByRole('button',{name:'Roll dice'});
    await roll.click({timeout:15000});
    await subframe.waitForFunction(()=>G.players[0].pos!==0,null,{timeout:20000});
    checks++;
   }
   assert.equal(errors.length,0,'no JavaScript exceptions: '+errors.join('; '));
   checks++;
   await context.close();
  }
 }finally{await browser.close();await new Promise(r=>server.close(r))}
 console.log('PASS: Skyline Origins '+engine+' premium real-3D visual preview · '+checks+' assertions');
})().catch(e=>{console.error(e);process.exitCode=1});
