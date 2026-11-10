#!/usr/bin/env python3
"""Apply an offline-only Championship prototype on the isolated feature branch."""
from pathlib import Path
import hashlib, re, subprocess, sys
root=Path(__file__).resolve().parents[2]
game=root/"skyline-estates/game.html"
audit=root/"skyline-estates/security/service/audited-rules.cjs"
src=game.read_text(encoding="utf-8")
if "function skylineChampionshipScore(" in src:
    print("Prototype already present")
    sys.exit(0)
def change(old,new):
    global src
    if src.count(old)!=1: raise RuntimeError("Not exactly one source anchor: "+old[:100])
    src=src.replace(old,new.replace("@{",chr(36)+"{"),1)

change(
"const MODES=[['classic','Classic','Play until one landlord is left standing.'],['quick','Quick deal','Everyone starts with 2 random properties. The first bankruptcy ends the game and the richest wins.'],['timed','Round limit','Play a set number of rounds. The richest landlord wins.']];",
"const MODES=[['classic','Classic Endurance','Unlimited rounds. Play until one landlord is left standing.'],['quick','Quick deal','Everyone starts with 2 random properties. The first bankruptcy ends the game and the richest wins.'],['timed','Skyline Championship','Play a fixed number of rounds. Best portfolio wins unless bankruptcy comes first.']];")
change("function startFromSetup(T,slots){const act=slotPlayers(slots||setup.slots);",
       "function startFromSetup(T,slots,overrideSet){const act=slotPlayers(slots||setup.slots);")
change("initAudio();newGame({cash:setup.cash,set:cfgSet(),players:act.map(",
       "initAudio();const gameSet=Object.assign(cfgSet(),overrideSet||{});if(gameSet.mode==='timed')gameSet.championship=1;newGame({cash:setup.cash,set:gameSet,players:act.map(")
change("T.querySelector('#qAI').onclick=()=>{const me=setup.slots[0];startFromSetup(T,setup.slots.map((s,i)=>({...s,type:i===0?'human':i<4?'ai':'off',tok:i===0?me.tok:s.tok})))};",
       "T.querySelector('#qAI').onclick=()=>{const me=setup.slots[0];startFromSetup(T,setup.slots.map((s,i)=>({...s,type:i===0?'human':i<4?'ai':'off',tok:i===0?me.tok:s.tok})),{mode:'timed',rounds:30,championship:1})};")
change("[[10,'10'],[20,'20'],[30,'30'],[45,'45']]","[[20,'20'],[30,'30'],[40,'40'],[45,'45']]")
change("function standings(){return [...G.players].sort((a,b)=>(a.bankrupt-b.bankrupt)||netWorth(b)-netWorth(a))}",
"""function skylineChampionshipActive(){return !!(G&&G.set&&G.set.mode==='timed'&&G.set.championship===1&&!G.online)}
function skylineChampionshipScore(p){
  const sc={cash:Math.round(p.cash),properties:0,buildings:0,districts:0,landmarks:0,total:0};
  if(p.bankrupt)return sc;
  for(const i of propsOf(p.id)){const o=G.own[i],s=SQ[i];
    sc.properties+=o.m?s.p/2:s.p;sc.buildings+=o.h*(s.h||0)}
  for(const g of Object.keys(GROUPS)){if(!ownsAll(p.id,g))continue;
    sc.districts+=Math.round(GROUPS[g].reduce((t,i)=>t+SQ[i].p,0)*.10);
    const landmark=G.lm&&G.lm[g];
    if(landmark&&landmark.pid===p.id&&G.own[landmark.i].o===p.id)
      sc.landmarks+=Math.round(SQ[landmark.i].p*.25/5)*5}
  sc.total=Math.round(sc.cash+sc.properties+sc.buildings+sc.districts+sc.landmarks);return sc}
function standings(){if(!skylineChampionshipActive())return [...G.players].sort((a,b)=>(a.bankrupt-b.bankrupt)||netWorth(b)-netWorth(a));
  return [...G.players].sort((a,b)=>(a.bankrupt-b.bankrupt)||skylineChampionshipScore(b).total-skylineChampionshipScore(a).total||netWorth(b)-netWorth(a)||a.id-b.id)}""")
change("return Math.max(lvl().reserve,Math.min(threat*.55,650))}",
       "const reserve=Math.max(lvl().reserve,Math.min(threat*.55,650));const left=skylineChampionshipActive()?G.set.rounds-G.round+1:Infinity;return p.ai&&left>=1&&left<=5?Math.round(reserve*.75):reserve}")
change("if(G.round-p.lastOffer>=3&&Math.random()<.5){const t=aiProposeTrade(p);",
       "const finalFive=skylineChampionshipActive()&&G.set.rounds-G.round+1<=5;"
       "if(G.round-p.lastOffer>=(finalFive?1:3)&&Math.random()<(finalFive?.8:.5)){const t=aiProposeTrade(p);")
change("G.set.mode==='timed'?' of '+G.set.rounds:''",
       "G.set.mode==='timed'?' of '+G.set.rounds+(skylineChampionshipActive()&&G.round<=G.set.rounds&&G.set.rounds-G.round<5?' · 🔔 '+(G.set.rounds-G.round===0?'FINAL ROUND':(G.set.rounds-G.round+1)+' ROUNDS LEFT'):''):''")
# Update only the new results screen; preserve the old function and old saved games.
start=src.index("async function finish(){")
old='<div class="mtxt muted">Final standings</div><div class="stand">'
assert src[start:].count(old)==1
src=src[:start]+src[start:].replace(old,
  """<div class="mtxt muted">@{skylineChampionshipActive()?'Final Championship Score':'Final standings'}</div><div class="stand">""".replace("@{",chr(36)+"{"),1)
start=src.index("async function finish(){")
old="fmt(p.bankrupt?0:netWorth(p))"
assert src[start:].count(old)==1
src=src[:start]+src[start:].replace(old,
    "fmt(p.bankrupt?0:skylineChampionshipActive()?skylineChampionshipScore(p).total:netWorth(p))",1)
game.write_text(src,encoding="utf-8",newline="\n")
s=audit.read_text(encoding="utf-8")
h=hashlib.sha256(src.replace("\r\n","\n").encode()).hexdigest()
s,n=re.subn("(const expectedSourceHash=')[a-f0-9]{64}(';)",lambda m:m[1]+h+m[2],s)
assert n==1
audit.write_text(s,encoding="utf-8",newline="\n")
subprocess.run([sys.executable,str(root/"skyline-estates/build.py")],check=True,cwd=root)
subprocess.run([sys.executable,str(root/"skyline-estates/build.py"),"--check"],check=True,cwd=root)
print("Pinned and rebuilt, SHA256",h)
