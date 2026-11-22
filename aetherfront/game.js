/* AETHERFRONT: LAST LINE — Original zero-dependency tower-defense prototype.
   Copyright (c) 2026. Vanilla Canvas 2D. No third-party game art or libraries. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const canvas=$('gameCanvas'),ctx=canvas.getContext('2d',{alpha:false});
 const COLS=18,ROWS=10,CELL=60,W=COLS*CELL,H=ROWS*CELL,MAX_WAVES=15;
 const ENTRY={x:0,y:4},EXIT={x:17,y:4};
 const wallCoords=[[5,2],[5,3],[5,4],[5,5],[5,6],[11,4],[11,5],[11,6],[11,7],[11,8],[15,1],[15,2]];
 const wallSet=new Set(wallCoords.map(([x,y])=>x+','+y));
 const DEFS={
  pulse:{name:'PULSE CANNON',cost:65,range:2.75,damage:13,rate:0.31,projectile:13,color:'#53c8ff',hint:'Fast and precise single-target damage.'},
  tesla:{name:'ARC PYLON',cost:95,range:2.55,damage:28,rate:0.78,projectile:0,color:'#be99ff',hint:'Lightning that chains into nearby targets.'},
  mortar:{name:'NOVA MORTAR',cost:125,range:3.65,damage:58,rate:1.50,projectile:8,color:'#ffb563',hint:'Explosive shells damage crowds in a wide radius.'},
  cryo:{name:'FROST ARRAY',cost:80,range:2.75,damage:9,rate:0.79,projectile:0,color:'#7cf2e4',hint:'Chills and slows enemy movement.'}
 };
 const BADGUYS={
  scout:{hp:68,speed:1.25,bounty:10,damage:1,color:'#ffaf79',radius:12},
  runner:{hp:48,speed:1.85,bounty:9,damage:1,color:'#fff08b',radius:10},
  tank:{hp:245,speed:.68,bounty:29,damage:2,color:'#ff828b',radius:19},
  drone:{hp:100,speed:1.54,bounty:15,damage:1,color:'#bcb4ff',radius:12,flying:true},
  titan:{hp:1100,speed:.52,bounty:125,damage:5,color:'#f779ad',radius:25}
 };
 let state,selectedType='pulse',selectedPlaced=null,hoverCell=null,abilityMode=false,gameOver=false,gameStarted=false,paused=false,speed=1,sound=true;
 let terrainCanvas=document.createElement('canvas'),terrainCtx=terrainCanvas.getContext('2d');
 terrainCanvas.width=W;terrainCanvas.height=H;
 let audioCtx=null,noticeTimeout=null,lastTime=0,time=0,shake=0,animationId=0;
 let previewPath=null;
 const key=(x,y)=>x+','+y;
 const gridInside=(x,y)=>x>=0&&y>=0&&x<COLS&&y<ROWS;
 const rand=(a,b,c)=>{let q=Math.sin(a*127.1+b*311.7+c*69.6)*43758.5453;return q-Math.floor(q)};
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const lerp=(a,b,t)=>a+(b-a)*t;
 const dist=(a,b,c,d)=>Math.hypot(a-c,b-d);
 function roundRect(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r)}
 function hex(c,x,y,r,rotation=Math.PI/6){c.beginPath();for(let i=0;i<6;i++){const a=rotation+i*Math.PI/3;if(i===0)c.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r);else c.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r)}c.closePath()}
 function colorAlpha(hex,a){const c=hex.replace('#','');const v=parseInt(c,16);return `rgba(${(v>>16)&255},${(v>>8)&255},${v&255},${a})`}
 function showNotice(msg,warning=false){let n=$('notice');n.textContent=msg;n.style.borderColor=warning?'#fa9e79':'#68dfc8';n.classList.add('active');clearTimeout(noticeTimeout);noticeTimeout=setTimeout(()=>n.classList.remove('active'),1850)}
 function soundEffect(kind){if(!sound||!gameStarted)return;try{audioCtx??=new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();const osc=audioCtx.createOscillator(),gain=audioCtx.createGain(),now=audioCtx.currentTime;osc.connect(gain);gain.connect(audioCtx.destination);osc.type=kind==='blast'?'sawtooth':kind==='bad'?'triangle':'sine';let f=kind==='place'?520:kind==='fire'?245:kind==='coin'?600:kind==='blast'?110:kind==='bad'?160:850;osc.frequency.setValueAtTime(f,now);osc.frequency.exponentialRampToValueAtTime(Math.max(30,f*(kind==='coin'?1.5:kind==='bad'?.45:.63)),now+.13);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(kind==='fire'?.007:.033,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+.17);osc.start(now);osc.stop(now+.18)}catch(e){}}
 function buildTerrain(){const c=terrainCtx;c.clearRect(0,0,W,H);let bg=c.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#468e72');bg.addColorStop(.43,'#2f7270');bg.addColorStop(1,'#285c75');c.fillStyle=bg;c.fillRect(0,0,W,H);
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
   let px=x*CELL,py=y*CELL,r=rand(x,y,0),r2=rand(x,y,7);
   c.fillStyle=(x+y)%2===0?'rgba(213,255,203,.075)':'rgba(5,25,26,.03)';c.fillRect(px+1,py+1,CELL-2,CELL-2);
   c.strokeStyle='rgba(220,255,220,.16)';c.lineWidth=1;c.strokeRect(px+.5,py+.5,CELL-1,CELL-1);
   c.strokeStyle='rgba(215,245,228,.14)';c.beginPath();c.moveTo(px+8,py+7);c.lineTo(px+19,py+7);c.moveTo(px+7,py+8);c.lineTo(px+7,py+18);c.stroke();
   if(!wallSet.has(key(x,y))){
    // Micro-landscaping: native colorful painterly ground, not external sprite art.
    for(let i=0;i<8;i++){let sx=px+5+rand(x+i,y,i)*50,sy=py+5+rand(x,y+i,i+3)*50;c.fillStyle=i%3===0?'rgba(184,244,141,.21)':'rgba(12,49,52,.24)';c.beginPath();c.ellipse(sx,sy,1+rand(i,x,y)*3,.5+rand(y,i,x)*2,r2*6,0,Math.PI*2);c.fill()}
    if(r>.68){c.strokeStyle='rgba(112,206,164,.26)';c.lineWidth=1.6;for(let i=0;i<3;i++){let bx=px+10+r2*31+i*4,by=py+16+r*17;c.beginPath();c.moveTo(bx,by+8);c.quadraticCurveTo(bx-5,by-3,bx+3,by-7);c.stroke()}}
    if(r2>.88){c.fillStyle='rgba(170,217,203,.28)';hex(c,px+18,py+39,3.3,r*5);c.fill()}
   }else{
    let grd=c.createLinearGradient(px,py,px+CELL,py+CELL);grd.addColorStop(0,'#1c3841');grd.addColorStop(1,'#0e2635');c.fillStyle=grd;roundRect(c,px+3,py+4,54,52,8);c.fill();c.strokeStyle='#548c84';c.lineWidth=1.7;c.stroke();
    c.fillStyle='#28535a';roundRect(c,px+9,py+10,42,37,6);c.fill();c.strokeStyle='#548781';c.lineWidth=1;c.stroke();
    c.strokeStyle='rgba(111,220,203,.55)';c.lineWidth=3;c.beginPath();c.moveTo(px+16,py+18);c.lineTo(px+44,py+18);c.moveTo(px+16,py+27);c.lineTo(px+44,py+27);c.moveTo(px+16,py+36);c.lineTo(px+44,py+36);c.stroke();
    c.fillStyle='#ffce7a';c.beginPath();c.arc(px+44,py+43,2.5,0,Math.PI*2);c.fill();
   }
  }
  c.strokeStyle='#a6ece91e';c.lineWidth=4;c.strokeRect(3,3,W-6,H-6);
  let vign=c.createRadialGradient(W*.5,H*.5,H*.15,W*.5,H*.5,W*.83);vign.addColorStop(0,'#00000000');vign.addColorStop(1,'#02131d60');c.fillStyle=vign;c.fillRect(0,0,W,H);
 }
 function blocked(x,y,addX=-99,addY=-99){return wallSet.has(key(x,y))||(x===addX&&y===addY)||state.towers.some(t=>t.x===x&&t.y===y)}
 function findPath(sx,sy,addX=-99,addY=-99){if(!gridInside(sx,sy)||blocked(sx,sy,addX,addY))return null;
  const q=[[sx,sy]],prev=new Map([[key(sx,sy),null]]),dirs=[[1,0],[0,1],[0,-1],[-1,0]];
  for(let i=0;i<q.length;i++){
   const [x,y]=q[i];if(x===EXIT.x&&y===EXIT.y){let path=[],k=key(x,y);while(k){const [xx,yy]=k.split(',').map(Number);path.unshift({x:xx,y:yy});k=prev.get(k)}return path}
   for(let [dx,dy] of dirs){let nx=x+dx,ny=y+dy,nk=key(nx,ny);if(gridInside(nx,ny)&&!blocked(nx,ny,addX,addY)&&!prev.has(nk)){prev.set(nk,key(x,y));q.push([nx,ny])}}
  }
  return null;
 }
 function updatePreview(){previewPath=findPath(ENTRY.x,ENTRY.y)}
 function reset(){state={credits:320,lives:20,wave:0,score:0,energy:0,towers:[],enemies:[],projectiles:[],effects:[],particles:[],queue:[],spawnCd:0,waveActive:false,kills:0};selectedType='pulse';selectedPlaced=null;hoverCell=null;abilityMode=false;paused=false;speed=1;gameOver=false;time=0;shake=0;updatePreview();updateUI();syncSelection()}
 function setTower(type){selectedType=type;selectedPlaced=null;abilityMode=false;syncSelection();updateUI()}
 function syncSelection(){document.querySelectorAll('.tower-button').forEach(btn=>btn.classList.toggle('selected',btn.dataset.tower===selectedType&&!abilityMode&&!selectedPlaced))}
 function upgradeCost(t){return Math.floor(DEFS[t.type].cost*(.74+t.level*.44))}
 function sellPrice(t){return Math.floor(t.spent*.65)}
 function getTowerStats(t){const d=DEFS[t.type],lv=t.level-1;return {range:d.range+lv*.24,damage:d.damage*(1+lv*.57),rate:d.rate*(1-lv*.12)}}
 function hasMobAt(x,y){return state.enemies.some(e=>!e.dead&&!e.flying&&Math.floor(e.x)===x&&Math.floor(e.y)===y)}
 function canBuild(x,y){if(!gridInside(x,y)||x===ENTRY.x&&y===ENTRY.y||x===EXIT.x&&y===EXIT.y||blocked(x,y)||hasMobAt(x,y))return false;
  if(!findPath(ENTRY.x,ENTRY.y,x,y))return false;
  return !state.enemies.some(e=>!e.dead&&!e.flying&&!findPath(clamp(Math.floor(e.x),0,COLS-1),clamp(Math.floor(e.y),0,ROWS-1),x,y));
 }
 function buildAt(x,y){let d=DEFS[selectedType];if(state.credits<d.cost)return showNotice('Not enough alloy to build '+d.name.toLowerCase(),true);
  if(!canBuild(x,y))return showNotice('Build denied · core route must remain open',true);
  state.credits-=d.cost;state.towers.push({id:Math.random(),type:selectedType,x,y,level:1,spent:d.cost,cd:.18,angle:-Math.PI/2,glow:0,shot:0});
  updatePreview();reroute();showNotice(d.name+' deployed');spawnParticles(x+.5,y+.5,d.color,10);soundEffect('place');updateUI();
 }
 function reroute(){for(let e of state.enemies){if(e.flying||e.dead)continue;let x=clamp(Math.floor(e.x),0,COLS-1),y=clamp(Math.floor(e.y),0,ROWS-1),path=findPath(x,y);if(path){e.path=path.map(p=>({x:p.x+.5,y:p.y+.5}));e.next=0}}}
 function selectPlaced(t){selectedPlaced=t;abilityMode=false;syncSelection();updateUI();soundEffect('coin')}
 function upgrade(){let t=selectedPlaced;if(!t||!state.towers.includes(t)||t.level>=3)return;let cost=upgradeCost(t);if(state.credits<cost)return showNotice('Not enough alloy to upgrade',true);state.credits-=cost;t.spent+=cost;t.level++;t.glow=1;spawnParticles(t.x+.5,t.y+.5,DEFS[t.type].color,24);soundEffect('place');showNotice('Tower enhanced to Mk '+t.level);updateUI()}
 function sell(){let t=selectedPlaced;if(!t||!state.towers.includes(t))return;let returned=sellPrice(t);state.credits+=returned;state.towers=state.towers.filter(a=>a!==t);selectedPlaced=null;updatePreview();reroute();showNotice('Tower salvaged · +'+returned+' alloy');soundEffect('coin');syncSelection();updateUI()}
 function screenCell(ev){const r=canvas.getBoundingClientRect(),x=(ev.clientX-r.left)/r.width*W,y=(ev.clientY-r.top)/r.height*H;return{x:Math.floor(x/CELL),y:Math.floor(y/CELL)}}
 function boardClick(ev){const {x,y}=screenCell(ev);boardTap(x,y)}
 function boardTap(x,y){if(!gameStarted||paused||gameOver)return;if(!gridInside(x,y))return;
  if(abilityMode){if(state.energy>=100){state.energy=0;abilityMode=false;orbitalStrike(x+.5,y+.5);syncSelection();updateUI()}return}
  let t=state.towers.find(t=>t.x===x&&t.y===y);if(t){selectPlaced(t);return}
  if(selectedPlaced){selectedPlaced=null;syncSelection()}
  buildAt(x,y);
 }
 function orbitalStrike(x,y){for(let i=0;i<5;i++)state.effects.push({type:'blast',x,y,r:i*.34,life:.85+i*.13,max:.85+i*.13,color:i%2?'#d6f5ff':'#58daff'});for(let e of state.enemies){if(dist(e.x,e.y,x,y)<2.5)damage(e,350,'#69e9ff')};spawnParticles(x,y,'#e8ffff',58);shake=8;showNotice('ORBITAL IMPACT · +350 DAMAGE');soundEffect('blast')}
 function startWave(){if(state.waveActive||gameOver||state.wave>=MAX_WAVES||!gameStarted)return;state.wave++;let w=state.wave;state.queue=[];
  let count=10+w*2;for(let i=0;i<count;i++){let type='scout';if(w>=2&&i%5===2)type='runner';if(w>=3&&i%7===5)type='tank';if(w>=4&&i%6===3)type='drone';state.queue.push(type)}
  if(w%5===0)state.queue.push('titan');
  state.waveActive=true;state.spawnCd=.12;showNotice('WAVE '+String(w).padStart(2,'0')+' · INCOMING');soundEffect('place');updateUI();
 }
 function spawn(type){const d=BADGUYS[type],w=state.wave,mult=1+(w-1)*.17,hp=d.hp*mult;const flying=!!d.flying,path=flying?[]:(previewPath||findPath(0,4)).map(p=>({x:p.x+.5,y:p.y+.5}));state.enemies.push({type,x:-.45,y:ENTRY.y+.5,level:w,hp,maxHp:hp,speed:d.speed*(1+Math.min(.22,w*.009)),bounty:d.bounty,damage:d.damage,radius:d.radius,color:d.color,flying,path,next:0,dead:false,slow:0,progress:0,hover:Math.random()*6.3,heading:0})}
 function damage(e,amount,color){if(e.dead)return;let actual=amount*(e.type==='tank'?.87:1);e.hp-=actual;e.hit=.15;
  if(e.hp<=0){e.dead=true;state.kills++;state.credits+=Math.round(e.bounty*(1+(state.wave-1)*.08));state.energy=clamp(state.energy+(e.type==='titan'?24:e.type==='tank'?5:2.1),0,100);state.score+=Math.round(e.maxHp*.35+e.bounty*5);spawnParticles(e.x,e.y,e.color,e.type==='titan'?30:11);state.effects.push({type:'ring',x:e.x,y:e.y,r:.08,life:.28,max:.28,color:color||e.color});if(e.type==='titan')shake=9;soundEffect('fire')}}
 function loseLife(e){e.dead=true;state.lives=Math.max(0,state.lives-e.damage);state.effects.push({type:'ring',x:EXIT.x+.5,y:EXIT.y+.5,r:.2,life:.72,max:.72,color:'#ff747b'});shake=5;showNotice('CORE BREACH · −'+e.damage+' integrity',true);soundEffect('bad');if(state.lives<=0)finish(false)}
 function spawnParticles(x,y,color,n){for(let i=0;i<n;i++){const a=rand(i,x*23,y*31)*Math.PI*2,v=(.25+rand(i*7,y,x)*1.95);state.particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.3+rand(x,i,y)*.55,max:.85,size:2+rand(y,i,x)*4,color})}}
 function fire(t,target){const d=DEFS[t.type],s=getTowerStats(t);t.angle=Math.atan2(target.y-t.y-.5,target.x-t.x-.5);t.glow=.3;t.shot=.14;
  if(t.type==='tesla'){
   damage(target,s.damage,'#c4a9ff');let hits=[target];for(let i=0;i<2+t.level-1;i++){const last=hits[hits.length-1];const next=state.enemies.filter(e=>!e.dead&&!hits.includes(e)&&dist(last.x,last.y,e.x,e.y)<1.8).sort((a,b)=>dist(last.x,last.y,a.x,a.y)-dist(last.x,last.y,b.x,b.y))[0];if(!next)break;damage(next,s.damage*.64,'#bba1ff');hits.push(next)}
   let p={x:t.x+.5,y:t.y+.5};for(let enemy of hits){state.effects.push({type:'beam',x:p.x,y:p.y,x2:enemy.x,y2:enemy.y,life:.17,max:.17,color:'#c3a2ff'});p=enemy}
  }else if(t.type==='cryo'){
   target.slow=2;damage(target,s.damage,'#97fbef');state.effects.push({type:'beam',x:t.x+.5,y:t.y+.5,x2:target.x,y2:target.y,life:.22,max:.22,color:'#8ff4e1'});state.effects.push({type:'ring',x:target.x,y:target.y,r:.24,life:.30,max:.30,color:'#82ffeb'});
  }else{
   state.projectiles.push({type:t.type,x:t.x+.5,y:t.y+.5,target,damage:s.damage,speed:d.projectile,life:2.2,color:d.color});
  }
  soundEffect('fire');
 }
 function endWave(){state.waveActive=false;state.energy=clamp(state.energy+12,0,100);if(state.wave>=MAX_WAVES){finish(true);return}let bonus=35+state.wave*13;state.credits+=bonus;showNotice('SECTOR CLEARED · +'+bonus+' ALLOY');soundEffect('coin');updateUI()}
 function finish(won){if(gameOver)return;gameOver=true;paused=true;try{const prev=Number(localStorage.getItem('aetherfront-best')||0);if(state.score>prev)localStorage.setItem('aetherfront-best',String(state.score))}catch(e){}
  $('overlayTitle').innerHTML=won?'THE LAST LINE<br/><em>STANDS STRONG.</em>':'THE CORE<br/><em>HAS FALLEN.</em>';
  $('overlayDesc').textContent=(won?'Sector secured. Exceptional tactical command.':'Your defenses have been overrun. Rebuild your maze and return stronger.')+' Final score: '+state.score.toLocaleString()+' · Waves survived: '+state.wave+'/'+MAX_WAVES+'.';
  $('overlayBtn').innerHTML='REDEPLOY DEFENSE <span>↗</span>';$('overlay').classList.remove('hidden');
 }
 function updateUI(){if(!state)return;$('credits').textContent=Math.floor(state.credits);$('lives').textContent=state.lives;$('wave').textContent=state.wave+' / '+MAX_WAVES;$('score').textContent='SCORE '+String(state.score).padStart(6,'0');$('enemyCount').textContent='◈ '+state.enemies.filter(e=>!e.dead).length+' HOSTILES IN THE FIELD';$('energyText').textContent=Math.floor(state.energy)+'%';$('energyFill').style.width=state.energy+'%';
  $('abilityBtn').disabled=state.energy<100||gameOver;$('abilityBtn').classList.toggle('ready',state.energy>=100);$('abilityBtn').querySelector('small').textContent=state.energy>=100?'READY':'100% CHARGE';
  $('speedBtn').textContent=speed+'×';$('pauseBtn').textContent=paused?'▶':'Ⅱ';
  document.querySelectorAll('.tower-button').forEach(b=>b.classList.toggle('unaffordable',state.credits<DEFS[b.dataset.tower].cost));
  let button=$('nextWaveBtn');button.disabled=state.waveActive||gameOver||!gameStarted;button.querySelector('strong').textContent=state.waveActive?'WAVE '+state.wave+' ACTIVE':'DEPLOY WAVE '+(state.wave+1);button.querySelector('small').textContent=state.waveActive?'HOLD YOUR POSITION':'START DEFENSE';
  $('status').textContent=paused?'DEFENSE PAUSED':state.waveActive?'THREAT ACTIVE':state.wave===0?'READY FOR DEPLOYMENT':'SECTOR STABLE';
  const box=$('contextBox'),head=$('contextTitle'),desc=$('contextDesc'),controls=$('upgradeControls');
  if(selectedPlaced){let t=selectedPlaced,d=DEFS[t.type],stats=getTowerStats(t);head.textContent=d.name+' · MK '+t.level;desc.textContent='Damage '+Math.round(stats.damage)+' · Range '+stats.range.toFixed(1)+' · '+(t.level===3?'Maxed out':'Upgradable');controls.classList.remove('hidden');$('upgradePrice').textContent=t.level<3?upgradeCost(t)+' ◆':'MAX';$('upgradeBtn').disabled=t.level>=3||state.credits<upgradeCost(t);$('sellPrice').textContent='+'+sellPrice(t)+' ◆';
  }else{controls.classList.add('hidden');head.textContent=abilityMode?'ORBITAL TARGETING':DEFS[selectedType].name;desc.textContent=abilityMode?'Tap a battlefield location for a devastating strike.':DEFS[selectedType].hint;}
  $('mapHint').textContent=abilityMode?'TAP TARGET TO STRIKE':selectedPlaced?'TOWER SELECTED · UPGRADE OR SELL':'TAP A FREE TILE TO BUILD';
 }
 function step(dt){time+=dt;
  if(state.waveActive&&state.queue.length){state.spawnCd-=dt;while(state.spawnCd<=0&&state.queue.length){spawn(state.queue.shift());state.spawnCd+=Math.max(.47,.88-state.wave*.018)}}
  for(let e of state.enemies){if(e.dead)continue;if(e.slow>0)e.slow-=dt;
   if(e.flying){const goalX=EXIT.x+.5,goalY=EXIT.y+.5;let a=Math.atan2(goalY-e.y,goalX-e.x);let step=e.speed*dt;let rem=dist(e.x,e.y,goalX,goalY);if(rem<step){loseLife(e)}else{e.x+=Math.cos(a)*step;e.y+=Math.sin(a)*step;e.heading=a;e.progress+=step}}
   else{let remaining=e.speed*(e.slow>0?.50:1)*dt;let tries=0;
    while(remaining>0&&tries++<8&&!e.dead){let p=e.path[e.next];if(!p){loseLife(e);break}let rem=dist(e.x,e.y,p.x,p.y);if(rem<=remaining){e.x=p.x;e.y=p.y;e.progress+=rem;remaining-=rem;e.next++;if(e.next>=e.path.length){loseLife(e);break}}else{let a=Math.atan2(p.y-e.y,p.x-e.x);e.heading=a;e.x+=Math.cos(a)*remaining;e.y+=Math.sin(a)*remaining;e.progress+=remaining;remaining=0}}
   }if(e.hit>0)e.hit-=dt;
  }
  for(let t of state.towers){let s=getTowerStats(t);t.cd-=dt;t.glow=Math.max(0,t.glow-dt);t.shot=Math.max(0,t.shot-dt);if(t.cd<=0){let target=state.enemies.filter(e=>!e.dead&&dist(t.x+.5,t.y+.5,e.x,e.y)<=s.range).sort((a,b)=>b.progress-a.progress)[0];if(target){fire(t,target);t.cd=s.rate}else t.cd=Math.max(-.2,t.cd)}}
  for(let p of state.projectiles){if(p.dead)continue;p.life-=dt;let target=p.target,tx=target.x,ty=target.y;let len=dist(p.x,p.y,tx,ty),speed=p.speed*dt;if(p.life<=0){p.dead=true;continue}if(target.dead||len<speed){p.dead=true;if(p.type==='mortar'){state.effects.push({type:'ring',x:tx,y:ty,r:.15,life:.5,max:.5,color:'#ffb56c'});for(let e of state.enemies){if(!e.dead&&dist(e.x,e.y,tx,ty)<1.05)damage(e,p.damage*(1-.20*dist(e.x,e.y,tx,ty)),'#ffb56c')}spawnParticles(tx,ty,'#ffbc69',19);shake=2.5;soundEffect('blast')}else if(!target.dead){damage(target,p.damage,p.color);state.effects.push({type:'ring',x:tx,y:ty,r:.05,life:.13,max:.13,color:p.color})}}else{p.x+=(tx-p.x)/len*speed;p.y+=(ty-p.y)/len*speed}}
  state.projectiles=state.projectiles.filter(p=>!p.dead);
  state.enemies=state.enemies.filter(e=>!e.dead);
  for(let e of state.effects){e.life-=dt;if(e.type==='ring'||e.type==='blast')e.r+=dt*(e.type==='blast'?2.5:1.45)}state.effects=state.effects.filter(e=>e.life>0);
  for(let p of state.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.985;p.vy*=.985}state.particles=state.particles.filter(p=>p.life>0).slice(-230);shake=Math.max(0,shake-dt*18);
  if(state.waveActive&&!state.queue.length&&!state.enemies.length)endWave();
 }
 function drawPath(){if(!previewPath)return;ctx.save();ctx.lineWidth=20;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#bce7aa10';ctx.beginPath();let path=previewPath;ctx.moveTo(path[0].x*CELL+CELL/2,path[0].y*CELL+CELL/2);for(let p of path.slice(1))ctx.lineTo(p.x*CELL+CELL/2,p.y*CELL+CELL/2);ctx.stroke();ctx.lineWidth=2.1;ctx.strokeStyle='#d9f4ca65';ctx.setLineDash([8,13]);ctx.lineDashOffset=-time*15;ctx.stroke();ctx.setLineDash([]);ctx.restore();
  for(let pos of [ENTRY,EXIT]){let x=(pos.x+.5)*CELL,y=(pos.y+.5)*CELL;ctx.save();ctx.translate(x,y);ctx.strokeStyle=pos===ENTRY?'#ffd176':'#7af2de';ctx.lineWidth=3;ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=12;ctx.beginPath();ctx.arc(0,0,22+Math.sin(time*3)*1.6,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(pos===ENTRY?-8:8,-7);ctx.lineTo(pos===ENTRY?4:-4,0);ctx.lineTo(pos===ENTRY?-8:8,7);ctx.stroke();ctx.restore()}
 }
 function drawHover(){if(!hoverCell||!gameStarted||paused||gameOver)return;let {x,y}=hoverCell;if(!gridInside(x,y))return;
  let isPlaced=state.towers.find(t=>t.x===x&&t.y===y);if(isPlaced)return;
  let can=abilityMode?true:canBuild(x,y)&&state.credits>=DEFS[selectedType].cost;
  ctx.save();ctx.fillStyle=abilityMode?'#49deff40':can?'#81ffcf40':'#ff77773a';ctx.strokeStyle=abilityMode?'#77ddff':can?'#a1ffe0':'#fd8b7d';ctx.lineWidth=3;roundRect(ctx,x*CELL+3,y*CELL+3,CELL-6,CELL-6,9);ctx.fill();ctx.stroke();
  let range=abilityMode?2.5:DEFS[selectedType].range;ctx.beginPath();ctx.arc((x+.5)*CELL,(y+.5)*CELL,range*CELL,0,Math.PI*2);ctx.fillStyle=abilityMode?'rgba(59,175,246,.1)':'rgba(118,255,227,.045)';ctx.strokeStyle=abilityMode?'#83d4ff90':'#99fadd65';ctx.lineWidth=2;ctx.setLineDash([7,9]);ctx.fill();ctx.stroke();ctx.restore();
 }
 function drawSelection(){if(!selectedPlaced)return;let t=selectedPlaced;if(!state.towers.includes(t))return;let {range}=getTowerStats(t),x=(t.x+.5)*CELL,y=(t.y+.5)*CELL;ctx.save();ctx.beginPath();ctx.arc(x,y,range*CELL,0,2*Math.PI);ctx.fillStyle='rgba(114,249,223,.055)';ctx.fill();ctx.strokeStyle='#9cf6ea80';ctx.setLineDash([9,9]);ctx.lineWidth=2;ctx.stroke();ctx.setLineDash([]);ctx.strokeStyle='#bcffe8';ctx.lineWidth=2.6;ctx.strokeRect(t.x*CELL+3,t.y*CELL+3,CELL-6,CELL-6);ctx.restore()}
 function towerDraw(t){let color=DEFS[t.type].color,x=(t.x+.5)*CELL,y=(t.y+.5)*CELL;ctx.save();ctx.translate(x,y+5);
  // Grounded hex base with side-wall shading and beveled lip.
  ctx.fillStyle='#071e2aa0';ctx.beginPath();ctx.ellipse(0,19,23,9,0,0,2*Math.PI);ctx.fill();
  hex(ctx,0,6,23);ctx.fillStyle='#091e2a';ctx.fill();ctx.strokeStyle=colorAlpha(color,.35);ctx.lineWidth=2;ctx.stroke();
  hex(ctx,0,0,21);let grd=ctx.createLinearGradient(-23,-19,21,23);grd.addColorStop(0,'#426e75');grd.addColorStop(.55,'#1c3b4c');grd.addColorStop(1,'#101d36');ctx.fillStyle=grd;ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=2.4;ctx.stroke();
  hex(ctx,0,-2,16);ctx.fillStyle='#0e2738';ctx.fill();ctx.strokeStyle=colorAlpha(color,.65);ctx.lineWidth=1;ctx.stroke();
  if(t.type==='pulse'){
   ctx.save();ctx.rotate(t.angle+Math.PI/2);ctx.fillStyle='#397999';roundRect(ctx,-8,-17,16,24,5);ctx.fill();ctx.fillStyle='#bdedff';roundRect(ctx,-3,-26,6,22,3);ctx.fill();ctx.strokeStyle='#145576';ctx.lineWidth=2;ctx.stroke();ctx.restore();ctx.beginPath();ctx.arc(0,-2,8,0,2*Math.PI);ctx.fillStyle='#2cc4e7';ctx.fill();ctx.strokeStyle='#dbfaff';ctx.lineWidth=2;ctx.stroke();
  }else if(t.type==='tesla'){
   for(let i=0;i<3;i++){let a=i*2*Math.PI/3+time*.4;let xx=Math.cos(a)*11,yy=Math.sin(a)*10;ctx.fillStyle='#6751a5';hex(ctx,xx,yy,6);ctx.fill();ctx.strokeStyle='#d6b7ff';ctx.lineWidth=1;ctx.stroke()}
   ctx.strokeStyle='#b9a6ff';ctx.lineWidth=2.7;ctx.beginPath();ctx.moveTo(0,2);ctx.lineTo(-4,-17);ctx.lineTo(2,-24);ctx.lineTo(0,-31);ctx.stroke();ctx.fillStyle='#f5ecff';ctx.shadowBlur=12;ctx.shadowColor=color;ctx.beginPath();ctx.arc(0,-20,6+Math.sin(time*7)*1.5,0,2*Math.PI);ctx.fill();
  }else if(t.type==='mortar'){
   ctx.save();ctx.rotate(t.angle+Math.PI/2);ctx.fillStyle='#775038';roundRect(ctx,-11,-15,22,28,5);ctx.fill();ctx.fillStyle='#e9ad5c';roundRect(ctx,-8,-23,16,20,4);ctx.fill();ctx.fillStyle='#182837';roundRect(ctx,-5,-24,10,7,3);ctx.fill();ctx.restore();ctx.fillStyle='#ffc674';ctx.beginPath();ctx.arc(0,0,5,0,Math.PI*2);ctx.fill();
  }else{
   ctx.strokeStyle='#a6fff6';ctx.lineWidth=3;for(let a=0;a<6;a++){let rot=a*Math.PI/3+time*.2;ctx.beginPath();ctx.moveTo(Math.cos(rot)*5,Math.sin(rot)*5);ctx.lineTo(Math.cos(rot)*17,Math.sin(rot)*17);ctx.stroke()}ctx.fillStyle='#cafef6';ctx.shadowBlur=10;ctx.shadowColor=color;ctx.beginPath();ctx.arc(0,0,7+Math.sin(time*2)*.7,0,2*Math.PI);ctx.fill();
  }
  ctx.shadowBlur=0;
  for(let i=0;i<t.level;i++){ctx.fillStyle=i===2?'#ffd47e':color;ctx.beginPath();ctx.arc(-11+i*9,20,2.7,0,2*Math.PI);ctx.fill()}
  if(t.shot>0){ctx.strokeStyle=colorAlpha(color,t.shot*4);ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,26+t.shot*30,0,2*Math.PI);ctx.stroke()}
  if(t.glow>0){ctx.globalAlpha=t.glow*.4;ctx.fillStyle=color;ctx.beginPath();ctx.arc(0,0,28,0,2*Math.PI);ctx.fill()}
  ctx.restore();
 }
 function mobDraw(e){const d=BADGUYS[e.type],r=e.radius,x=e.x*CELL,y=e.y*CELL+Math.sin(time*5+e.hover)*(e.flying?5:.5);if(x<-45||x>W+45)return;
  ctx.save();ctx.translate(x,y);ctx.rotate(e.heading);ctx.fillStyle='#04192295';ctx.beginPath();ctx.ellipse(0,7,r*1.2,r*.55,0,0,Math.PI*2);ctx.fill();
  let grd=ctx.createLinearGradient(-r,-r,r,r);grd.addColorStop(0,e.hit>0?'#fff':e.color);grd.addColorStop(.6,e.type==='titan'?'#a83e7f':'#385b70');grd.addColorStop(1,'#102938');
  if(e.type==='drone'){
   ctx.strokeStyle=e.color;ctx.lineWidth=3;for(let d of [-1,1]){ctx.beginPath();ctx.moveTo(-8,d*10);ctx.lineTo(11,d*16);ctx.stroke()}
   hex(ctx,0,0,r,0);ctx.fillStyle=grd;ctx.fill();ctx.strokeStyle='#d7d0ff';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#d8b9ff';hex(ctx,2,0,4);ctx.fill();
  }else{
   for(let d of [-1,1]){ctx.fillStyle='#10212b';roundRect(ctx,-r*.8,d*r*.53-4,r*1.7,8,3);ctx.fill();ctx.strokeStyle='#698888';ctx.lineWidth=1;ctx.stroke()}
   roundRect(ctx,-r,-r*.67,r*2,r*1.34,r*.28);ctx.fillStyle=grd;ctx.fill();ctx.strokeStyle=e.color;ctx.lineWidth=2;ctx.stroke();
   ctx.fillStyle='#0e293d';roundRect(ctx,-r*.53,-r*.42,r*.9,r*.84,r*.2);ctx.fill();ctx.strokeStyle='#d2faff9a';ctx.lineWidth=1;ctx.stroke();
   ctx.fillStyle=e.type==='titan'?'#f5bdd6':'#fce7ab';roundRect(ctx,r*.28,-r*.19,r*.46,r*.38,2);ctx.fill();
   if(e.type==='tank'||e.type==='titan'){ctx.strokeStyle='#d1abb5';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-r*.55,-r*.53);ctx.lineTo(-r*.23,-r*.97);ctx.moveTo(-r*.55,r*.53);ctx.lineTo(-r*.23,r*.97);ctx.stroke()}
  }
  if(e.slow>0){ctx.strokeStyle='#9dfff1';ctx.globalAlpha=.6+Math.sin(time*11)*.2;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,r+6,0,2*Math.PI);ctx.stroke()}
  ctx.restore();
  if(e.hp<e.maxHp||e.type==='titan'){let bw=e.type==='titan'?50:30;ctx.fillStyle='#071d29';roundRect(ctx,x-bw/2,y-r-12,bw,5,2);ctx.fill();ctx.fillStyle=e.hp/e.maxHp>.45?'#7ee3a2':'#f69a76';roundRect(ctx,x-bw/2,y-r-12,bw*clamp(e.hp/e.maxHp,0,1),5,2);ctx.fill()}
 }
 function drawProjectiles(){for(let p of state.projectiles){let x=p.x*CELL,y=p.y*CELL;ctx.save();ctx.shadowColor=p.color;ctx.shadowBlur=p.type==='mortar'?15:8;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(x,y,p.type==='mortar'?9:4.4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffffffdd';ctx.beginPath();ctx.arc(x,y,2.7,0,Math.PI*2);ctx.fill();ctx.restore()}}
 function drawEffects(){for(let e of state.effects){let a=clamp(e.life/e.max,0,1);ctx.save();ctx.globalAlpha=a;if(e.type==='beam'){
   let x=e.x*CELL,y=e.y*CELL,x2=e.x2*CELL,y2=e.y2*CELL;ctx.shadowBlur=12;ctx.shadowColor=e.color;ctx.strokeStyle=e.color;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x,y);let midx=(x+x2)/2,midy=(y+y2)/2;ctx.lineTo(midx+6,midy-9);ctx.lineTo(x2,y2);ctx.stroke();ctx.strokeStyle='#ffffff';ctx.lineWidth=1.3;ctx.stroke();
  }else{ctx.strokeStyle=e.color;ctx.shadowColor=e.color;ctx.shadowBlur=e.type==='blast'?30:12;ctx.lineWidth=e.type==='blast'?13:3;ctx.beginPath();ctx.arc(e.x*CELL,e.y*CELL,e.r*CELL,0,2*Math.PI);ctx.stroke();if(e.type==='blast'){ctx.fillStyle=colorAlpha(e.color,.085);ctx.fill()}}
  ctx.restore()}
  for(let p of state.particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x*CELL,p.y*CELL,p.size,0,2*Math.PI);ctx.fill()}ctx.globalAlpha=1;
 }
 function draw(){if(window.AETHERFRONT_3D_ENABLED)return;const dpr=canvas.width/W;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);ctx.save();if(shake>0)ctx.translate((Math.sin(time*42)*shake),Math.cos(time*29)*shake*.55);ctx.drawImage(terrainCanvas,0,0);
  // Ambient light shafts: animated yet inexpensive and subtle.
  ctx.fillStyle='rgba(134,253,219,.038)';for(let i=0;i<5;i++){let px=(time*12+i*244)%(W+180)-90;ctx.beginPath();ctx.ellipse(px,H*.4,36,H*.85,-.19,0,Math.PI*2);ctx.fill()}
  drawPath();drawSelection();for(let t of state.towers)towerDraw(t);for(let e of state.enemies)mobDraw(e);drawProjectiles();drawEffects();drawHover();ctx.restore();
  // Crisp canvas coordinate labels always rendered above game action.
  ctx.save();ctx.fillStyle='#c5ffebc7';ctx.font='700 11px system-ui';ctx.textBaseline='top';ctx.fillText('AEGIS PERIMETER  //  GRID '+COLS+'×'+ROWS,13,12);ctx.restore();
 }
 function resize(){const dpr=Math.min(window.devicePixelRatio||1,2.5);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);draw()}
 function frame(now){animationId=requestAnimationFrame(frame);let dt=clamp((now-lastTime)/1000,0,.05);lastTime=now;if(!paused&&!gameOver&&gameStarted)step(dt*speed);else time+=dt*.15;draw();if((Math.floor(now/110)!==Math.floor((now-16)/110)))updateUI()}
 function start(){if(gameOver||!gameStarted){reset();gameStarted=true}paused=false;gameOver=false;$('overlay').classList.add('hidden');updateUI();showNotice('Select a turret and build your defense')}
 function showHelp(){paused=true;$('overlayTitle').innerHTML='COMMAND THE<br/><em>BATTLEFIELD.</em>';$('overlayDesc').innerHTML='Choose one of four turrets, then tap an empty cell. Towers reroute ground enemies; completely blocking the path is not allowed. Tap an installed tower to upgrade or sell. Survive 15 waves. Fill the energy meter to call an orbital strike. Keyboard: 1–4 towers, SPACE wave, P pause, X speed.';$('overlayBtn').innerHTML='RETURN TO DEFENSE <span>↗</span>';$('overlay').classList.remove('hidden')}
 // Read-only renderer bridge plus grid-position input. Original gameplay logic remains canonical.
 window.AetherfrontCore={
  snapshot:()=>({state,previewPath,selectedType,selectedPlaced,hoverCell,abilityMode,gameStarted,gameOver,paused,time,ENTRY,EXIT,wallCoords}),
  tap:boardTap,hover:(x,y)=>{hoverCell=Number.isFinite(x)&&Number.isFinite(y)?{x,y}:null},
  get isReady(){return gameStarted&&!gameOver}
 };
 // Event wiring
 document.querySelectorAll('.tower-button').forEach(b=>b.addEventListener('click',()=>{if(!gameStarted||gameOver)return;setTower(b.dataset.tower);soundEffect('coin')}));
 canvas.addEventListener('pointermove',ev=>{hoverCell=screenCell(ev)});canvas.addEventListener('pointerleave',()=>hoverCell=null);canvas.addEventListener('pointerdown',boardClick);
 $('overlayBtn').addEventListener('click',()=>{if(gameStarted&&!gameOver&&paused&&$('overlayTitle').textContent.startsWith('COMMAND')){paused=false;$('overlay').classList.add('hidden');updateUI()}else start()});
 $('nextWaveBtn').addEventListener('click',startWave);$('upgradeBtn').addEventListener('click',upgrade);$('sellBtn').addEventListener('click',sell);
 $('abilityBtn').addEventListener('click',()=>{if(state.energy<100||gameOver)return;abilityMode=!abilityMode;selectedPlaced=null;syncSelection();updateUI();showNotice(abilityMode?'Select a strike location':'Orbital strike canceled')});
 $('pauseBtn').addEventListener('click',()=>{if(!gameStarted||gameOver)return;paused=!paused;updateUI();showNotice(paused?'Simulation paused':'Defense resumed')});
 $('speedBtn').addEventListener('click',()=>{speed=speed===1?2:1;updateUI();soundEffect('coin')});
 $('soundBtn').addEventListener('click',()=>{sound=!sound;$('soundBtn').textContent=sound?'♫':'♪̸';showNotice(sound?'Sound enabled':'Sound muted')});
 $('helpBtn').addEventListener('click',showHelp);
 document.addEventListener('keydown',ev=>{if(ev.code.startsWith('Digit')&&Number(ev.key)>=1&&Number(ev.key)<=4){let t=['pulse','tesla','mortar','cryo'][Number(ev.key)-1];if(gameStarted&&!gameOver)setTower(t)}else if(ev.code==='Space'){ev.preventDefault();if(gameStarted&&!gameOver)startWave()}else if(ev.code==='KeyP'||ev.code==='Escape'){$('pauseBtn').click()}else if(ev.code==='KeyX'){$('speedBtn').click()}});
 window.addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{if(document.hidden&&gameStarted&&!gameOver){paused=true;updateUI()}});
 buildTerrain();reset();resize();lastTime=performance.now();animationId=requestAnimationFrame(frame);
})();
