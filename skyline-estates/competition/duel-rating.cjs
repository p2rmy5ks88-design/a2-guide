'use strict';
// Skyline Duel ranked ladder (server only): Glicko-2 rating, visible tiers, placement, 4-week seasons with a soft reset,
// the repeat-opponent rule and earned rewards. Pure functions; the service stores the records.
const EPOCH=Date.UTC(2026,10,2),SEASON_MS=28*864e5,PLACEMENT=5,DEFAULT={r:1500,rd:350,vol:0.06};
const TIERS=[['Bronze',0],['Silver',1400],['Gold',1550],['Platinum',1700],['Skyline Elite',1850]];
const seasonOf=t=>Math.max(1,Math.floor((t-EPOCH)/SEASON_MS)+1);
const seasonEnds=s=>EPOCH+s*SEASON_MS;
const tierOf=rec=>!rec||rec.games<PLACEMENT?'Placement':TIERS.filter(([,m])=>rec.r>=m).pop()[0];
// Soft reset: a new season starts halfway between last season's rating and the default, with more uncertainty.
const carry=prev=>prev?{r:Math.round((prev.r+DEFAULT.r)/2),rd:Math.min(350,Math.max(prev.rd,200)),vol:prev.vol}:{...DEFAULT};
// Glicko-2, one game per rating period (https://www.glicko.net/glicko/glicko2.pdf). score: 1 win, 0 loss, 0.5 draw.
function glicko2(me,opp,score,tau=0.5){
  const S=173.7178,mu=(me.r-1500)/S,phi=me.rd/S,mu2=(opp.r-1500)/S,phi2=opp.rd/S;
  const g=1/Math.sqrt(1+3*phi2*phi2/(Math.PI*Math.PI)),E=1/(1+Math.exp(-g*(mu-mu2))),v=1/(g*g*E*(1-E)),d=v*g*(score-E);
  const a=Math.log(me.vol*me.vol),f=x=>Math.exp(x)*(d*d-phi*phi-v-Math.exp(x))/(2*Math.pow(phi*phi+v+Math.exp(x),2))-(x-a)/(tau*tau);
  let A=a,B;if(d*d>phi*phi+v)B=Math.log(d*d-phi*phi-v);else{let k=1;while(f(a-k*tau)<0)k++;B=a-k*tau}
  let fA=f(A),fB=f(B);for(let i=0;i<60&&Math.abs(B-A)>1e-6;i++){const C=A+(A-B)*fA/(fB-fA),fC=f(C);if(fC*fB<=0){A=B;fA=fB}else fA/=2;B=C;fB=fC}
  const vol=Math.exp(A/2),pre=Math.sqrt(phi*phi+vol*vol),phiN=1/Math.sqrt(1/(pre*pre)+1/v),muN=mu+phiN*phiN*g*(score-E);
  return{r:Math.round(muN*S+1500),rd:Math.max(30,Math.round(phiN*S)),vol:+vol.toFixed(5)}}
const REWARD={win:{coins:300,xp:600},loss:{coins:80,xp:200},streak:{3:100,5:250},dailyCap:10};
// Rewards for one finished ranked Duel. day = {date,n} counts rewarded duels today (UTC).
function reward(won,streak,day){if(day.n>=REWARD.dailyCap)return{coins:0,xp:0,capped:true};const b=won?REWARD.win:REWARD.loss;
  return{coins:b.coins+(won&&REWARD.streak[streak]||0),xp:b.xp,streakBonus:won&&REWARD.streak[streak]||0}}
module.exports={EPOCH,SEASON_MS,PLACEMENT,DEFAULT,TIERS,REWARD,seasonOf,seasonEnds,tierOf,carry,glicko2,reward};
