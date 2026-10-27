const assert=require('node:assert/strict'),vm=require('node:vm'),{source,section,line}=require('./audited-rules.cjs'),{game,dice}=require('./turn-cases.cjs'),{applyRoll}=require('./turn-kernel.cjs');
const c=vm.createContext({});vm.runInContext(section('const TOKEN_LV=[','const TL_MAX=')+'\n'+line('const PAYDAY=')+'\nthis.tokens=Object.keys(TOKEN_POWER);this.power=tokenPower;this.payday=PAYDAY;',c);
let checks=0;const fingerprints=new Set();
for(const token of c.tokens){fingerprints.add(JSON.stringify(Array.from({length:6},(_,i)=>{const p=c.power(token,i+1);return[p.pay,p.rr,p.pass,p.shield,p.surge,p.coinX,p.xpX]})));
 for(let tier=1;tier<=6;tier++){
  const power=c.power(token,tier),make=()=>{const g=game();g.players[0].tok=token;g.players[1].tok=token==='🛺'?'🚌':'🛺';g.players[0].tl=tier;g.players[0].cash=1000;g.set.perks=true;g.set.goDouble=false;g.players[0].rrUsed=power.rr;return g};
  for(const enabled of [false,true]){const g=make();g.set.perks=enabled;g.players[0].pos=38;const r=applyRoll(g,'host-uid',dice(1,1));assert.equal(r.game.players[0].cash,1000+Math.round(c.payday*(1+(enabled?power.pay:0)))*(enabled&&power.surge?3:1),token+' '+tier+' Start');assert.equal(r.game.houses,36);assert.equal(r.game.hotels,12);checks++}
  {const g=make();delete g.players[0].rrUsed;const r=applyRoll(g,'host-uid',dice(3,4));assert.equal(r.boundary.kind,power.rr?'reroll':'purchase',token+' '+tier+' reroll');if(power.rr)assert.equal(r.boundary.remaining,power.rr);checks++}
  {const g=make();g.doubles=2;const r=applyRoll(g,'host-uid',dice(1,1));assert.equal(r.game.players[0].inJail,!power.pass,token+' '+tier+' Lucky Pass');checks++}
  {const g=make();g.own[7].o=1;const r=applyRoll(g,'host-uid',dice(3,4));assert.equal(r.game.players[0].cash,1000-(power.shield?4:7),token+' '+tier+' shield');checks++}
  for(const k of ['pay','coinX','xpX'])assert.ok(power[k]>=0&&power[k]<=.25);
  assert.ok(power.rr<=3&&power.pass<=3&&power.shield<=1&&power.surge<=1);
 }
}
{const legacy=game();delete legacy.tokenPowerVersion;legacy.players[0].tl=2;const old=applyRoll(legacy,'host-uid',dice(3,4));assert.equal(old.boundary.kind,'reroll','legacy saves keep their original shared perks');const fresh=game();fresh.players[0].tl=2;assert.equal(fresh.tokenPowerVersion,2);assert.equal(applyRoll(fresh,'host-uid',dice(3,4)).boundary.kind,'purchase','new Bus uses its own protection path');const future=game();future.tokenPowerVersion=3;assert.throws(()=>applyRoll(future,'host-uid',dice(3,4)));checks+=3}
assert.equal(fingerprints.size,16,'all sixteen complete power paths differ');
console.log('TOKEN POWERS SUMMARY',JSON.stringify({tokens:c.tokens.length,tiers:6,gameplayChecks:checks,uniquePaths:fingerprints.size}));
