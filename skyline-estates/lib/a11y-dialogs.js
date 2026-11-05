/* Task 12: accessible dialogs for every modal() overlay (#modals .ov) without touching game logic.
   - role="dialog", aria-modal and a label taken from the dialog heading (VoiceOver announces it);
   - focus moves into the dialog (close/primary control) and Tab stays inside;
   - Escape presses a clear dismiss button only (Close/Cancel/Back/Not now/Later/Got it/Skip/×),
     never a game action; dialogs without one ignore Escape;
   - when the dialog closes, focus returns to the control that opened it. */
(()=>{'use strict';
 if(window.SkylineA11yDialogs)return;
 const host=document.querySelector('#modals');if(!host)return;
 const FOCUSABLE='button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
 const DISMISS=/^(close|cancel|back|not now|later|maybe later|no thanks|got it|skip|done|keep cash|look around|×|✕|✖)$/i;
 const stack=[];let n=0;
 const visible=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden'};
 const items=pn=>[...pn.querySelectorAll(FOCUSABLE)].filter(visible);
 const label=b=>(b.getAttribute('aria-label')||b.textContent||'').trim();
 function setup(ov){const pn=ov.querySelector('.mp')||ov.firstElementChild;if(!pn)return;
  const opener=document.activeElement&&document.activeElement!==document.body?document.activeElement:null;
  pn.setAttribute('role','dialog');pn.setAttribute('aria-modal','true');
  const h=pn.querySelector('.mh,h1,h2,h3');if(h){h.id||=('dlg-h'+(++n));pn.setAttribute('aria-labelledby',h.id)}else pn.setAttribute('aria-label','Dialog');
  if(!pn.hasAttribute('tabindex'))pn.tabIndex=-1;
  stack.push({ov,pn,opener});
  requestAnimationFrame(()=>{if(!ov.isConnected||pn.contains(document.activeElement))return;const f=items(pn);
   const pick=f.find(b=>/\bpri\b|\bgold\b/.test(b.className))||f.find(b=>DISMISS.test(label(b)))||f[0];try{(pick||pn).focus({preventScroll:true})}catch{}})}
 function teardown(ov){const i=stack.findIndex(x=>x.ov===ov);if(i<0)return;const [{opener}]=stack.splice(i,1);
  const top=stack[stack.length-1];
  setTimeout(()=>{if(document.activeElement&&document.activeElement!==document.body&&document.activeElement.isConnected)return;
   const t=top?top.pn:opener;if(t&&t.isConnected&&visible(t))try{t.focus({preventScroll:true})}catch{}},0)}
 new MutationObserver(ms=>{for(const m of ms){m.addedNodes.forEach(x=>x.nodeType===1&&x.classList.contains('ov')&&setup(x));m.removedNodes.forEach(x=>x.nodeType===1&&x.classList.contains('ov')&&teardown(x))}}).observe(host,{childList:true});
 // Overlays marked "bye" are closing; treat them as gone for focus purposes.
 addEventListener('keydown',e=>{const top=stack[stack.length-1];if(!top||!top.ov.isConnected||top.ov.classList.contains('bye'))return;
  if(e.key==='Escape'){const b=items(top.pn).find(x=>DISMISS.test(label(x))||/close/i.test(x.getAttribute('aria-label')||'')||/\b(mx|close|pfm-x)\b/.test(x.className));if(b){e.preventDefault();b.click()}return}
  if(e.key==='Tab'){const f=items(top.pn);if(!f.length){e.preventDefault();top.pn.focus();return}
   const a=f.indexOf(document.activeElement);if(e.shiftKey&&(a<=0)){e.preventDefault();f[f.length-1].focus()}else if(!e.shiftKey&&(a===-1||a===f.length-1)){e.preventDefault();f[0].focus()}}},true);
 // The in-match Portfolio button announced "Your properties"; use the visible name.
 const fixNames=()=>{const b=document.querySelector('#bAssets');if(b&&b.getAttribute('aria-label')!=='Portfolio'){b.setAttribute('aria-label','Portfolio');b.title='Portfolio'}};
 fixNames();new MutationObserver(fixNames).observe(document.body,{childList:true,subtree:false});addEventListener('DOMContentLoaded',fixNames);
 window.SkylineA11yDialogs=Object.freeze({open:()=>stack.length});
})();
