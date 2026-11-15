/* Living Board look (Phase 2): presentation only.
   - Golden Hour lighting for the main 3D board when the app uses the dark theme; Daylight stays with the light theme.
   - Soft directional shadows under developed streets, following the sun.
   - Owner-coloured rim on every owned plot, so ownership reads in the overview.
   - A small district symbol in each street's colour band (helps colour-blind players).
   - Tokens on a corner square spread further apart.
   Nothing here touches rules, money, saves, ownership logic, board geometry or online play. */
(function(){'use strict';
if(typeof applyTheme!=='function'||typeof updateCell!=='function')return;

/* ---------- lighting modes ---------- */
// Golden Hour: low warm sun from the west, cool blue fill in the shade, warm haze in the distance.
const GOLD={sun:['#ffb877',1.2],L:[-.55,.45,.4],skyL:'#6f80a8',gnd:'#6a4c34',fogC:'#e8b48a',fog:[24,60],
  sky:'linear-gradient(180deg,#2b3f6e 0%,#7d6f8e 38%,#c77e5c 62%,#f4c08a 100%)'};
// Per-theme water/sand for Golden Hour; other daytime cities only get the light.
const GOLD_SURF={beach:{water:'#2a6f92',island:'#dcb882',rim:'#ecd3a4',cloud:'#ffd9b8'}};
const lookMode=()=>{try{return PREF.ui==='light'?'day':'golden'}catch(e){return 'golden'}};
let applied=null,goldNow=false;
// Warm lit windows at Golden Hour on the shared building materials (instant, no geometry change).
function litWindows(){try{if(!S3)return;const F=FM();F.lit.c=hex(goldNow?'#ffcf7a':'#f2d9a0');F.lit.em=goldNow?.55:.18;F.win.c=hex(goldNow?'#1f3a45':'#173a40');F.win.spec=goldNow?.95:.8}catch(e){}}
// Golden Hour grade for the painted centre of the board: calmer, warmer greens and a deeper lagoon.
// Painted after the original board, over the inner square only, so tiles, names and prices are untouched.
const GRADE={beach:1};
{const _db=drawBoard;drawBoard=function(ctx){const r=_db.apply(this,arguments);try{if(goldNow&&GRADE[surfKey(CUR_THEME)]){const S=ctx.canvas.width/1100;ctx.save();ctx.setTransform(S,0,0,S,0,0);
  ctx.beginPath();ctx.rect(252,252,596,596);ctx.clip();
  ctx.globalCompositeOperation='saturation';ctx.globalAlpha=.28;ctx.fillStyle='#808080';ctx.fillRect(252,252,596,596);
  ctx.globalCompositeOperation='multiply';ctx.globalAlpha=.32;ctx.fillStyle='#f0c79a';ctx.fillRect(252,252,596,596);
  ctx.restore()}}catch(e){}return r}}
// Lagos has its own theme key but shares the Lekki beach board art, so both resolve to the beach surfaces.
const surfKey=k=>{try{return BOARDS[k]===BOARDS.beach?'beach':k}catch(e){return k}};
function norm(v){const l=Math.hypot(...v)||1;return v.map(x=>x/l)}
function goldenFor(key){const T=THEMES[key]||THEMES.beach;return !T.night&&lookMode()==='golden'}
{const _at=applyTheme;applyTheme=function(k){const r=_at.apply(this,arguments);try{
  const key=CUR_THEME,gold=goldenFor(key);
  if(gold&&S3){env.sun=hex(GOLD.sun[0]).map(v=>v*GOLD.sun[1]);env.L=norm(GOLD.L);env.sky=hex(GOLD.skyL);env.gnd=hex(GOLD.gnd);env.fogC=hex(GOLD.fogC);env.fog=GOLD.fog;
    const s=GOLD_SURF[surfKey(key)];if(s){S3.waterMat.c=hex(s.water);S3.islandMat.c=hex(s.island);S3.rimMat.c=hex(s.rim);if(S3.M&&S3.M.cloud)S3.M.cloud.c=hex(s.cloud)}}
  if(gold)document.body.style.background=GOLD.sky;
  document.documentElement.dataset.boardLight=gold?'golden':'day';
  const now=(gold?'g':'d')+key;if(applied!==now){applied=now;goldNow=gold;litWindows();refreshShadows();
    // Repaint the board texture so the park/lake grade matches the light (only when the mode actually changes).
    if(S3&&S3.boardCanvas){drawBoard(S3.boardCanvas.getContext('2d'));texUpdate(S3.boardTex)}}
 }catch(e){console.warn('Living Board look:',e)}return r}}
// Switching the app theme switches the board light (same convention as Harbour Ring).
{const _au=applyUI;applyUI=function(){const r=_au.apply(this,arguments);try{if(typeof S3!=='undefined'&&S3&&typeof CUR_THEME!=='undefined')applyTheme(CUR_THEME)}catch(e){}return r}}

/* ---------- directional building shadows ---------- */
let shadowMat=null;
// Built from three stacked translucent ellipses (no texture), darker near the building, so the soft fall-off
// does not depend on texture alpha support and costs three small draws per developed street.
function castShadow(i){const pl=S3&&S3.plots&&S3.plots[i];if(!pl||!pl.node)return;
  if(pl.castN){pl.node.remove(pl.castN);pl.castN=null}
  const o=G&&G.own&&G.own[i];if(!o||o.o<0||!(pl.top>0))return;
  if(!shadowMat)shadowMat=mat('#120f22',{a:.16,blend:1,layer:2,unlit:1});
  const L=env.L,hz=Math.hypot(L[0],L[2])||1e-3,ratio=Math.min(1.25,hz/Math.max(.2,L[1]));
  const len=Math.max(.36,Math.min(1.5,pl.top*ratio+.22)),dX=-L[0]/hz,dZ=-L[2]/hz;
  const w=nodeWorld(pl.node),Y=w.yaw,c=Math.cos(Y),s=Math.sin(Y),yaw=Math.atan2(-dZ,dX)-Y;
  const g=new Node();
  // [length share, width, start offset]: the smaller ellipses sit nearer the building and overlap into a darker core.
  for(const [k,wd,st] of [[1,.62,0],[.72,.5,-.02],[.45,.4,-.04]]){const L2=len*k,half=st+L2/2,ox=dX*half,oz=dZ*half;
    g.add(N(S3.geo.cyl,shadowMat,c*ox-s*oz,.014+k*.0005,s*ox+c*oz).sc(L2/2,.001,wd/2).rot(0,yaw,0))}
  pl.node.add(g);pl.castN=g}
function refreshShadows(){try{if(typeof FAST!=='undefined'&&FAST)return;if(!S3||!S3.plots||!G||!G.own)return;for(let i=0;i<40;i++)if(S3.plots[i])castShadow(i)}catch(e){}}

/* ---------- ownership rim on the plot base ---------- */
{const _fb=famBase;famBase=function(p,col,mort){const r=_fb.apply(this,arguments);try{if(col&&!mort){const F=FM();
  // A bright band in the owner's colour around the top of the base, readable from the overview camera.
  const rim=mat(col,{spec:.35,em:.32});bBox(p,rim,0,.094,.31,.62,.014,.022);bBox(p,rim,0,.094,-.31,.62,.014,.022);bBox(p,rim,.31,.094,0,.022,.014,.62);bBox(p,rim,-.31,.094,0,.022,.014,.62)}}catch(e){}return r}}

{const _uc=updateCell;updateCell=function(i,anim){const r=_uc.apply(this,arguments);try{if(!(typeof FAST!=='undefined'&&FAST)&&S3&&S3.plots&&S3.plots[i])castShadow(i)}catch(e){}return r}}

/* ---------- district symbols in the colour band ---------- */
const SYM=['circle','triangle','square','diamond','plus','hex','bar','star'];
function symbolFor(g){const keys=Object.keys(GROUPS);return SYM[Math.max(0,keys.indexOf(g))%SYM.length]}
function drawSym(ctx,kind,x,y,r){ctx.beginPath();
  if(kind==='circle')ctx.arc(x,y,r,0,Math.PI*2);
  else if(kind==='triangle'){ctx.moveTo(x,y-r);ctx.lineTo(x+r*.95,y+r*.75);ctx.lineTo(x-r*.95,y+r*.75);ctx.closePath()}
  else if(kind==='square')ctx.rect(x-r*.82,y-r*.82,r*1.64,r*1.64);
  else if(kind==='diamond'){ctx.moveTo(x,y-r*1.1);ctx.lineTo(x+r*1.1,y);ctx.lineTo(x,y+r*1.1);ctx.lineTo(x-r*1.1,y);ctx.closePath()}
  else if(kind==='plus'){const t=r*.42;ctx.rect(x-r,y-t,r*2,t*2);ctx.rect(x-t,y-r,t*2,r*2)}
  else if(kind==='hex'){for(let k=0;k<6;k++){const a=Math.PI/3*k+Math.PI/6;ctx[k?'lineTo':'moveTo'](x+Math.cos(a)*r,y+Math.sin(a)*r)}ctx.closePath()}
  else if(kind==='bar'){ctx.rect(x-r*1.25,y-r*.45,r*2.5,r*.9)}
  else{for(let k=0;k<10;k++){const a=-Math.PI/2+k*Math.PI/5,rr=k%2?r*.45:r*1.1;ctx[k?'lineTo':'moveTo'](x+Math.cos(a)*rr,y+Math.sin(a)*rr)}ctx.closePath()}}
{const _dc=drawCell;drawCell=function(ctx,i){const r=_dc.apply(this,arguments);try{const s=SQ[i];if(!s||s.t!=='prop'||i%10===0)return r;
  const R=rect(i);ctx.save();ctx.translate(R.x+R.w/2,R.y+R.h/2);ctx.rotate(sideOf(i)*Math.PI/2);
  const y=-C/2+16;ctx.lineJoin='round';drawSym(ctx,symbolFor(s.g),0,y,7.5);ctx.fillStyle='rgba(255,255,255,.95)';ctx.strokeStyle='rgba(10,20,30,.55)';ctx.lineWidth=2;ctx.stroke();ctx.fill();ctx.restore()}catch(e){}return r}}
window.SkylineDistrictSymbol=symbolFor;

/* ---------- tokens on corner squares ---------- */
{const _tx=tokenXY;tokenXY=function(p){const xy=_tx.apply(this,arguments);try{if(p.pos%10===0&&p.pos!==10){const r=rect(p.pos),cx=r.x+r.w/2,cy=r.y+r.h/2;return[cx+(xy[0]-cx)*1.75,cy+(xy[1]-cy)*1.75]}}catch(e){}return xy}}

// Redraw the board texture once so the district symbols appear, and apply the current light.
try{if(typeof CUR_THEME!=='undefined')applyTheme(CUR_THEME)}catch(e){}
window.SkylineBoardLook={mode:lookMode,refreshShadows};
})();
