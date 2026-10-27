// Reproducible fixtures only; production randomness never uses this seeded generator.
const vm=require('node:vm'),{source,line}=require('./audited-rules.cjs');
const tokens=vm.runInNewContext(line('const TOKENS=')+'\n'+line('const NEW_TOKENS=')+'\nTOKENS.concat(NEW_TOKENS)'),colors=vm.runInNewContext(line('const PCOL=')+'\nPCOL');
const defaults={mode:'classic',city:'lagos',theme:'lagos',cash:1600,rounds:20,ai:'normal',speed:'normal',timer:0,minigames:true,perks:true,ffa:false,events:false,speedDie:false,pot:false,goDouble:false,jailRent:false,auction:true,even:true,interest:true};
function config(n=2,settings={}){return{code:'ABCDE',settings:{...defaults,...settings},players:Array.from({length:n},(_,i)=>({uid:'seat-'+i,name:'Player '+i,tok:tokens[i],col:colors[i],ai:false,tl:1,fin:null,ch:null}))}}
function seededDraw(seed){let state=seed>>>0;const calls=[];function draw(max){state^=state<<13;state^=state>>>17;state^=state<<5;const value=(state>>>0)%max;calls.push({max,value});return value}return{draw,calls}}
function cases(){const out=[];let seed=8081;const add=(name,c)=>out.push({name,config:c,seed:seed++});
 for(const mode of ['classic','quick','timed'])for(let n=2;n<=6;n++)add(mode+' with '+n+' seats',config(n,{mode,cash:[1200,1600,2000][n%3],rounds:10}));
 const cities=Object.keys(JSON.parse(line('const CITY_RAW=').slice(15).replace(/;\s*$/,'')));for(const city of cities)add('city '+city,config(2,{city,theme:city}));
 for(const key of ['minigames','perks','ffa','events','speedDie','pot','goDouble','jailRent','auction','even','interest'])add('custom rule '+key,config(2,{[key]:!defaults[key]}));
 for(const token of tokens.slice(6)){const c=config();c.players[0].tok=token;add('unlocked token '+token,c)}
 for(let tl=1;tl<=6;tl++){const c=config();Object.assign(c.players[0],{tl,fin:'gold',ch:'nova'});add('trusted tier '+tl+' and cosmetics',c)}
 {const c=config(6);c.players.slice(1).forEach(p=>{p.ai=true;p.uid=null});add('host with five AI seats',c)}
 {const c=config();c.players[1].ai=true;add('authenticated AI stand-in',c)}
 {const c=config();c.players[0].name=' <Skyline> ';add('existing name cleanup',c)}
 return out;
}
function diceCases(){const out=[];for(const speedDie of [false,true])for(const lapped of [false,true])for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(const sv of speedDie&&lapped?[1,2,3,4,5,6]:[0])out.push({name:`dice ${a}/${b}/${sv} turbo=${speedDie} lapped=${lapped}`,speedDie,lapped,a,b,sv});return out}
module.exports={config,cases,diceCases,seededDraw,tokens};
