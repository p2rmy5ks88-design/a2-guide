/* AETHERFRONT: LAST LINE · WebGL 3D battlefield
   Hand-built shaded 3D geometry, no engine dependency or external network requests.
   Gameplay/pathfinding remain inside game.js. Copyright (c) 2026. */
(()=>{'use strict';
 const core=window.AetherfrontCore; const wrap=document.getElementById('canvasWrap');
 const canvas=document.createElement('canvas');canvas.id='battlefield3d';canvas.setAttribute('aria-label','Interactive 3D Aetherfront battlefield. Select a tower then tap a location to build.');wrap.insertBefore(canvas,wrap.querySelector('.battle-glass-label'));
 const gl=canvas.getContext('webgl',{alpha:true,antialias:true,depth:true,stencil:false,premultipliedAlpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
 if(!gl){canvas.remove();console.warn('WebGL unavailable; native 2D renderer retained');return}
 const vs=`attribute vec3 aPos; attribute vec3 aNormal;
 uniform mat4 uVP; uniform mat4 uM; uniform vec3 uTint; uniform float uGlow;
 varying vec3 vColor;
 void main(){ vec4 wp=uM*vec4(aPos,1.0); vec3 n=normalize(mat3(uM)*aNormal);
   float diffuse=max(dot(n,normalize(vec3(-0.45,0.88,0.52))),0.0);
   float side=max(dot(n,normalize(vec3(0.6,0.22,-0.55))),0.0);
   float light=0.39+0.56*diffuse+0.18*side;
   vColor=uTint*(light+uGlow*0.73)+vec3(0.043,0.072,0.097)*max(n.y,0.0);
   gl_Position=uVP*wp;
 }`;
 const fs=`precision mediump float; varying vec3 vColor;
 void main(){vec3 c=pow(max(vColor,vec3(0.0)),vec3(0.92));gl_FragColor=vec4(min(c,vec3(1.0)),1.0);}`;
 function compile(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
 let program;try{program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vs));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program))}catch(e){console.error('WebGL init:',e);canvas.remove();return}
 const loc={pos:gl.getAttribLocation(program,'aPos'),normal:gl.getAttribLocation(program,'aNormal'),vp:gl.getUniformLocation(program,'uVP'),model:gl.getUniformLocation(program,'uM'),tint:gl.getUniformLocation(program,'uTint'),glow:gl.getUniformLocation(program,'uGlow')};
 gl.useProgram(program);gl.enable(gl.DEPTH_TEST);gl.clearColor(0,0,0,0);
 function mesh(positions,normals,indices){const o={count:indices.length};o.v=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,o.v);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(positions),gl.STATIC_DRAW);o.n=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,o.n);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(normals),gl.STATIC_DRAW);o.i=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,o.i);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);return o}
 function makeBox(){let p=[],n=[],idx=[];const faces=[[[0,0,1],[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]],[[0,0,-1],[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]],[[0,1,0],[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]],[[0,-1,0],[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]],[[1,0,0],[.5,-.5,.5],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5]],[[-1,0,0],[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5]]];for(const f of faces){const base=p.length/3;for(let j=1;j<=4;j++){p.push(...f[j]);n.push(...f[0])}idx.push(base,base+1,base+2,base,base+2,base+3)}return mesh(p,n,idx)}
 function makeCyl(seg=14,top=0.5,bottom=0.5,asZ=false){const p=[],n=[],idx=[];let h=.5;for(let i=0;i<=seg;i++){let a=(i/seg)*Math.PI*2,c=Math.cos(a),s=Math.sin(a);for(let q=0;q<2;q++){const yy=q?h:-h,r=q?top:bottom;let v=[r*c,yy,r*s],normal=[c,0,s];if(asZ){v=[v[0],v[2],-v[1]];normal=[normal[0],normal[2],-normal[1]]}p.push(...v);n.push(...normal)}}for(let i=0;i<seg;i++){let b=i*2;idx.push(b,b+1,b+3,b,b+3,b+2)}
 for(let q=0;q<2;q++){const base=p.length/3;for(let i=0;i<=seg;i++){let a=i/seg*Math.PI*2,v=[(q?top:bottom)*Math.cos(a),q?h:-h,(q?top:bottom)*Math.sin(a)],normal=[0,q?1:-1,0];if(asZ){v=[v[0],v[2],-v[1]];normal=[normal[0],normal[2],-normal[1]]}p.push(...v);n.push(...normal)}for(let i=1;i<seg-1;i++){if(q)idx.push(base,base+i,base+i+1);else idx.push(base,base+i+1,base+i)}}return mesh(p,n,idx)}
 function makeSphere(seg=12,rings=8){let p=[],n=[],idx=[];for(let y=0;y<=rings;y++){let v=y/rings,theta=v*Math.PI;for(let x=0;x<=seg;x++){let u=x/seg,phi=u*2*Math.PI;let nx=Math.sin(theta)*Math.cos(phi),ny=Math.cos(theta),nz=Math.sin(theta)*Math.sin(phi);p.push(nx*.5,ny*.5,nz*.5);n.push(nx,ny,nz)}}for(let y=0;y<rings;y++)for(let x=0;x<seg;x++){let a=y*(seg+1)+x,b=a+seg+1;idx.push(a,b,a+1,b,b+1,a+1)}return mesh(p,n,idx)}
 function makeTorus(major=0.5,minor=0.085,vertical=false){let p=[],n=[],idx=[],seg=28,ring=8;for(let i=0;i<=seg;i++){let a=i/seg*2*Math.PI;for(let j=0;j<=ring;j++){let b=j/ring*2*Math.PI,rad=major+minor*Math.cos(b),x=rad*Math.cos(a),y=minor*Math.sin(b),z=rad*Math.sin(a);let nx=Math.cos(a)*Math.cos(b),ny=Math.sin(b),nz=Math.sin(a)*Math.cos(b);if(vertical){[y,z]=[z,y];[ny,nz]=[nz,ny]}p.push(x,y,z);n.push(nx,ny,nz)}}for(let i=0;i<seg;i++)for(let j=0;j<ring;j++){let a=i*(ring+1)+j,b=a+ring+1;idx.push(a,b,a+1,b,b+1,a+1)}return mesh(p,n,idx)}
 const shapes={box:makeBox(),hex:makeCyl(6,.48,.54),cyl:makeCyl(16),cone:makeCyl(12,.16,.50),barrel:makeCyl(14,.5,.5,true),ball:makeSphere(),ring:makeTorus(),vRing:makeTorus(.5,.09,true)};
 const rgbCache=new Map();function rgb(color){if(typeof color==='number')return[(color>>16&255)/255,(color>>8&255)/255,(color&255)/255];if(!rgbCache.has(color)){let n=parseInt(color.replace('#',''),16);rgbCache.set(color,[n>>16&255,(n>>8)&255,n&255].map(x=>x/255))}return rgbCache.get(color)}
 const TAU=Math.PI*2;
 function modelMatrix(x,y,z,sx,sy,sz,yaw){const c=Math.cos(yaw),s=Math.sin(yaw);return new Float32Array([c*sx,0,-s*sx,0, 0,sy,0,0, s*sz,0,c*sz,0, x,y,z,1])}
 function draw(name,x,y,z,sx,sy,sz,color,yaw=0,glow=0){let sh=shapes[name];if(!sh)return;gl.uniformMatrix4fv(loc.model,false,modelMatrix(x,y,z,sx,sy,sz,yaw));gl.uniform3fv(loc.tint,rgb(color));gl.uniform1f(loc.glow,glow);gl.bindBuffer(gl.ARRAY_BUFFER,sh.v);gl.vertexAttribPointer(loc.pos,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(loc.pos);gl.bindBuffer(gl.ARRAY_BUFFER,sh.n);gl.vertexAttribPointer(loc.normal,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(loc.normal);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,sh.i);gl.drawElements(gl.TRIANGLES,sh.count,gl.UNSIGNED_SHORT,0)}
 const v3=(x,y,z)=>[x,y,z],add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],normalize=a=>{let d=Math.hypot(...a)||1;return a.map(x=>x/d)};
 const multiply=(a,b)=>{let m=new Float32Array(16);for(let col=0;col<4;col++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)m[col*4+row]+=a[k*4+row]*b[col*4+k];return m};
 function viewMatrix(eye,target){const z=normalize(sub(eye,target)),x=normalize(cross([0,1,0],z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1])}
 function ortho(l,r,b,t,n,f){return new Float32Array([2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1])}
 const eye=[1.6,14,23],target=[0,.5,0];const forward=normalize(sub(target,eye)),right=normalize(cross(forward,[0,1,0])),up=normalize(cross(right,forward));
 let halfW=10.65,halfH=4.6,viewProj,drawCount=0,ready=false,frameToken=0;
 function resize(){let rect=wrap.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2.0),w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}gl.viewport(0,0,w,h);let aspect=rect.width/Math.max(rect.height,1);halfW=Math.max(10.7,aspect*3.55);halfH=halfW/aspect;viewProj=multiply(ortho(-halfW,halfW,-halfH,halfH,.1,110),viewMatrix(eye,target));gl.uniformMatrix4fv(loc.vp,false,viewProj)}
 const bx=x=>x-9,bz=y=>y-5;
 function box(x,y,z,xx,yy,zz,c,rot=0,glow=0){draw('box',x,y,z,xx,yy,zz,c,rot,glow)}
 function cyl(x,y,z,rx,hy,rz,c,glow=0,seg='cyl'){draw(seg,x,y,z,rx*2,hy,rz*2,c,0,glow)}
 function ring(x,y,z,r,c,glow=0,vertical=false){draw(vertical?'vRing':'ring',x,y,z,r*2,r*2,r*2,c,0,glow)}
 function deck(){
  // Monolithic perimeter, lower suspended slab and rails; true 3D metallic shading.
  box(0,-.67,0,19.0,1.25,10.9,'#152a38');box(0,-.10,0,18.8,.19,10.7,'#476174');box(0,-.006,0,18.5,.045,10.4,'#162e3c');
  for(let y=0;y<10;y++)for(let x=0;x<18;x++){
   const r=(x*37+y*61)%13,xx=bx(x+.5),zz=bz(y+.5),color=r<3?'#365063':r<8?'#293e50':'#223649';
   box(xx,.04,zz,.965,.07,.963,color);
   if((x+y)%3===0){box(xx-.34,.089,zz-.31,.16,.007,.021,'#597788');box(xx+.34,.089,zz+.31,.15,.007,.023,'#53788a')}
   if((x*3+y*7)%11===0){box(xx,.091,zz+.39,.31,.006,.022,'#bb9463')}
  }
  for(let y=-4.5;y<=4.5;y+=1.5){box(-9.35,.41,y,.13,.75,.13,'#678a9b');box(9.35,.41,y,.13,.75,.13,'#658998')}
  for(let x=-8.5;x<=8.5;x+=2){box(x,.41,-5.34,.14,.73,.13,'#5d7d8e');box(x,.41,5.34,.14,.73,.13,'#63899a')}
  for(let x of [-9.35,9.35]){box(x,.79,0,.12,.07,10.8,'#dfab68',0,.5)}
  for(let z of [-5.35,5.35]){box(0,.79,z,18.6,.07,.08,'#c3a26e',0,.4)}
  // Outer cooling ducts, underside landing pads, platform fins.
  for(let x=-9;x<=9;x+=3){box(x,-1.21,5.05,1.45,.42,1.05,'#233748');box(x,-1.21,-5.05,1.45,.42,1.05,'#223747')}
  for(let x of [-10.35,10.35])for(let z of [-3.4,0,3.4]){cyl(x,-.45,z,.56,.40,.56,'#1e3345');cyl(x,-.14,z,.44,.10,.44,'#547182');box(x,-.78,z,.8,.58,.8,'#122938')}
  // Distant antenna arrays, industrial cranes and life support platforms.
  for(const [x,z,h] of [[-10,-5.1,2.2],[10,-4.8,2.5],[-11,3.7,1.55],[11,4.5,1.9]]){
   box(x,h/2-.15,z,.47,h,.47,'#354f62');box(x,h,z,.66,.12,.65,'#7a9fac');box(x,h+.14,z,.18,.24,.18,'#f2bd76',0,.4);
   box(x,h*.65,z,.85,.08,.22,'#273a4b');box(x,h*.84,z,.23,.08,.86,'#354a5c')
  }
 }
 function fixedObstacles(walls){for(const [x,y] of walls){let xx=bx(x+.5),zz=bz(y+.5);
  box(xx,.18,zz,.86,.36,.87,'#1b2e3c');box(xx,.39,zz,.89,.08,.89,'#526b7d');box(xx,.445,zz,.72,.035,.72,'#2d4558');box(xx,.466,zz,.59,.01,.07,'#7498a7');box(xx+.33,.27,zz+.30,.06,.11,.06,'#e4a95c',0,.4)
 }}
 function gateAndCore(t){
  // Entrance at x=0,y=4; terminal at x=17,y=4; structurally distinct landmarks.
  let z=bz(4.5);
  cyl(-9.05,.18,z,.75,.28,.75,'#203b50');cyl(-9.05,.38,z,.55,.13,.55,'#6c92a9');
  ring(-9.05,.87,z,.79,'#66fcff',.85,true);cyl(-9.05,.56,z,.27,.9,.27,'#255575');
  cyl(9.05,.20,z,.95,.36,.95,'#24405b');cyl(9.05,.51,z,.70,.27,.70,'#7cc4c8');cyl(9.05,.79,z,.54,.4,.54,'#224f67');
  draw('ball',9.05,1.1,z,1.15,1.15,1.15,'#5dfff0',0,1.3);ring(9.05,1.1,z,.84,'#7afaff',1.1,true);
  ring(9.05,1.1,z,.95,'#81eaff',.55);cyl(9.05,.24,z,.93,.06,.93,'#42c9dd',1.1);
  for(let i=0;i<6;i++){let a=i*TAU/6+t*.4;draw('ball',9.05+Math.cos(a)*.79,1.1+Math.sin(a)*.68,z,.08,.08,.08,'#c2ffff',0,1.4)}
 }
 function route(path,t){if(!path||!path.length)return;const phase=Math.sin(t*2.2)*.06;
  for(let i=0;i<path.length;i++){const p=path[i],x=bx(p.x+.5),z=bz(p.y+.5);
   box(x,.103,z,.83,.022,.82,'#175970',0,.13);
   if(i%2===0)box(x,.12,z,.65,.014,.06,'#2ddbe6',0,1.4);
   if(i<path.length-1){let next=path[i+1],dx=next.x-p.x,dz=next.y-p.y,theta=Math.atan2(dz,dx);
    box(x+dx*.23,.145,z+dz*.23,.25,.018,.09,'#6dfff9',-theta,1.4+phase)
   }
  }
 }
 function tower(t,now){const x=bx(t.x+.5),z=bz(t.y+.5),a=-Math.PI/2-(t.angle||0),pulse=.5+.5*Math.sin(now*4+t.x),level=t.level||1;
  cyl(x,.20,z,.40,.30,.40,'#182e43');cyl(x,.385,z,.43,.10,.43,t.type==='mortar'?'#c39a58':'#65899e');cyl(x,.46,z,.30,.11,.30,'#254359');ring(x,.53,z,.31,({pulse:'#73d8ff',tesla:'#b497fb',mortar:'#ffa65f',cryo:'#8dfced'})[t.type],.33);
  if(t.type==='pulse'){
   cyl(x,.75,z,.29,.36,.29,'#5d839a');draw('barrel',x+Math.sin(a)*.19,.92,z+Math.cos(a)*.19,.23,.24,.86,'#9cb6cd',a);
   draw('barrel',x+Math.sin(a)*.43,.92,z+Math.cos(a)*.43,.33,.32,.12,'#5de0ff',a,1.1);
   draw('ball',x,.83,z,.38,.38,.38,'#2fa8d6',0,.65)
  }else if(t.type==='tesla'){
   cyl(x,.76,z,.24,.59,.24,'#523f84');cyl(x,1.09,z,.16,.45,.16,'#8c78bc');
   draw('cone',x,1.47,z,.40,.43,.40,'#bd99ee',0,.25);draw('ball',x,1.78+Math.sin(now*8)*.055,z,.34,.34,.34,'#f1e3ff',0,1.4);
   ring(x,1.15,z,.24,'#a993ff',.85);for(let i=0;i<3;i++){let ra=i*TAU/3+now*.6;draw('ball',x+Math.cos(ra)*.33,1.43,z+Math.sin(ra)*.33,.11,.11,.11,'#d3bcff',0,.7)}
  }else if(t.type==='mortar'){
   box(x,.81,z,.68,.55,.76,'#806449',a);draw('barrel',x+Math.sin(a)*.30,1.13,z+Math.cos(a)*.30,.47,.47,1.16,'#d3a168',a);
   draw('barrel',x+Math.sin(a)*.63,1.13,z+Math.cos(a)*.63,.29,.29,.13,'#282e38',a,.3);
   box(x,1.02,z,.45,.11,.46,'#fdc57d',a,.7)
  }else{
   cyl(x,.91,z,.24,.89,.24,'#398d9e');cyl(x,1.39,z,.28,.10,.28,'#9cf6ff',.9);
   draw('ball',x,1.54,z,.40,.40,.40,'#a4fff6',0,.9);ring(x,1.55,z,.45,'#67f7eb',.65,true);
   for(let i=0;i<4;i++){let aa=i*TAU/4+now*.22;box(x+Math.cos(aa)*.39,1.12,z+Math.sin(aa)*.39,.19,.65,.15,'#487a93',aa)}
  }
  if(level>1){ring(x,.21,z,.49,'#ffc875',.8);if(level>2)ring(x,.29,z,.55,'#ebfeff',.65)}
  if(t===core.snapshot().selectedPlaced)ring(x,.09,z,.58,'#d4fff9',1.2);
  if(t.shot>0)draw('ball',x,1.0,z,.65+t.shot,.12,.65+t.shot,'#b6ffff',0,.4)
 }
 function enemy(e,t){const x=bx(e.x),z=bz(e.y),bob=e.flying?Math.sin(t*5+e.hover)*.13:0,angle=-Math.PI/2-(e.heading||0),isTank=e.type==='tank'||e.type==='titan',r=e.type==='titan'?.68:isTank?.47:e.type==='drone'?.33:.28;
  const body=e.type==='titan'?'#9b5861':e.type==='tank'?'#886e69':e.type==='drone'?'#8e9cab':'#69808c';
  box(x,.32+bob,z,r*2.0,.30+(isTank?.16:0),r*1.6,body,angle);
  box(x,.52+bob,z,r*1.18,.17,r*.95,e.hit>0?'#e7fbff':'#29394d',angle);
  for(let side of [-1,1]){
   const a=side*r*.88;
   box(x+Math.sin(angle)*a,.16+bob,z+Math.cos(angle)*a,r*.50,.22,r*2.05,'#233140',angle)
  }
  if(e.flying){for(let side of [-1,1])box(x+side*r*.85,.48+bob,z,.16,.05,.56,'#c9b3f8',angle,.4)}
  const fx=Math.cos(e.heading||0),fz=Math.sin(e.heading||0);
  box(x+fx*r*.74,.49+bob,z+fz*r*.74,.13,.09,r*.63,e.type==='titan'?'#ff586c':'#fa916f',angle,.75);
  if(isTank){for(let side of [-1,1])for(let off of [-1,1]){
   box(x+side*r*.78,.11+bob,z+off*r*.65,.19,.27,.31,'#3b4552',angle)
  }}
  if(e.slow>0)ring(x,.14,z,r*1.38,'#71fff2',.75);
  if(e.hp<e.maxHp||e.type==='titan'){let fraction=Math.max(0,e.hp/e.maxHp);box(x,.98+bob,z,.92,.065,.08,'#0e1b2b');box(x-.46*(1-fraction),1.024+bob,z,.92*fraction,.04,.075,fraction>.4?'#79f3c0':'#ff7b73',0,.75)}
 }
 function beam(x,z,xx,zz,y,color,glow=1){let dx=xx-x,dz=zz-z,d=Math.hypot(dx,dz),a=Math.atan2(dz,dx);box((x+xx)/2,y,(z+zz)/2,d,.058,.055,color,-a,glow)}
 function effects(state,now){for(let e of state.effects){const r=Math.max(.1,e.r);if(e.type==='beam')beam(bx(e.x),bz(e.y),bx(e.x2),bz(e.y2),1.05,e.color,1.6);else ring(bx(e.x),.20,bz(e.y),Math.min(2.4,r),e.color,1.2)}
  for(let p of state.projectiles){draw('ball',bx(p.x),p.type==='mortar'?.96:.65,bz(p.y),p.type==='mortar'?.24:.14,p.type==='mortar'?.24:.14,p.type==='mortar'?.24:.14,p.color,0,2)}
  for(let p of state.particles.slice(-50)){if(p.life>0)draw('ball',bx(p.x),.28+p.life*.55,bz(p.y),.045,.045,.045,p.color,0,.9)}
 }
 function hover(s){const hover=s.hoverCell;if(!s.gameStarted||s.paused||!hover||hover.x<0||hover.x>=18||hover.y<0||hover.y>=10)return;const x=bx(hover.x+.5),z=bz(hover.y+.5);box(x,.19,z,.91,.023,.91,s.abilityMode?'#fce8a7':'#78e4d2',0,.95);ring(x,.23,z,.59,s.abilityMode?'#facc89':'#84fff1',1.3)}
 let lastFrame=0;function render(now){frameToken=requestAnimationFrame(render);if(now-lastFrame<20)return;lastFrame=now;let s=core.snapshot();resizeIfNeeded();const t=s.time;
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);gl.uniformMatrix4fv(loc.vp,false,viewProj);
  deck();fixedObstacles(s.wallCoords);route(s.previewPath,t);gateAndCore(t);
  for(let turret of s.state.towers)tower(turret,t);for(let e of s.state.enemies)if(!e.dead)enemy(e,t);
  effects(s.state,t);hover(s);
 }
 let oldW=0,oldH=0;function resizeIfNeeded(){const r=wrap.getBoundingClientRect();if(Math.abs(r.width-oldW)>1||Math.abs(r.height-oldH)>1){oldW=r.width;oldH=r.height;resize()}}
 function pointerCell(e){const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return null;let nx=2*(e.clientX-rect.left)/rect.width-1,ny=1-2*(e.clientY-rect.top)/rect.height;
  let origin=add(add(eye,right.map(v=>v*nx*halfW)),up.map(v=>v*ny*halfH));let den=forward[1];if(den>=-.001)return null;let t=(.10-origin[1])/den;let hit=add(origin,forward.map(v=>v*t));let x=Math.floor(hit[0]+9),y=Math.floor(hit[2]+5);return{x,y}}
 canvas.addEventListener('pointermove',e=>{let p=pointerCell(e);core.hover(p?.x??NaN,p?.y??NaN)});canvas.addEventListener('pointerleave',()=>core.hover(NaN,NaN));canvas.addEventListener('pointerdown',e=>{if(e.button&&e.pointerType==='mouse')return;let p=pointerCell(e);if(p)core.tap(p.x,p.y)});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();window.AETHERFRONT_3D_ENABLED=false;canvas.style.display='none';document.getElementById('gameCanvas').style.opacity='1';console.error('WebGL context lost; fallback to 2D')} );
 resize();document.getElementById('gameCanvas').style.opacity='0';window.AETHERFRONT_3D_ENABLED=true;window.Aetherfront3D={get active(){return window.AETHERFRONT_3D_ENABLED},pick:pointerCell,gl};ready=true;requestAnimationFrame(render);
})();
