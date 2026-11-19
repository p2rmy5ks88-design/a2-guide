/* Original, resolution-independent legend illustrations. Match data supplies
 * the perimeter colors and district captions; these never represent ownership.
 */
const wrap=body=>`<svg viewBox="0 0 160 110" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
export function boardOverviewArt(squares){
 let tiles='';for(let i=0;i<40;i++){const side=Math.floor(i/10),n=i%10,x=side===0?0:side===1?n:side===2?10:10-n,y=side===0?10-n:side===1?0:side===2?n:10;const c=squares[i].color||'#e2c57b';tiles+=`<rect x="${x*10+1}" y="${y*10+1}" width="8.5" height="8.5" rx="1" fill="#f5eddd" stroke="#938261" stroke-width=".5"/><rect x="${x*10+1}" y="${y*10+1}" width="8.5" height="2.5" fill="${c}"/>`;}
 return wrap(`<g transform="matrix(.68 .34 -.68 .34 80 12)"><rect x="-3" y="4" width="116" height="116" rx="5" fill="#805625"/><rect x="-3" y="-3" width="116" height="116" rx="5" fill="#edcd82" stroke="#fff1bd" stroke-width="2"/><rect x="10" y="10" width="90" height="90" fill="#277b67"/>${tiles}<rect x="24" y="25" width="62" height="60" rx="15" fill="#20384b" stroke="#c6d2c0" stroke-width="4"/><ellipse cx="55" cy="54" rx="19" ry="14" fill="#45b8d2"/><path d="M52 66V40l4-7 4 7v26" fill="#f1ece0" stroke="#d9b86c" stroke-width="2"/></g>`);
}
export function buildingArt(stage,color='#548bb2'){
 const h=[0,26,45,65][stage],x=65,y=85;let body='';
 if(stage){body=`<path d="M${x-20} ${y-h}l27-12 24 12-27 13z" fill="#f6e4be" stroke="#d1ac5e"/><path d="M${x-20} ${y-h}v${h}l27 12V${y-h+13}z" fill="${color}"/><path d="M${x+7} ${y-h+13}l24-13v${h}l-24 12z" fill="#172f4b"/>`;
  for(let r=0;r<Math.floor(h/9);r++)for(let c=0;c<3;c++)body+=`<path d="M${x-16+c*8} ${y-h+8+r*9}v5l4 2v-5z" fill="${r%2?'#a6d7ec':'#ffe2a2'}"/><path d="M${x+11+c*6} ${y-h+17+r*9}v4l3-1.5v-4z" fill="#f2d49b"/>`;
  if(stage===3)body+=`<path d="M72 14V3l4 9v9" fill="#e6c47c"/><path d="M52 24l27-11 18 9" fill="none" stroke="#ffe0a0" stroke-width="3"/>`;
 }
 return wrap(`<ellipse cx="81" cy="98" rx="48" ry="7" fill="#030e1b" opacity=".45"/><path d="M28 87l50-23 53 23-51 22z" fill="#a87630"/><path d="M28 82l50-23 53 23-51 23z" fill="#ecd18b" stroke="#fff1bd"/><path d="M36 82l42-18 44 18-42 18z" fill="${stage?'#596876':'#679a55'}"/>${body}`);
}
export function districtArt(color,variant=0){
 return `<svg viewBox="0 0 180 64" aria-hidden="true" focusable="false"><rect width="180" height="64" fill="#15283e"/><path d="M0 57l180-14v21H0z" fill="#2d6780"/><path d="M0 52l180-14" stroke="#deb96c" stroke-width="3"/>${[0,1,2,3,4,5].map((n)=>{const x=8+n*28,h=18+(n*11+variant*7)%27;return `<rect x="${x}" y="${48-h}" width="21" height="${h}" fill="${n%2?color:'#b2b6b0'}"/><path d="M${x-2} ${48-h}l12-5 13 5" fill="#e1c080"/>${[0,1,2].map(r=>`<path d="M${x+4} ${52-h+r*7}h12" stroke="${r%2?'#bee4ec':'#ffe3a3'}" stroke-width="3"/>`).join('')}`;}).join('')}</svg>`;
}
