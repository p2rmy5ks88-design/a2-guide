// Living Board look (Phase 2): presentation-only checks on the real 3D board in Chromium (SwiftShader WebGL).
// Covers: Golden Hour follows the dark theme and Daylight the light theme, sun-following building shadows,
// owner-coloured plot rims, district symbols on the board texture, corner token spacing, and that none of it
// changes the match state. Not a physical-device or GPU performance test.
'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path'),http=require('node:http'),fs=require('node:fs');
const root=path.resolve(__dirname,'..','..');
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json','.mp3':'audio/mpeg','.glb':'model/gltf-binary','.woff2':'font/woff2'};
let n=0;const ok=m=>{n++;console.log('PASS',m)};
(async()=>{
 const server=http.createServer((q,r)=>{const f=path.resolve(root,'.'+decodeURIComponent(q.url.split('?')[0]));if(!f.startsWith(root)){r.writeHead(403);return r.end()}fs.readFile(f,(e,b)=>{r.writeHead(e?404:200,{'content-type':types[path.extname(f)]||'application/octet-stream'});r.end(e?'':b)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const errors=[];
 try{
  const ctx=await browser.newContext({viewport:{width:852,height:393},deviceScaleFactor:2,hasTouch:true,isMobile:true,serviceWorkers:'block'});
  const p=await ctx.newPage();p.on('pageerror',e=>errors.push(String(e)));
  await p.addInitScript(()=>localStorage.setItem('skylinePrefs',JSON.stringify({nick:'QA',nickSet:true,welcomed:1,tutDone:1,xp:3000,flat2d:false,rig:false,ui:'dark',coach:{on:false},stats:{games:5}})));
  await p.route('https://**/*',r=>r.abort());
  await p.goto(`http://127.0.0.1:${server.address().port}/skyline-estates/index.html`);
  await p.locator('#boot').waitFor({state:'detached',timeout:60000});
  assert.equal(await p.evaluate(()=>typeof window.SkylineBoardLook),'object','look module loaded');
  const setup=await p.evaluate(()=>{FAST=true;GEN++;newGame({lc:true,cash:1600,set:{city:'lagos',mode:'timed',rounds:30,championship:1,ai:'normal'},players:['QA','Kofi','Mei','Lucas'].map((x,k)=>({name:x,tok:TOKENS[k],col:PCOL[k],ai:k>0}))});
    const gs=Object.keys(GROUPS);gs.forEach((g,k)=>GROUPS[g].forEach(i=>G.own[i]={o:k%4,h:[1,2,3,4,0,1,2,3][k],m:false}));G.own[GROUPS[gs[4]][0]].m=true;
    FAST=false;document.querySelector('#title').hidden=true;document.querySelector('#ui').hidden=false;buildBoard();for(let i=0;i<40;i++)updateCell(i);renderRoster();camOverview(0,0);
    return JSON.stringify({own:G.own,players:G.players.map(q=>[q.cash,q.pos]),round:G.round})});
  await p.waitForTimeout(800);
  const gold=await p.evaluate(()=>({mode:document.documentElement.dataset.boardLight,L:env.L.slice(),sun:env.sun.slice(),bg:document.body.style.background}));
  assert.equal(gold.mode,'golden','dark theme uses Golden Hour');assert.ok(gold.L[1]<.6&&gold.L[0]<0,'low sun from the west '+gold.L);assert.ok(gold.sun[0]>gold.sun[2],'warm sunlight');ok('dark theme: Golden Hour lighting (low warm sun)');
  const sh=await p.evaluate(()=>{const out={developed:0,withShadow:0,unowned:0,unownedShadow:0,mortgaged:0,mortShadow:0};for(let i=0;i<40;i++){const pl=S3.plots[i];if(!pl||SQ[i].t!=='prop')continue;const o=G.own[i];
    if(o.o<0){out.unowned++;if(pl.castN)out.unownedShadow++}else if(pl.top>0){out.developed++;if(pl.castN&&pl.castN.kids.length===3)out.withShadow++}}return out});
  assert.ok(sh.developed>0&&sh.withShadow===sh.developed,'every owned street with a building casts a shadow '+JSON.stringify(sh));assert.equal(sh.unownedShadow,0);ok(`shadows on ${sh.withShadow} developed streets, none on empty plots`);
  const dir=await p.evaluate(()=>{const res=[];for(const pl of S3.plots){if(!pl||!pl.castN)continue;const w=nodeWorld(pl.castN.kids[0]),b=nodeWorld(pl.node);res.push([w.M[12]-b.M[12],w.M[14]-b.M[14]])}const L=env.L;const h=Math.hypot(L[0],L[2]);return res.map(([x,z])=>(x*-L[0]+z*-L[2])/(h*Math.hypot(x,z)))});
  assert.ok(dir.length&&dir.every(c=>c>.98),'shadows point away from the sun '+dir.map(c=>c.toFixed(2)));ok('all shadows point away from the sun');
  const rim=await p.evaluate(()=>{const i=GROUPS[Object.keys(GROUPS)[0]][0],pl=S3.plots[i],col=hex(P(G.own[i].o).col).map(v=>+v.toFixed(3)).join();let found=0;(function w(x){if(x.mat&&x.mat.c&&x.mat.em>=.3&&x.mat.c.map(v=>+v.toFixed(3)).join()===col)found++;x.kids.forEach(w)})(pl.node);return found});
  assert.ok(rim>=4,'owner-coloured rim on the plot base ('+rim+')');ok('owned plot has an owner-coloured rim');
  const sym=await p.evaluate(()=>{const keys=Object.keys(GROUPS);return new Set(keys.map(g=>SkylineDistrictSymbol(g))).size===keys.length});
  assert.ok(sym,'every district gets its own symbol');
  const px=await p.evaluate(()=>{const c=S3.boardCanvas.getContext('2d'),i=GROUPS[Object.keys(GROUPS)[0]][0],r=rect(i),S=S3.boardCanvas.width/1100,d=c.getImageData(Math.round((r.x+r.w/2)*S)-2,Math.round((r.y+16)*S)-2,4,4).data;let white=0;for(let k=0;k<d.length;k+=4)if(d[k]>230&&d[k+1]>230&&d[k+2]>230)white++;return white});
  assert.ok(px>=8,'district symbol is painted in the colour band ('+px+' white px)');ok('district symbols are distinct and painted on the board');
  const spread=await p.evaluate(()=>{const a=tokenXY({id:0,pos:0}),b=tokenXY({id:1,pos:0});const c=tokenXY({id:0,pos:5}),d=tokenXY({id:1,pos:5});return [Math.hypot(a[0]-b[0],a[1]-b[1]),Math.hypot(c[0]-d[0],c[1]-d[1])]});
  assert.ok(spread[0]>spread[1]*1.6,'corner tokens spread further than on streets '+spread);ok('tokens on a corner square spread out');
  const fr=await p.evaluate(()=>{camOverview(P(G.turn).pos,0);drawScene(0);const cv=$('#gl'),cw=cv.clientWidth,ch=cv.clientHeight,m=CAMM.vp;
    const scr=(x,y)=>{const v=[wx(x),0,wz(y)];const c=[0,1,3].map(r=>m[r]*v[0]+m[4+r]*v[1]+m[8+r]*v[2]+m[12+r]);return[(c[0]/c[2]*.5+.5)*cw,(.5-c[1]/c[2]*.5)*ch]};
    const ro=$('#roster').getBoundingClientRect(),tl=$('#tools').getBoundingClientRect(),mid=(ro.right+tl.left)/2,c=scr(550,550);
    const r=cv.getBoundingClientRect(),err=[[200,900],[550,550],[900,200],[960,960]].map(([x,y])=>{const s2=scr(x,y),b=pickBoard(r.left+s2[0],r.top+s2[1]);return Math.hypot(b[0]-x,b[1]-y)});
    return {shift:CAMV.shift,cx:c[0],mid,err:Math.max(...err)}});
  assert.ok(fr.shift>.05,'lens shift applied in landscape '+fr.shift);assert.ok(Math.abs(fr.cx-fr.mid)<12,'board centre sits in the middle of the free area '+JSON.stringify(fr));assert.ok(fr.err<1,'taps map to the same board point '+fr.err);
  ok('board centred between the player list and the tools; taps still land on the right square');
  const parkSat=()=>p.evaluate(()=>{const c=S3.boardCanvas.getContext('2d'),S=S3.boardCanvas.width/1100,d=c.getImageData(Math.round(260*S),Math.round(260*S),Math.round(580*S),Math.round(580*S)).data;let s=0;for(let k=0;k<d.length;k+=64){const mx=Math.max(d[k],d[k+1],d[k+2]),mn=Math.min(d[k],d[k+1],d[k+2]);s+=mx?(mx-mn)/mx:0}return s/(d.length/64)});
  const satGold=await parkSat(),litGold=await p.evaluate(()=>FM().lit.em);
  await p.evaluate(()=>{PREF.ui='light';applyUI()});await p.waitForTimeout(300);
  const satDay=await parkSat(),litDay=await p.evaluate(()=>FM().lit.em);
  assert.ok(satGold<satDay-.05,'Golden Hour calms the park greens ('+satGold.toFixed(2)+' vs '+satDay.toFixed(2)+')');assert.ok(litGold>litDay,'windows glow at Golden Hour');ok('Golden Hour grades the park and lights the windows; Daylight restores them');
  const day=await p.evaluate(()=>({mode:document.documentElement.dataset.boardLight,L:env.L.slice()}));
  assert.equal(day.mode,'day');assert.ok(day.L[1]>.7,'Daylight keeps the high sun');ok('light theme switches the board to Daylight');
  const dirDay=await p.evaluate(()=>{const res=[];for(const pl of S3.plots){if(!pl||!pl.castN)continue;const w=nodeWorld(pl.castN.kids[0]),b=nodeWorld(pl.node);res.push([w.M[12]-b.M[12],w.M[14]-b.M[14]])}const L=env.L;const h=Math.hypot(L[0],L[2]);return res.map(([x,z])=>(x*-L[0]+z*-L[2])/(h*Math.hypot(x,z)))});
  assert.ok(dirDay.length&&dirDay.every(c=>c>.98),'shadows follow the Daylight sun');ok('shadows re-aim when the light changes');
  await p.evaluate(()=>{PREF.ui='dark';applyUI()});
  const after=await p.evaluate(()=>JSON.stringify({own:G.own,players:G.players.map(q=>[q.cash,q.pos]),round:G.round}));
  assert.equal(after,setup,'look changes never alter the match');ok('match state unchanged by lighting, shadows and markers');
  assert.deepEqual(errors,[]);ok('no browser errors');
 }finally{await browser.close();server.close()}
 console.log(`LIVING BOARD LOOK ${n} checks`);
})().catch(e=>{console.error(e);process.exit(1)});
