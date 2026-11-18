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
window.SkylineCircuitLife=Object.freeze({pulse:pulse,active:function(){return enabled&&!(reduce&&reduce.matches)},pause:function(){enabled=false;sync()},resume:function(){enabled=true;sync()}});
})();