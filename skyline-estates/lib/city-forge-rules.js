/* Skyline Estates: City Forge. Original local construction rules; no profile economy writes. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CityForge=api})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
const VERSION=1,SAVE_KEY='skylineCityForge:v1',CAP=40;
const MATERIALS=['Timber','Steel','Glass','Energy'],ICONS=['▥','⚙','◇','ϟ'];
// Same ordered district palette as the classic board's GC; names and layout are original.
const DISTRICTS=[{name:'Lantern Quay',color:'#2a9d8f'},{name:'Jade Terraces',color:'#9ccc3d'},{name:'Azure Reach',color:'#f4a259'},{name:'Copper Works',color:'#e4572e'},{name:'Orchid Heights',color:'#b5179e'},{name:'Sunward Commons',color:'#6c4ab6'},{name:'Glasswater Park',color:'#3a7bd5'},{name:'Crownline Mile',color:'#c9a227'}];
const PLOTS=Array.from({length:24},(_,id)=>({id,district:Math.floor(id/3),name:DISTRICTS[Math.floor(id/3)].name+' '+['West','Central','East'][id%3]}));
const STOPS=['Harbor Gate','Timber Yard','Lantern Quay','Architect’s Brief','Steel Foundry','Jade Terraces','Ferry Pavilion','Glass Studio','Azure Reach','Public Tender','Energy Exchange','Copper Works','Civic Forum','Timber Depot','Orchid Heights','Architect’s Brief','Steel Wharf','Sunward Commons','Skyline Promenade','Glassworks','Public Tender','Energy Pier','City Dividend','Builder’s Market'].map((name,id)=>({id,name,kind:[3,15].includes(id)?'brief':[9,20].includes(id)?'tender':[0,6,12,18,22,23].includes(id)?'cash':'material',material:({1:0,4:1,7:2,10:3,13:0,16:1,19:2,21:3})[id]??(id%4)}));
const BUILDINGS={housing:{name:'Harbor Homes',icon:'⌂',cash:3,cost:[2,1,0,0],points:2},market:{name:'Exchange Hall',icon:'▤',cash:4,cost:[1,2,1,0],points:3},park:{name:'Sky Garden',icon:'♣',cash:2,cost:[1,0,0,1],points:2},tower:{name:'Beacon Tower',icon:'▥',cash:5,cost:[0,2,2,1],points:4}};
const CONTRACTS=[{id:'neighborhood',name:'A Place to Call Home',desc:'Two housing developments',kind:'housing',count:2,reward:5,cash:5},{id:'canopy',name:'Cooler Streets',desc:'Two Sky Gardens',kind:'park',count:2,reward:4,cash:4},{id:'commerce',name:'Local Enterprise',desc:'Two Exchange Halls',kind:'market',count:2,reward:5,cash:5},{id:'beacon',name:'A New Horizon',desc:'Two Beacon Towers',kind:'tower',count:2,reward:6,cash:6},{id:'mixed',name:'Life Between Buildings',desc:'Three different building types',diversity:3,reward:5,cash:5},{id:'rise',name:'Built to Last',desc:'A stage-three development',level:3,reward:5,cash:4}];
const CARDS=[{name:'Reclaimed Potential',desc:'Salvage timber or earn a small design fee.',choices:[{label:'Recover 3 timber',mat:[3,0,0,0]},{label:'Design fee · 4 credits',cash:4}]},{name:'Solar Partnership',desc:'Choose clean power or specialist glazing.',choices:[{label:'Gain 2 energy',mat:[0,0,0,2]},{label:'Gain 2 glass',mat:[0,0,2,0]}]},{name:'Community Workshop',desc:'Residents help your next development.',choices:[{label:'Gain 2 timber + 1 steel',mat:[2,1,0,0]},{label:'Community grant · 3 credits',cash:3}]},{name:'Precision Fabrication',desc:'A workshop offers a useful surplus.',choices:[{label:'Gain 2 steel',mat:[0,2,0,0]},{label:'Gain 1 glass + 1 energy',mat:[0,0,1,1]}]},{name:'Waterfront Festival',desc:'The city celebrates its growing skyline.',choices:[{label:'Visitor income · 5 credits',cash:5},{label:'Exhibit your work · 1 prestige',prestige:1}]}];
const clone=x=>JSON.parse(JSON.stringify(x)),integer=(v,min=0,max=100000)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
function rng(s){let x=s.rng|0;x^=x<<13;x^=x>>>17;x^=x<<5;s.rng=x>>>0;return s.rng/4294967296}
const note=(s,t)=>{s.log.push(t);if(s.log.length>50)s.log.shift()};
const gain=(p,mat)=>{if(mat)mat.forEach((v,i)=>p.mat[i]=Math.min(CAP,p.mat[i]+v))};
const has=(p,mat,cash=0)=>p.cash>=cash&&mat.every((v,i)=>p.mat[i]>=v);
const pay=(p,mat,cash=0)=>{mat.forEach((v,i)=>p.mat[i]-=v);p.cash-=cash};
function quote(length='standard'){const rounds=length==='quick'?8:12,creditsPerAction=Math.max(...Object.values(BUILDINGS).map(b=>b.cash+4),8,4),credits=rounds*2*creditsPerAction;return{rounds,creditsPerAction,credits,coinsPerCredit:100,reserve:credits*100,winnerBonus:credits*200}}
function create({seed=12345,ai=2,humans=2,mode='solo',length='standard',names=[],funded=false}={}){
 mode=mode==='pass'?'pass':'solo';const count=mode==='pass'?Math.max(2,Math.min(4,Number(humans)||2)):Math.max(2,Math.min(4,(Number(ai)||1)+1));
 const n=Number.isInteger(seed)?seed>>>0:12345;
 const s={version:VERSION,ruleset:'skyline-city-forge',id:'forge-'+n,seed:n,rng:n||1,mode,funded:!!funded,history:[],round:1,maxRounds:length==='quick'?8:12,turn:0,turnNo:0,phase:'roll',actions:0,players:Array.from({length:count},(_,id)=>({id,name:String(names[id]||(id===0?'You':['Mia','Noah','Zara'][id-1])).replace(/[<>]/g,'').slice(0,18),ai:mode==='solo'&&id>0,cash:funded?quote(length).credits:16,mat:[3,2,1,1],pos:0,prestige:0,turns:0})),plots:PLOTS.map(p=>({...p,owner:null,kind:null,level:0})),market:[10,10,10,10],contracts:[],deck:[],claimed:[],civic:[],pending:null,lastRoll:null,winner:null,log:['Welcome to City Forge. Build a city worth sharing.']};
 s.deck=CONTRACTS.map(c=>c.id);for(let i=s.deck.length-1;i>0;i--){const j=Math.floor(rng(s)*(i+1));[s.deck[i],s.deck[j]]=[s.deck[j],s.deck[i]]}s.contracts=s.deck.splice(0,3);return s;
}
const buildings=(s,pid)=>s.plots.filter(p=>p.owner===pid&&p.level>0);
function score(s,pid){const owned=buildings(s,pid),p=s.players[pid];let built=owned.reduce((n,t)=>n+BUILDINGS[t.kind].points*t.level,0),links=0,mixed=0;
 for(const t of owned)if(t.id%3<2&&owned.some(b=>b.id===t.id+1&&b.kind===t.kind))links++;
 for(let d=0;d<DISTRICTS.length;d++)if(new Set(owned.filter(t=>t.district===d).map(t=>t.kind)).size>=2)mixed+=2;
 const civic=s.civic.filter(id=>id===pid).length*3;return{built,links,mixed,civic,prestige:p.prestige,total:built+links+mixed+civic+p.prestige};
}
const ranking=s=>s.players.map(p=>({...p,...score(s,p.id)})).sort((a,b)=>b.total-a.total||b.cash-a.cash||a.id-b.id);
const price=(s,i)=>[2,3,3,2][i]+(s.market[i]<4?1:0);
function cost(plot,kind){const b=BUILDINGS[kind];if(!b)return null;const m=plot.level?plot.level+1:1;return{cash:b.cash+(m-1)*2,mat:b.cost.map(n=>n? n+Math.floor((m-1)/2):0)}}
function contractReady(s,pid,id){const c=CONTRACTS.find(c=>c.id===id),bs=buildings(s,pid);return !!c&&(c.kind?bs.filter(b=>b.kind===c.kind).length>=c.count:c.diversity?new Set(bs.map(b=>b.kind)).size>=c.diversity:bs.some(b=>b.level>=c.level))}
function vector(v){return Array.isArray(v)&&v.length===4&&v.every(x=>integer(x,0,3))}
function tradeOK(s,from,to,give,get){if(!integer(from,0,s.players.length-1)||!integer(to,0,s.players.length-1))return false;const p=s.players[from],q=s.players[to];return !!p&&!!q&&from!==to&&vector(give)&&vector(get)&&give.some(Boolean)&&get.some(Boolean)&&has(p,give)&&has(q,get)&&p.mat.every((v,i)=>v-give[i]+get[i]<=CAP)&&q.mat.every((v,i)=>v-get[i]+give[i]<=CAP)}
function legal(s,pid){if(!s||s.phase==='over')return[];
 if(s.phase==='trade')return s.pending.to===pid?[...(tradeOK(s,s.pending.from,pid,s.pending.give,s.pending.get)?[{type:'accept'}]:[]),{type:'decline'}]:[];
 if(pid!==s.turn)return[];if(s.phase==='roll')return[{type:'roll'}];if(s.phase==='event')return[{type:'choose',choice:0},{type:'choose',choice:1}];
 const p=s.players[pid],a=[{type:'end'}];if(s.actions<=0)return a;
 for(let i=0;i<4;i++){a.push({type:'gather',material:i});if(s.market[i]>=2&&p.cash>=price(s,i)*2)a.push({type:'buy',material:i});if(p.mat[i]>=2)a.push({type:'sell',material:i});for(let j=0;j<4;j++)if(i!==j&&p.mat[i]>=2&&p.mat[j]<CAP)a.push({type:'exchange',give:i,get:j});}
 a.push({type:'commission'});for(const t of s.plots){if(t.owner===null&&p.cash>=4)a.push({type:'claim',plot:t.id});else if(t.owner===pid&&t.level<3)for(const k of (t.kind?[t.kind]:Object.keys(BUILDINGS))){const c=cost(t,k);if(has(p,c.mat,c.cash))a.push({type:'build',plot:t.id,kind:k});}}
 for(const id of s.contracts)if(contractReady(s,pid,id))a.push({type:'contract',id});
 if(s.civic.length<8&&has(p,[0,1,1,1],4))a.push({type:'civic'});return a;
}
function next(s){s.players[s.turn].turns++;s.turnNo++;s.turn++;s.pending=null;s.actions=0;
 if(s.turn>=s.players.length){s.turn=0;if(s.round>=s.maxRounds){s.phase='over';s.winner=ranking(s)[0].id;note(s,s.players[s.winner].name+' wins City Forge!');return}
  s.round++;s.market=s.market.map(v=>Math.min(14,v+3));for(const p of s.players){p.cash+=2;gain(p,[0,1,0,0]);for(const b of buildings(s,p.id)){if(b.kind==='housing')p.cash+=b.level;else if(b.kind==='market'){p.cash+=1;gain(p,[0,1,0,0])}else if(b.kind==='park')gain(p,[0,0,0,1]);else gain(p,[0,0,1,0]);}}
  note(s,(s.round===s.maxRounds?'Final round! ':'Round '+s.round+'. ')+'City production delivered.');
 }s.phase='roll';
}
function apply(s,pid,a){const p=s.players[pid];
 if(s.phase==='trade'){const d=s.pending;if(a.type==='accept'){const q=s.players[d.from];pay(q,d.give);pay(p,d.get);gain(q,d.get);gain(p,d.give);note(s,p.name+' accepted '+q.name+'’s resource trade.')}else note(s,p.name+' declined the trade.');s.pending=null;s.phase='act';return;}
 if(a.type==='roll'){const dice=1+Math.floor(rng(s)*6),from=p.pos;p.pos=(p.pos+dice)%24;s.lastRoll={pid,from,to:p.pos,dice};s.actions=2;s.phase='act';if(from+dice>=24)p.cash+=3;const t=STOPS[p.pos];note(s,p.name+' rolled '+dice+' · '+t.name+'.');
  if(t.kind==='material'){const m=[0,0,0,0];m[t.material]=2;gain(p,m)}else if(t.kind==='cash')p.cash+=3;else if(t.kind==='brief'){s.phase='event';s.pending={card:Math.floor(rng(s)*CARDS.length)}}else p.cash+=2;return;
 }
 if(a.type==='choose'){const c=CARDS[s.pending.card],v=c.choices[a.choice];gain(p,v.mat);p.cash+=v.cash||0;p.prestige+=v.prestige||0;note(s,p.name+': '+c.name+' · '+v.label);s.phase='act';s.pending=null;return}
 if(a.type==='end'){next(s);return}
 s.actions--;
 if(a.type==='gather'){const m=[0,0,0,0];m[a.material]=2;gain(p,m);note(s,p.name+' gathered '+MATERIALS[a.material].toLowerCase()+'.')}
 else if(a.type==='commission'){p.cash+=3;note(s,p.name+' completed a small commission · +3 credits.')}
 else if(a.type==='buy'){p.cash-=price(s,a.material)*2;s.market[a.material]-=2;const m=[0,0,0,0];m[a.material]=2;gain(p,m);note(s,p.name+' bought '+MATERIALS[a.material].toLowerCase()+'.')}
 else if(a.type==='sell'){p.mat[a.material]-=2;p.cash+=price(s,a.material);s.market[a.material]=Math.min(14,s.market[a.material]+2);note(s,p.name+' sold materials.')}
 else if(a.type==='exchange'){p.mat[a.give]-=2;p.mat[a.get]++;note(s,p.name+' exchanged 2 '+MATERIALS[a.give]+' for 1 '+MATERIALS[a.get]+'.')}
 else if(a.type==='claim'){const t=s.plots[a.plot];t.owner=pid;p.cash-=4;note(s,p.name+' secured '+t.name+'.')}
 else if(a.type==='build'){const t=s.plots[a.plot],c=cost(t,a.kind);pay(p,c.mat,c.cash);t.kind=a.kind;t.level++;note(s,p.name+' built '+BUILDINGS[t.kind].name+' · stage '+t.level+'.')}
 else if(a.type==='contract'){const c=CONTRACTS.find(c=>c.id===a.id);p.prestige+=c.reward;p.cash+=c.cash;s.claimed.push({id:c.id,pid});const index=s.contracts.indexOf(c.id);if(s.deck.length)s.contracts[index]=s.deck.shift();else s.contracts.splice(index,1);note(s,p.name+' delivered “'+c.name+'” · +'+c.reward+' prestige.')}
 else if(a.type==='civic'){pay(p,[0,1,1,1],4);s.civic.push(pid);note(s,p.name+' contributed to Harbor Assembly · +3 civic points.')}
 else if(a.type==='trade'){s.pending={from:pid,to:a.to,give:a.give.slice(),get:a.get.slice()};s.phase='trade';note(s,p.name+' proposed a resource trade.')}
}
function act(s,pid,a){if(!s||!integer(pid,0,s.players.length-1)||!a||typeof a!=='object')return{ok:false,error:'Invalid action'};
 let allowed=false;if(a.type==='trade')allowed=s.phase==='act'&&s.turn===pid&&s.actions>0&&tradeOK(s,pid,a.to,a.give,a.get);else allowed=legal(s,pid).some(x=>Object.keys(x).every(k=>x[k]===a[k])&&Object.keys(a).every(k=>Object.hasOwn(x,k)));
 if(!allowed)return{ok:false,error:'That action is not available now.'};const copy=clone(s);apply(copy,pid,a);copy.history.push({pid,action:clone(a)});Object.assign(s,copy);return{ok:true};
}
function ai(s,pid){const L=legal(s,pid);if(!L.length)return null;const p=s.players[pid];if(s.phase==='trade'){const d=s.pending,fromValue=d.give.reduce((n,x,i)=>n+x*[2,3,3,2][i],0),toValue=d.get.reduce((n,x,i)=>n+x*[2,3,3,2][i],0);return L.find(a=>a.type===(fromValue>=toValue?'accept':'decline'))||L.at(-1)}
 if(s.phase==='roll'||s.phase==='event')return L[(pid+s.round)%L.length];
 const fav=Object.keys(BUILDINGS)[(pid+s.seed)%4];let best=null,value=-Infinity;
 for(const a of L){let v=-100;const owned=s.plots.filter(t=>t.owner===pid);if(a.type==='contract')v=100;else if(a.type==='build')v=35+BUILDINGS[a.kind].points*2+(a.kind===fav?7:0)-s.plots[a.plot].level*2;else if(a.type==='claim')v=owned.some(t=>!t.level)?-5:owned.length<5?25:1;else if(a.type==='commission')v=p.cash<7?31:2;else if(a.type==='civic')v=owned.length>=4?22:5;else if(a.type==='gather'){let need=0;for(const t of owned.filter(t=>t.level<3))for(const kind of(t.kind?[t.kind]:[fav])){const c=cost(t,kind);need=Math.max(need,c.mat[a.material]-p.mat[a.material])}v=need>0?24+need:4-p.mat[a.material]*.2;}
 if(v>value){best=a;value=v}}
 return best||L[0];
}
function restore(raw){try{if(typeof raw!=='string'||raw.length>100000)return{ok:false};const s=JSON.parse(raw),fail=()=>({ok:false,error:'Incompatible or damaged City Forge save.'});
 if(!s||s.version!==VERSION||s.ruleset!=='skyline-city-forge'||!['solo','pass'].includes(s.mode)||!integer(s.rng,0,4294967295)||!integer(s.seed,0,4294967295)||!Array.isArray(s.players)||s.players.length<2||s.players.length>4||!integer(s.turn,0,s.players.length-1)||![8,12].includes(s.maxRounds)||!integer(s.round,1,s.maxRounds)||!integer(s.turnNo,0,100)||!integer(s.actions,0,2)||!['roll','act','trade','event','over'].includes(s.phase))return fail();
 for(const [i,p]of s.players.entries())if(p.id!==i||typeof p.name!=='string'||p.name.length>18||typeof p.ai!=='boolean'||!integer(p.cash)||!integer(p.prestige)||!integer(p.turns,0,s.maxRounds)||!integer(p.pos,0,23)||!Array.isArray(p.mat)||p.mat.length!==4||!p.mat.every(n=>integer(n,0,CAP)))return fail();
 if(!Array.isArray(s.history)||s.history.length>600||typeof s.funded!=='boolean'||typeof s.id!=='string'||s.id.length>100)return fail();
 const expectedTurns=s.players.map(p=>s.phase==='over'?s.maxRounds:s.round-1+(p.id<s.turn?1:0));if(s.players.some((p,i)=>p.turns!==expectedTurns[i])||s.turnNo!==(s.phase==='over'?s.maxRounds*s.players.length:(s.round-1)*s.players.length+s.turn))return fail();
 if(!Array.isArray(s.plots)||s.plots.length!==PLOTS.length||!s.plots.every((p,i)=>p.id===i&&p.district===PLOTS[i].district&&p.name===PLOTS[i].name&&(p.owner===null||integer(p.owner,0,s.players.length-1))&&integer(p.level,0,3)&&(p.level===0?p.kind===null:p.owner!==null&&Object.hasOwn(BUILDINGS,p.kind))))return fail();
 if(!Array.isArray(s.market)||s.market.length!==4||!s.market.every(n=>integer(n,0,14))||!Array.isArray(s.contracts)||s.contracts.length>3||!Array.isArray(s.deck)||!Array.isArray(s.claimed)||!Array.isArray(s.civic)||s.civic.length>8||!s.civic.every(n=>integer(n,0,s.players.length-1))||!Array.isArray(s.log)||s.log.length>50||!s.log.every(t=>typeof t==='string'&&t.length<250))return fail();
 const ids=[...s.contracts,...s.deck,...s.claimed.map(c=>c.id)];if(ids.length!==6||new Set(ids).size!==6||!ids.every(id=>CONTRACTS.some(c=>c.id===id))||!s.claimed.every(c=>integer(c.pid,0,s.players.length-1)))return fail();
 if(s.lastRoll!==null){const r=s.lastRoll;if(!r||!integer(r.pid,0,s.players.length-1)||!integer(r.from,0,23)||!integer(r.to,0,23)||!integer(r.dice,1,6)||(r.from+r.dice)%24!==r.to)return fail()}
 if(s.phase==='trade'){const d=s.pending;if(!d||d.from!==s.turn||!tradeOK(s,d.from,d.to,d.give,d.get))return fail()}else if(s.phase==='event'){if(!s.pending||!integer(s.pending.card,0,CARDS.length-1))return fail()}else if(s.pending!==null)return fail();
 if(s.phase==='over'&&(s.winner!==ranking(s)[0].id||s.players.some(p=>p.turns!==s.maxRounds)))return fail();
 return{ok:true,state:s};}catch{return{ok:false,error:'Cannot read this City Forge save.'}}}
function verify(s,config){try{if(!restore(JSON.stringify(s)).ok)return false;const fresh=create(config||{seed:s.seed,mode:s.mode,ai:s.players.length-1,humans:s.players.length,length:s.maxRounds===8?'quick':'standard',names:s.players.map(p=>p.name),funded:s.funded});fresh.id=s.id;for(const h of s.history)if(!act(fresh,h.pid,h.action).ok)return false;return JSON.stringify(fresh)===JSON.stringify(s)}catch{return false}}
return Object.freeze({VERSION,SAVE_KEY,CAP,MATERIALS,ICONS,DISTRICTS,PLOTS,STOPS,BUILDINGS,CONTRACTS,CARDS,create,legal,act,ai,score,ranking,price,cost,contractReady,quote,verify,serialize:s=>JSON.stringify(s),restore});
});
