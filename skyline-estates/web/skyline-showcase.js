/* Skyline Showcase — web only. Read completed results; never call rewards,
   change G, serialize room/UID data, or change the live WebGL camera/scene.
   Images use the existing software-projected building meshes and city photos.
   They are explicitly labelled portfolio reconstructions, not screenshots. */
(()=>{
 'use strict';
 if(window.SkylineShowcase)return;
 const KEY='skyline-showcases-v1',LIMIT=10,MAX_BYTES=131072;
 const FORMATS=Object.freeze({portrait:[1080,1350],story:[1080,1920],landscape:[1920,1080]});
 const LINK='https://p2rmy5ks88-design.github.io/a2-guide/skyline-estates/';
 const copies=new WeakMap(),gameIds=new WeakMap();let overlay=null,activeClose=null;
 const clone=x=>JSON.parse(JSON.stringify(x));
 const text=(v,n=80)=>Array.from(String(v??'').replace(/[\u0000-\u001f\u007f]/g,' ')).slice(0,n).join('');
 const int=(n,max=1e9)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
 const cash=n=>window.SkylineCurrency.formatCash(n);
 const colour=c=>/^#[0-9a-f]{6}$/i.test(c||'')?c:'#c6a455';
 const hash=s=>{let n=2166136261;for(const c of String(s))n=Math.imul(n^c.charCodeAt(0),16777619);return(n>>>0).toString(36)};
 function eligible(){if(!G||!G.over||G.sim||FAST)return[];return G.online?G.players.filter(p=>p.uid&&p.uid===NET.me):G.players.filter(p=>!p.ai)}
 function valid(r){
  if(!r||r.v!==1||typeof r.id!=='string'||!/^[a-z0-9-]{1,70}$/.test(r.id)||!CITY_DATA[r.city]||!Number.isSafeInteger(r.ended)||r.ended<0)return false;
  if(typeof r.name!=='string'||r.name.length>180||typeof r.token!=='string'||r.token.length>32||!Number.isFinite(r.netWorth)||r.netWorth<0||r.netWorth>1e12)return false;
  if(!int(r.rank,6)||r.rank<1||!int(r.seats,6)||r.rank>r.seats||!['win','draw','loss'].includes(r.outcome)||!['classic','quick','timed'].includes(r.mode)||!int(r.round,100000))return false;
  if(!Array.isArray(r.rows)||r.rows.length>28||new Set(r.rows.map(x=>x.i)).size!==r.rows.length)return false;
  if(!r.rows.every(x=>int(x.i,39)&&['prop','rail','util'].includes(x.type)&&typeof x.name==='string'&&x.name.length<=180&&int(x.level,5)&&(x.type==='prop'||x.level===0)&&typeof x.mortgaged==='boolean'&&(!x.mortgaged||x.level===0)&&Number.isFinite(x.value)&&x.value>=0&&x.value<=1e10&&(x.roof===null||ROOF_IDS.includes(x.roof))))return false;
  if(r.properties!==r.rows.length||r.developed!==r.rows.filter(x=>x.level>0).length||r.houses!==r.rows.reduce((s,x)=>s+(x.level===5?0:x.level),0)||r.towers!==r.rows.filter(x=>x.level===5).length)return false;
  return typeof r.title==='string'&&r.title.length<100&&typeof r.colour==='string'&&/^#[0-9a-f]{6}$/i.test(r.colour)&&Array.isArray(r.achievements)&&r.achievements.length<=5&&r.achievements.every(a=>typeof a.name==='string'&&a.name.length<100&&typeof a.criteria==='string'&&a.criteria.length<180)&&(r.league===null||typeof r.league==='string'&&r.league.length<60)&&(r.event===null||typeof r.event==='string'&&r.event.length<200);
 }
 function capture(pid){
  if(!eligible().some(p=>p.id===pid))return null;
  let byPlayer=copies.get(G);if(!byPlayer){byPlayer=new Map();copies.set(G,byPlayer)}if(byPlayer.has(pid))return clone(byPlayer.get(pid));
  const p=G.players[pid],city=G.set.city||'lagos';if(!CITY_DATA[city])return null;
  const order=standings(),forced=Number.isInteger(G.forceWin)?G.forceWin:null;
  const score=q=>q.bankrupt?0:netWorth(q),better=q=>q.id!==p.id&&(q.id===forced||(p.id!==forced&&(Number(q.bankrupt)<Number(p.bankrupt)||q.bankrupt===p.bankrupt&&score(q)>score(p))));
  const rank=1+G.players.filter(better).length,same=forced===pid?1:G.players.filter(q=>q.id!==forced&&q.bankrupt===p.bankrupt&&score(q)===score(p)).length;
  const outcome=forced!==null?(forced===pid?'win':'loss'):order[0].bankrupt===p.bankrupt&&score(order[0])===score(p)?(same>1?'draw':'win'):'loss';
  const rows=G.own.flatMap((o,i)=>o.o===pid?[{i,name:text(SQ[i].n),type:SQ[i].t,group:SQ[i].g||null,level:o.h,mortgaged:!!o.m,value:(o.m?SQ[i].p/2:SQ[i].p)+o.h*(SQ[i].h||0),roof:ROOF_IDS.includes(p.roof)?p.roof:null}]:[]);
  const towers=rows.filter(r=>r.level===5).length,houses=rows.reduce((s,r)=>s+(r.level===5?0:r.level),0),developed=rows.filter(r=>r.level>0).length;
  const sets=Object.values(GROUPS).filter(ids=>ids.every(i=>G.own[i].o===pid)).length,achievements=[];
  if(towers)achievements.push({name:'Tower Developer',criteria:`${towers} tower${towers===1?'':'s'} owned at the finish`});
  if(sets)achievements.push({name:'District Collector',criteria:`${sets} full colour set${sets===1?'':'s'} owned at the finish`});
  if(rows.length>=10)achievements.push({name:'Estate Collector',criteria:`${rows.length} properties owned at the finish`});
  if(p.st&&Number.isFinite(p.st.maxRent)&&p.st.maxRent>0)achievements.push({name:'Rent Collector',criteria:`Largest recorded rent: ${cash(p.st.maxRent)}`});
  if(outcome==='win')achievements.unshift({name:'City Champion',criteria:'Finished first in this completed match'});
  const owner=G.online||G.owner===pid||(G.owner==null&&G.players.find(q=>!q.ai)?.id===pid),league=owner&&LEAGUES[leagueIdx()]?text(LEAGUES[leagueIdx()].name,50):null;
  let source=G.masteryId;if(!source){if(!gameIds.has(G))gameIds.set(G,crypto.randomUUID?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint32Array(4))).join('-'));source=gameIds.get(G)}
  const ev=G.ev2&&EV2_DEFS[G.ev2.id]?G.ev2:null,choice=ev?.choices?.[pid];
  const event=G.friendChallenge?'Friendly challenge · device-reported · no profile rewards':ev?text(`${ev.name} · recorded round ${ev.from}${choice==='permit'?' · bought district permit':choice==='hold'?' · kept match cash':''}`,160):null;
  const r={v:1,id:hash(source)+'-'+pid,ended:Date.now(),name:text(p.name),token:text(p.tok,12),city,netWorth:p.bankrupt?0:netWorth(p),rank,seats:G.players.length,tied:same>1,outcome,mode:['classic','quick','timed'].includes(G.set.mode)?G.set.mode:'classic',round:G.round,online:!!G.online,assisted:!!G.scAssisted,properties:rows.length,developed,houses,towers,colour:colour(p.col),rows,achievements:achievements.slice(0,5),league,event,title:outcome==='win'?'City Champion':outcome==='draw'?'Shared Skyline Lead':rows.length?'Rising Developer':'Estate Builder'};
  if(!valid(r))return null;byPlayer.set(pid,clone(r));return clone(r);
 }
 function history(){try{const raw=localStorage.getItem(KEY);if(raw===null)return{items:[],error:''};if(raw.length>MAX_BYTES)throw Error();const data=JSON.parse(raw);if(data.v!==1||!Array.isArray(data.items)||data.items.length>LIMIT||!data.items.every(valid))throw Error();return{items:data.items,error:''}}catch(e){return{items:[],error:'Showcase history is unavailable. Existing stored data has been kept.'}}}
 function saveRecord(r){if(!valid(r))return{ok:false,message:'This result cannot be saved.'};const h=history();if(h.error)return{ok:false,message:h.error};
  const items=[clone(r),...h.items.filter(x=>x.id!==r.id)].slice(0,LIMIT),raw=JSON.stringify({v:1,items});if(raw.length>MAX_BYTES)return{ok:false,message:'This result is too large to save.'};
  try{localStorage.setItem(KEY,raw);return{ok:true,message:`Saved in Portfolio · My Showcases (latest ${LIMIT}).`}}catch(e){return{ok:false,message:'Device storage is full or unavailable. Your earlier history is intact; you can still save the image.'}}
 }
 function fit(ctx,s,max,size,min=16){ctx.font=`700 ${size}px Georgia,serif`;while(ctx.measureText(s).width>max&&size>min){size--;ctx.font=`700 ${size}px Georgia,serif`}return size}
 function line(ctx,s,x,y,max,size=30,fill='#f5eedb'){ctx.fillStyle=fill;fit(ctx,String(s),max,size);ctx.fillText(String(s),x,y)}
 function wrap(ctx,s,x,y,max,size=24,maxLines=3,fill='#c1d1db'){
  ctx.fillStyle=fill;ctx.font=`500 ${size}px system-ui,sans-serif`;while(ctx.measureText(String(s)).width>(max-size*2)*maxLines&&size>12){size--;ctx.font=`500 ${size}px system-ui,sans-serif`}let row='',lines=0;
  for(const ch of Array.from(String(s))){if(ctx.measureText(row+ch).width>max&&row){ctx.fillText(row,x,y+lines*(size+9));if(++lines>=maxLines)return;row=''}row+=ch}if(row)ctx.fillText(row,x,y+lines*(size+9));
 }
 function round(ctx,x,y,w,h,r=18){ctx.beginPath();ctx.roundRect?ctx.roundRect(x,y,w,h,r):ctx.rect(x,y,w,h)}
 function logo(ctx,x,y,w){ctx.save();ctx.translate(x,y);ctx.scale(w/100,w/100);const g=ctx.createLinearGradient(0,0,0,36);g.addColorStop(0,'#fff0a8');g.addColorStop(.55,'#e9b949');g.addColorStop(1,'#9c6a1c');ctx.fillStyle=g;
  // Exact skyline mark from home-redesign.js's owner-approved LOGO.
  ctx.fill(new Path2D('M20 36V22h6v14zM28 36V14h7v22zM37 36V6l4-6 4 6v30zM47 36V10h7v26zM56 36V18h6v18zM64 36V24h5v12zM31 16h1v2h-1zM49 13h1v2h-1zM40 9h2v2h-2z'));ctx.strokeStyle=g;ctx.lineWidth=2;ctx.stroke(new Path2D('M6 33c14-5 26-7 44-7s30 2 44 7'));ctx.restore();
 }
 function photo(city){return new Promise(resolve=>{const image=new Image();let done=false;const end=v=>{if(done)return;done=true;clearTimeout(timer);resolve(v)};const timer=setTimeout(()=>end(null),4000);image.onload=()=>end(image);image.onerror=()=>end(null);image.src=`./photos/${city}.jpg`})}
 function tile(i){const r=rect(i);return[r.x,r.y,r.w,r.h]}
 function scene(ctx,r,box,image){const[x,y,w,h]=box;ctx.save();round(ctx,x,y,w,h,24);ctx.clip();ctx.fillStyle='#10283d';ctx.fillRect(x,y,w,h);
  if(image){const s=Math.max(w/image.width,h/image.height);ctx.globalAlpha=.4;ctx.drawImage(image,x+(w-image.width*s)/2,y+(h-image.height*s)/2,image.width*s,image.height*s);ctx.globalAlpha=1}
  const shade=ctx.createLinearGradient(0,y,0,y+h);shade.addColorStop(0,'#08182a55');shade.addColorStop(1,'#08182ae8');ctx.fillStyle=shade;ctx.fillRect(x,y,w,h);
  const scale=Math.min(w*.88/11,h*.73/5.5),cx=x+w/2,cy=y+h*.59,project=(a,b)=>[cx+(a-b)*.5*scale,cy+(a+b)*.25*scale];
  const diamond=(a,b,ww,hh,fill,stroke)=>{ctx.beginPath();[[a,b],[a+ww,b],[a+ww,b+hh],[a,b+hh]].map(([u,v])=>project(u,v)).forEach(([u,v],i)=>i?ctx.lineTo(u,v):ctx.moveTo(u,v));ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=1.4;ctx.stroke()};
  diamond(-5.6,-5.6,11.2,11.2,'#0b1c2be8','#a88a51');diamond(-4.1,-4.1,8.2,8.2,'#183a42','#b08d4855');
  const bySquare=new Map(r.rows.map(row=>[row.i,row]));
  for(let i=0;i<40;i++){const[a,b,ww,hh]=tile(i),o=bySquare.get(i);diamond((a-550)/100,(b-550)/100,ww/100,hh/100,o?'#c6a563':'#1b3549',o?'#ffe4a4':'#58717c')}
  ctx.textAlign='center';line(ctx,CITY_DATA[r.city].name.toUpperCase(),cx,cy+8,w*.42,Math.min(30,w*.035),'#e9d39a');ctx.textAlign='left';
  const owned=r.rows.map(row=>{const[a,b,ww,hh]=tile(row.i),p=project((a+ww/2-550)/100,(b+hh/2-550)/100);return{row,p}}).sort((a,b)=>a.p[1]-b.p[1]);
  for(const {row,p}of owned){const lv=row.level,s=Math.min(1.3,scale/65),bw=(lv===5?100:lv?82:62)*s,bh=(lv===5?170:lv?95+lv*13:50)*s;
   if(row.type==='prop'){const sprite=document.createElement('canvas');sprite.width=180;sprite.height=240;try{mdRender(sprite,{kind:'building',level:lv,owner:r.colour,roof:row.roof});ctx.drawImage(sprite,p[0]-bw/2,p[1]-bh*.87,bw,bh)}catch(e){ctx.fillStyle='#ffe2a0';ctx.font='bold 18px system-ui';ctx.fillText('L'+lv,p[0]-12,p[1]-8)}finally{sprite.width=sprite.height=1}}
   else{ctx.textAlign='center';ctx.font=`${32*s}px system-ui`;ctx.fillStyle='#f3d489';ctx.fillText(row.type==='rail'?'🚉':'◆',p[0],p[1]);ctx.textAlign='left'}
   if(row.mortgaged){ctx.fillStyle='#10233e';ctx.fillRect(p[0]-10,p[1]-8,20,18);ctx.font='bold 13px system-ui';ctx.fillStyle='#ffe4a4';ctx.fillText('M',p[0]-5,p[1]+6)}
  }
  ctx.fillStyle='#061221cc';ctx.fillRect(x,y+h-50,w,50);ctx.font='500 17px system-ui';ctx.fillStyle='#d6e0e4';ctx.fillText('OWNED PORTFOLIO RECONSTRUCTION · REAL FINAL BUILDING LEVELS',x+22,y+h-21);ctx.restore();ctx.strokeStyle='#bb9b5d';ctx.lineWidth=1;round(ctx,x,y,w,h,24);ctx.stroke();
 }
 function holding(r){return r.rows.slice().sort((a,b)=>b.value-a.value||a.i-b.i)[0]||null}
 async function generate(r,format='portrait',useName=false){if(!valid(r)||!FORMATS[format])throw Error('Invalid Showcase result or image format');
  const[W,H]=FORMATS[format],canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const c=canvas.getContext('2d');if(!c)throw Error('Image rendering is unavailable');
  const bg=c.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#193650');bg.addColorStop(.5,'#0c1b33');bg.addColorStop(1,'#040c1b');c.fillStyle=bg;c.fillRect(0,0,W,H);c.strokeStyle='#b79553';c.lineWidth=2;round(c,24,24,W-48,H-48,28);c.stroke();c.strokeStyle='#e4c27544';round(c,34,34,W-68,H-68,22);c.stroke();
  const landscape=format==='landscape',name=useName?r.name:'Skyline Player',city=CITY_DATA[r.city].name,country=countryOf(r.city).name;
  logo(c,landscape?430:440,53,200);c.textAlign='center';line(c,'SKYLINE ESTATES',landscape?530:540,163,860,36,'#f3d48f');c.textAlign='left';
  const tx=landscape?1210:64,tw=landscape?620:952,titleY=landscape?113:230,nameY=landscape?159:281,worthY=landscape?277:400;
  line(c,r.title.toUpperCase()+' — '+city.toUpperCase(),tx,titleY,tw,landscape?37:48,'#ffe2a0');
  wrap(c,`${name} ${r.token}`,tx,nameY,tw,landscape?26:30,2,'#f8f0dc');
  c.font='600 16px system-ui';c.fillStyle='#a9c5d5';c.fillText('FINAL NET WORTH · MATCH SC',tx,worthY-57);line(c,cash(r.netWorth),tx,worthY,tw,landscape?66:70,'#f7d789');
  const rankLabel=`${r.tied?'Tied ':''}${r.rank} / ${r.seats}`,modeLabel=r.assisted?'assisted practice':r.online?'online '+r.mode:r.mode,context=`${city}, ${country} · ${modeLabel} · position ${rankLabel} · round ${r.round}`;
  const box=landscape?[64,265,1080,655]:[64,446,952,format==='story'?805:430];
  const image=await photo(r.city);scene(c,r,box,image);
  const sy=landscape?340:format==='story'?1285:938,sw=landscape?620:952,cell=sw/3;
  [['PROPERTIES OWNED',r.properties],['DEVELOPED STREETS',r.developed],['HOUSES / TOWERS',`${r.houses} / ${r.towers}`]].forEach(([label,value],i)=>{const x=tx+i*cell;line(c,label,x,sy,cell-15,14,'#a7c4d4');line(c,value,x,sy+57,cell-15,49,'#fff0ce')});
  const best=holding(r);line(c,'HIGHEST-VALUE HOLDING',tx,sy+113,sw,16,'#a7c4d4');wrap(c,best?`${best.name} · ${cash(best.value)}${best.mortgaged?' · mortgaged':''}`:'No properties owned at the finish',tx,sy+151,sw,landscape?27:28,2,'#f2dca6');
  const ach=r.achievements[0];line(c,ach?'MATCH MILESTONE':'COMPLETED RESULT',tx,sy+224,sw,16,'#a7c4d4');wrap(c,ach?`${ach.name} · ${ach.criteria}`:'No additional match milestone recorded',tx,sy+260,sw,landscape?23:24,2,'#f4ead3');
  const extra=landscape?sy+346:H===1920?sy+355:sy+330;
  if(landscape||format==='story'){wrap(c,context,tx,extra,sw,21,2);if(r.league)line(c,'League at finish: '+r.league,tx,extra+80,sw,23,'#f1cf83');if(r.event)wrap(c,'Last recorded event: '+r.event,tx,extra+124,sw,19,3);}
  else{line(c,`Position ${rankLabel} · ${modeLabel}${r.league?' · League: '+r.league:''}`,64,910,952,20,'#bcd1db')}
  if(!landscape){line(c,city+' · '+country,64,430,952,18,'#afcbd7')}
  const fy=H-65;c.strokeStyle='#b7955370';c.beginPath();c.moveTo(64,fy-22);c.lineTo(W-64,fy-22);c.stroke();line(c,'BUILD YOUR OWN SKYLINE',64,fy+5,landscape?700:600,19,'#f2d38e');c.textAlign='right';c.font='500 15px system-ui';c.fillStyle='#bcd0de';c.fillText('p2rmy5ks88-design.github.io/a2-guide/skyline-estates',W-64,fy+5);c.textAlign='left';
  // Snapshot never includes wallet balances, room codes, UIDs, opponents or logs.
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Could not create image')),'image/png'));canvas.width=canvas.height=1;
  return{blob,width:W,height:H,format,name:useName?r.name:'Skyline Player',scene:image?'approved-city-photo-and-meshes':'approved-meshes-on-city-plaque'};
 }
 function details(r){const h=holding(r),ach=r.achievements[0];return `<dl><div><dt>Final net worth · match SC</dt><dd>${esc(cash(r.netWorth))}</dd></div><div><dt>Match position</dt><dd>${r.tied?'Tied ':''}${r.rank} / ${r.seats} · ${esc(r.outcome)}</dd></div><div><dt>Properties / developed streets</dt><dd>${r.properties} / ${r.developed}</dd></div><div><dt>Houses / towers at finish</dt><dd>${r.houses} / ${r.towers}</dd></div><div><dt>Highest-value holding · includes buildings</dt><dd>${h?esc(h.name)+' · '+esc(cash(h.value)):'None owned at finish'}</dd></div>${ach?`<div><dt>Match milestone</dt><dd>${esc(ach.name)}<small class="sh-note"> · ${esc(ach.criteria)}</small></dd></div>`:''}${r.league?`<div><dt>Your league at finish</dt><dd>${esc(r.league)}</dd></div>`:''}${r.event?`<div><dt>Last recorded event</dt><dd>${esc(r.event)}</dd></div>`:''}</dl>`}
 function nativeShare(){const c=window.Capacitor;return c?.isNativePlatform?.()&&c.getPlatform?.()==='ios'&&c.isPluginAvailable?.('SkylineShare')?c.Plugins?.SkylineShare:null}
 async function shareNative(file,text){const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('Image unavailable'));reader.readAsDataURL(file)});return nativeShare().shareImage({base64,text})}
 function open(r,options={}){if(!valid(r))return false;if(activeClose)activeClose();const focus=document.activeElement;let closed=false,version=0,url='',prepared=null;
  const e=document.createElement('div');e.id='skyline-showcase';e.setAttribute('role','dialog');e.setAttribute('aria-modal','true');e.setAttribute('aria-labelledby','showcase-title');
  const choices=options.choices||[];e.innerHTML=`<section class="sh-shell"><header class="sh-header"><div><div class="sh-kicker">Your completed skyline</div><h2 id="showcase-title">Skyline Showcase</h2></div><button type="button" data-close>${options.fromResults?'Return to Results':'Close'}</button></header><div class="sh-body"><div class="sh-stage"><img alt="Your generated Skyline Showcase" hidden><div class="sh-loading" role="status">Preparing your skyline…</div></div><div class="sh-controls">${choices.length>1?`<label><span>Choose your own result · shared device</span><select data-player>${choices.map((x,i)=>`<option value="${i}"${x.id===r.id?' selected':''}>${esc(x.name)}</option>`).join('')}</select></label>`:''}<label><span>Image format</span><select data-format><option value="portrait">Portrait · 1080 × 1350</option><option value="story">Story · 1080 × 1920</option><option value="landscape">Landscape · 1920 × 1080</option></select></label><label class="sh-private"><input type="checkbox" data-name><span>Use my player name in the image</span></label><p class="sh-note">Anonymous by default. Only the selected player's result appears. Nothing posts automatically.</p><div data-details></div><p class="sh-note">${r.online?'Online client result':'Local match result'}${r.assisted?' · assisted solo practice':''}. Buildings reconstruct your final owned portfolio using the game's own meshes. They are not a live-board screenshot. Dark board slots show no ownership details.</p><p class="sh-note">Opening, saving and sharing grant no rewards. Saved earned SC and Coins are separate from these match values.</p></div></div><div class="sh-footer"><button type="button" data-share class="sh-primary" disabled>Share Skyline</button><button type="button" data-save-image disabled>Save Image</button><button type="button" data-save-record>Save Showcase</button><a class="sh-download" data-open-image aria-disabled="true" target="_blank" rel="noopener">Open Image</a></div><div class="sh-status" role="status" aria-live="polite"></div></section>`;
  document.body.append(e);overlay=e;const $s=s=>e.querySelector(s),status=$s('.sh-status'),busy=$s('.sh-loading'),img=$s('.sh-stage img');let current=clone(r);
  const close=()=>{if(closed)return;closed=true;version++;if(url){const old=url;setTimeout(()=>URL.revokeObjectURL(old),30000)}prepared=null;e.remove();if(overlay===e)overlay=null;if(activeClose===close)activeClose=null;if(focus?.isConnected)focus.focus()};activeClose=close;
  async function prepare(){const ticket=++version;prepared=null;$s('[data-share]').disabled=true;$s('[data-save-image]').disabled=true;$s('[data-open-image]').setAttribute('aria-disabled','true');busy.hidden=false;img.hidden=true;status.textContent='';$s('[data-details]').innerHTML=details(current);
   try{const output=await generate(current,$s('[data-format]').value,$s('[data-name]').checked);if(closed||ticket!==version)return;if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(output.blob);const file=new File([output.blob],`skyline-${current.city}-${output.format}.png`,{type:'image/png'});prepared={...output,file};img.src=url;img.hidden=false;busy.hidden=true;$s('[data-share]').disabled=false;$s('[data-save-image]').disabled=false;$s('[data-open-image]').href=url;$s('[data-open-image]').setAttribute('aria-disabled','false');status.textContent=`Ready · ${output.width} × ${output.height}. If sharing is unavailable, save or open the image and touch-hold it to save.`;
   }catch(error){if(closed||ticket!==version)return;busy.textContent='The image could not be generated.';status.textContent='Image rendering is unavailable. You can still save this result in My Showcases and try again later.'}
  }
  $s('[data-close]').onclick=close;$s('[data-format]').onchange=prepare;$s('[data-name]').onchange=prepare;
  if($s('[data-player]'))$s('[data-player]').onchange=()=>{current=clone(choices[+$s('[data-player]').value]);$s('[data-name]').checked=false;prepare()};
  $s('[data-save-record]').onclick=()=>{const result=saveRecord(current);status.textContent=result.message};
  $s('[data-open-image]').onclick=()=>{status.textContent='In the image preview, touch and hold the image to save it to Photos.'};
  const nativeSheet=text=>{status.textContent='Opening the image share sheet…';shareNative(prepared.file,text).then(r=>{if(!closed)status.textContent=r.completed?'Image share completed.':'Share sheet closed. Your image remains ready.'},()=>{if(!closed)status.textContent='The image share sheet is unavailable. Your saved Showcase remains here.'})};
  if(nativeShare())$s('[data-open-image]').hidden=true;
  $s('[data-save-image]').onclick=()=>{if(!prepared)return;if(nativeShare())return nativeSheet('');const a=document.createElement('a');a.href=url;a.download=prepared.file.name;a.rel='noopener';a.target='_blank';document.body.append(a);a.click();a.remove();status.textContent='Image download requested. If Safari opens a preview, touch and hold the image to save.'};
  // No await, image generation, permission probe or network call precedes share.
  // The File has already been generated; navigator.share runs in this tap stack.
  $s('[data-share]').onclick=()=>{if(!prepared)return;if(nativeShare())return nativeSheet('Build your own skyline in Skyline Estates. '+LINK);try{if(typeof navigator.share!=='function'||typeof navigator.canShare!=='function'||!navigator.canShare({files:[prepared.file]})){status.textContent='File sharing is not supported here. Use Save Image or Open Image, then share it from Photos.';return}
   const promise=navigator.share({files:[prepared.file],title:'My Skyline · Skyline Estates',text:'Build your own skyline in Skyline Estates. '+LINK});Promise.resolve(promise).then(()=>{if(!closed)status.textContent='Share sheet closed. Your image remains ready.'},error=>{if(!closed)status.textContent=error?.name==='AbortError'?'Sharing cancelled. Your image is still ready.':'Sharing was unavailable. Use Save Image or Open Image instead.'});
  }catch(error){status.textContent='Sharing was unavailable. Use Save Image or Open Image instead.'}};
  e.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();close()}if(event.key==='Tab'){const nodes=[...e.querySelectorAll('button:not(:disabled),select,input,a[href]')].filter(n=>n.offsetWidth);const a=nodes[0],b=nodes[nodes.length-1];if(event.shiftKey&&document.activeElement===a){b.focus();event.preventDefault()}else if(!event.shiftKey&&document.activeElement===b){a.focus();event.preventDefault()}}});
  $s('[data-close]').focus();prepare();return true;
 }
 function attachResults(panel){try{if(!G?.over||G.sim||FAST||panel.querySelector('.sh-results-button'))return;const results=eligible().map(p=>capture(p.id)).filter(Boolean);if(!results.length)return;const owner=G.owner,selected=results.find(r=>r.id===copies.get(G)?.get(owner)?.id)||results[0];const b=document.createElement('button');b.type='button';b.className='btn sh-results-button';b.textContent='View My Skyline';b.onclick=()=>open(selected,{fromResults:true,choices:results});const bar=panel.querySelector('.mbar');if(bar)bar.prepend(b);else panel.append(b)}catch(error){console.warn('[Showcase] Result preview unavailable')}}
 function addHistory(T){if(T.querySelector('.showcase-history'))return;const section=document.createElement('section');section.className='showcase-history';section.setAttribute('aria-label','My Showcases');const h=history();section.innerHTML=`<h3>My Showcases</h3><p>${h.error?esc(h.error):`Save a completed result from View My Skyline. The latest ${LIMIT} results stay on this device; images are recreated when opened.`}</p><div class="sh-history-list"></div>`;const list=section.querySelector('.sh-history-list');
  h.items.forEach(r=>{const b=document.createElement('button');b.type='button';b.innerHTML=`${esc(CITY_DATA[r.city].name)} · ${esc(r.title)}<span>${esc(cash(r.netWorth))} · ${esc(r.name)}</span><small>${new Date(r.ended).toLocaleDateString()} · position ${r.rank}/${r.seats}</small>`;b.onclick=()=>open(r);list.append(b)});if(!h.items.length&&!h.error)list.textContent='No saved Showcases yet.';T.prepend(section);
 }
 const portfolio=panePortfolio;panePortfolio=function(T){const result=portfolio.apply(this,arguments);try{addHistory(T)}catch(error){}return result};
 window.SkylineShowcase=Object.freeze({version:1,HISTORY_LIMIT:LIMIT,FORMATS,capture,history:()=>clone(history()),save:saveRecord,generate,open,attachResults,close:()=>activeClose?.(),valid});
})();
