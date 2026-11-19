/* Shared Skyline board HUD helpers (presentation only). Every value shown is passed in from the board's rules view;
   nothing here reads or changes match state. */
export const ICON={
 crown:'<svg viewBox="0 0 24 24"><path fill="#F2C457" d="M2 18 4 7l5 5 3-7 3 7 5-5 2 11z"/><rect x="2" y="19" width="20" height="2.5" fill="#C99A3B"/></svg>',
 globe:'<svg viewBox="0 0 24 24" fill="none" stroke="#F2C457" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>',
 bars:'<svg viewBox="0 0 24 24"><g fill="#F2C457"><rect x="3" y="12" width="3" height="9"/><rect x="8" y="8" width="3" height="13"/><rect x="13" y="4" width="3" height="17"/><rect x="18" y="10" width="3" height="11"/></g></svg>',
 chart:'<svg viewBox="0 0 24 24"><g fill="#F2C457"><rect x="3" y="15" width="3" height="6"/><rect x="8" y="12" width="3" height="9"/><rect x="13" y="9" width="3" height="12"/></g><path d="M3 11l6-4 4 3 7-6" stroke="#F6D27A" stroke-width="2" fill="none"/></svg>',
 flag:'<svg viewBox="0 0 24 24"><path d="M5 3v18" stroke="#F2C457" stroke-width="2"/><path d="M6 4h12l-3 4 3 4H6z" fill="#F2C457"/></svg>',
 shake:'<svg viewBox="0 0 24 24" fill="none" stroke="#F2C457" stroke-width="1.8"><path d="M2 12l4-4 4 2 4-2 4 2 4 4-6 5-4-3-4 3z"/></svg>',
 knight:'<svg viewBox="0 0 24 24"><path fill="#F2C457" d="M7 21h11v-2c0-4-2-6-2-9l2-3-3-3-4 2-5 6 2 2 3-2v3l-4 4z"/></svg>',
 map:'<svg viewBox="0 0 24 24" fill="none" stroke="#F2C457" stroke-width="1.8"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14"/></svg>',
 trophy:'<svg viewBox="0 0 24 24"><path fill="#F2C457" d="M7 3h10v4a5 5 0 0 1-10 0zM4 4h3v2a3 3 0 0 1-3-2zm16 0h-3v2a3 3 0 0 0 3-2zM11 12h2v4h3v3H8v-3h3z"/></svg>',
 temple:'<svg viewBox="0 0 24 24"><path fill="#F2C457" d="M12 2 2 7h20zM4 9h2v9H4zm4 0h2v9H8zm6 0h2v9h-2zm4 0h2v9h-2zM2 19h20v3H2z"/></svg>',
 book:'<svg viewBox="0 0 24 24" fill="none" stroke="#F2C457" stroke-width="1.8"><path d="M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1zM12 6v14"/></svg>',
 swords:'<svg viewBox="0 0 24 24" stroke="#F2C457" stroke-width="2.2" fill="none"><path d="M4 4l16 16M20 4 4 20"/></svg>',
 lock:'<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2" fill="#B6C5D1"/><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="#B6C5D1" stroke-width="2" fill="none"/></svg>',
 check:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#3fbf55"/><path d="M7 12l3 3 7-7" stroke="#fff" stroke-width="2.4" fill="none"/></svg>'};
export const fmt=n=>'SC '+Math.round(n).toLocaleString('en');
export const short=n=>{n=Math.round(n);return 'SC '+(Math.abs(n)>=10000?(n/1000).toFixed(1).replace(/\.0$/,'')+'k':n.toLocaleString('en'))};
export function panel(id,title,icon,{open=true,cls=''}={}){return `<details class="sk-panel ${cls}" id="${id}" ${open?'open':''}><summary>${ICON[icon]||''}<span>${title}</span></summary><div class="sk-body" id="${id}-b"></div></details>`}
export function brand(board,tier){return `<div class="sk-brand"><span class="bars"></span><div class="logo">SKYLINE<small>ESTATES</small></div><span class="sk-badge">${board}</span><span class="sk-badge dark sk-small">${tier}</span></div>`}
// Career order and difficulty come from the Career registry (lib/career.js). Lab pages are not linked to a profile, so no
// progress is claimed: the current board is highlighted, later boards show their real unlock requirement text.
export const CAREER=[{id:'origins',name:'Origins',tier:'Easy'},{id:'circuit',name:'Circuit',tier:'Normal'},{id:'dominion',name:'Dominion',tier:'Intermediate'},{id:'empire',name:'Empire',tier:'Advanced'}];
export function career(current){const i=CAREER.findIndex(b=>b.id===current);return `<div class="sk-career">${CAREER.map((b,k)=>`<div class="${k===i?'now':''}">${k<i?'<span class="sk-muted">'+(k+1)+'</span>':k===i?ICON.crown:ICON.lock}<span><b>${b.name}</b><small>${b.tier}${k===i?' · this board':''}</small></span></div>`).join('')}</div><div class="sk-muted sk-small" style="margin-top:.2rem">Local review: Career progress is not linked to this page.</div>`}
const stageSvg=k=>{const h=[3,8,13,18,23][k],w=[18,11,10,8,6][k];return `<svg viewBox="0 0 24 26">${k===0?'<path d="M2 22l10-4 10 4-10 4z" fill="#8bbf4a"/>':`<rect x="${12-w/2}" y="${25-h}" width="${w}" height="${h}" fill="#cfe2ff" stroke="#F2C457" stroke-width=".8"/>${k===4?'<path d="M12 0v3" stroke="#F2C457"/>':''}`}</svg>`};
export function stages(names,active){return `<div class="sk-stages">${names.map((n,k)=>`<div class="${k===active?'on':''}" data-stage-icon="${k}">${stageSvg(k)}${n}</div>`).join('')}</div>`}
export function checks(items){return items.map(([on,txt,cls='on'])=>`<div class="sk-check"><i class="${on?cls:''}">${on?'✓':''}</i><span>${txt}</span></div>`).join('')}
export function cards(players,{colors,avatars,turn,lead,lines}){return players.map(p=>`<div class="sk-card ${p.id===turn?'turn':''} ${p.out?'out':''}" style="--pc:${colors[p.id]}" data-player="${p.id}">
 <img src="${avatars[p.id]}" alt=""><div style="min-width:0"><div class="nm">${p.name}${p.id===lead?ICON.crown:''}</div>${lines(p).map(([k,v])=>`<div class="v"><span>${k}</span><b>${v}</b></div>`).join('')}</div></div>`).join('')}
export const AVATARS=['avatars/small/skyline_avatar_01_96.png','avatars/small/skyline_avatar_06_96.png','avatars/small/skyline_avatar_11_96.png','avatars/small/skyline_avatar_04_96.png'];
// Free board area in canvas pixels (between the side columns, above the player strip).
export function freeArea(canvas){const c=canvas.getBoundingClientRect(),L=document.querySelector('.sk-left')?.getBoundingClientRect(),R=document.querySelector('.sk-right')?.getBoundingClientRect(),S=document.querySelector('.sk-strip')?.getBoundingClientRect(),T=document.querySelector('.sk-top')?.getBoundingClientRect();
 return{l:L?L.right-c.left+6:0,r:R?c.right-R.left+6:0,t:T?T.bottom-c.top+4:0,b:S?c.bottom-S.top+6:0}}
