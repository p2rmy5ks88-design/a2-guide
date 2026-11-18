/* Skyline Circuit living diorama.
   Pure presentation layer: all game actions still go through SkylineCircuit. */
(function(){
"use strict";
var game=document.getElementById("game");
var board=document.getElementById("board");
var park=document.getElementById("innerGarden");
var hud=document.getElementById("hud");
if(!game||!board||!park||!hud)return;
var world=document.createElement("div");
world.id="circuitLivingWorld";
world.setAttribute("aria-hidden","true");
world.innerHTML='<div class="lifeSky"></div><div class="lifeHorizon"></div><div class="lifeHarbour"><i class="lifeWave" style="--y:38%;--duration:9s"></i><i class="lifeWave" style="--y:56%;--duration:13s"></i><i class="lifeWave" style="--y:72%;--duration:11s"></i></div><i class="lifeBoat"></i>';
var skyline=[
 [2,24,18],[12,31,22],[24,19,13],[34,36,20],[45,25,18],
 [57,30,21],[70,42,17],[80,23,24],[91,34,19]
];
skyline.forEach(function(spec){
 var tower=document.createElement("i");
 tower.className="lifeTower";
 tower.style.setProperty("--x",spec[0]+"%");
 tower.style.setProperty("--h",spec[1]+"%");
 tower.style.setProperty("--w",spec[2]+"px");
 world.querySelector(".lifeHorizon").appendChild(tower);
});
game.insertBefore(world,game.firstChild);
var details=document.createElement("div");
details.className="lifeBoardDetails";
details.setAttribute("aria-hidden","true");
details.innerHTML='<i class="lifeCar first"></i><i class="lifeCar second"></i><i class="lifeParkGlow"></i>';
board.appendChild(details);
var spray=document.createElement("i");
spray.className="lifeFountain";
spray.setAttribute("aria-hidden","true");
park.appendChild(spray);
var button=document.createElement("button");
button.id="lifeMotionToggle";
button.type="button";
button.setAttribute("aria-label","Toggle living city animations");
hud.appendChild(button);
var key="skylineCircuitTabletopLifeMotion";
var reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)");
var saved=null;
try{saved=localStorage.getItem(key)}catch(e){}
var enabled=saved==="on"||(saved!=="off"&&!(reduce&&reduce.matches));
function sync(){
 var active=enabled&&!(reduce&&reduce.matches);
 game.classList.toggle("scenePaused",!active||document.hidden);
 button.textContent=active?"✦ Living City: On":"✦ Living City: Paused";
 button.setAttribute("aria-pressed",String(active));
}
button.addEventListener("click",function(){
 enabled=!(enabled&&!(reduce&&reduce.matches));
 try{localStorage.setItem(key,enabled?"on":"off")}catch(e){}
 sync();
});
document.addEventListener("visibilitychange",sync);
if(reduce&&reduce.addEventListener)reduce.addEventListener("change",sync);
// The city breathes with the ACTUAL match: only owned, developed lots illuminate
// corresponding background districts. This is derived display state, never rules.
var lastDevelopment="";
function reflect(view){
 if(!view||!Array.isArray(view.nodes))return;
 var quarters=[0,0,0,0],owned=0,developed=0;
 view.nodes.forEach(function(node){
  if(node.type!=="property"||node.owner<0)return;
  owned++;
  var stage=Math.max(0,Math.min(4,Number(node.stage)||0));
  if(stage>0){developed++;quarters[node.quadrant||0]+=stage;}
 });
 var fingerprint=quarters.join(":")+":"+owned+":"+developed;
 if(fingerprint===lastDevelopment)return;
 lastDevelopment=fingerprint;
 world.dataset.owned=String(owned);
 world.dataset.developed=String(developed);
 var towers=world.querySelectorAll(".lifeTower");
 towers.forEach(function(tower,index){
  var weight=quarters[index%4];
  var isLit=weight>=(index>=4?5:1);
  tower.classList.toggle("cityLit",isLit);
  tower.dataset.lit=String(isLit);
 });
 // City traffic accelerates gently as actual streets are developed.
 // No setInterval, no frame-loop JS; transitions stay CSS/compositor driven.
 details.style.setProperty("--traffic-first",String(31-Math.min(9,developed*.42))+"s");
 details.style.setProperty("--traffic-second",String(38-Math.min(10,developed*.45))+"s");
}
function pulse(kind,id){
 if(!id)return;
 var tile=board.querySelector('.tile[data-node="'+String(id).replace(/[^OI0-9]/g,"")+'"]');
 if(!tile)return;
 var name=kind==="buy"?"lifePurchase":kind==="build"?"lifeBuild":kind==="card"?"lifeEvent":null;
 if(!name)return;
 tile.classList.remove(name);
 void tile.offsetWidth;
 tile.classList.add(name);
 window.setTimeout(function(){tile.classList.remove(name)},850);
}
sync();
window.SkylineCircuitLife=Object.freeze({pulse:pulse,reflect:reflect,active:function(){return enabled&&!(reduce&&reduce.matches)},pause:function(){enabled=false;sync()},resume:function(){enabled=true;sync()}});
})();