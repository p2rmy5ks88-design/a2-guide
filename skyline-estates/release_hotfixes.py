"""Shared web/native presentation and launch-season migration; rules source stays pinned."""
def apply(body):
    def replace(old, new):
        nonlocal body
        assert old in body, old[:100]
        body = body.replace(old, new)

    replace('const SEASON_EPOCH=Date.UTC(2026,9,25)', 'const SEASON_BASE=1000;const seasonDisplay=n=>n>SEASON_BASE?n-SEASON_BASE:n;const SEASON_EPOCH=Date.UTC(2026,10,3)')
    replace('Math.max(2,Math.floor((Date.now()-SEASON_EPOCH)/SEASON_LEN)+2)', 'SEASON_BASE+Math.max(1,Math.floor((Date.now()-SEASON_EPOCH)/SEASON_LEN)+1)')
    replace('SEASON_NAMES[(n-1)%SEASON_NAMES.length]', 'SEASON_NAMES[(seasonDisplay(n)-1)%SEASON_NAMES.length]')
    replace('SEASON_EPOCH+(seasonNo()-1)*SEASON_LEN', 'SEASON_EPOCH+(seasonNo()-SEASON_BASE)*SEASON_LEN')
    replace('function season(){const n=seasonNo();let S=PREF.season;', '''function season(){const n=seasonNo();let S=PREF.season;
      if(S&&S.n<SEASON_BASE){
        PREF.seasonArchive={...(PREF.seasonArchive||{}),['legacy-s'+S.n]:{...S,trophies:PREF.trophies||0}};
        PREF.season={n,sxp:0,prem:!!S.prem,cf:{},cp:{},tr:0,wk:null};PREF.trophies=0;
        // Preserve the paid pass, inventory, career, currencies and old claims in the archive.
        S=PREF.season;savePref();
      }
      ''')
    replace('${S.n}', '${seasonDisplay(S.n)}')

    # The current UI fetched its own stale published row without publishing first.
    replace('try{const rows=await lbFetch()||[],u=FIRE.uid();', 'try{await lbSubmit();const rows=await lbFetch()||[],u=FIRE.uid();const own=rows.find(r=>r.u===u);if(own){own.t=S.tr||0;own.l=lvlOf(PREF.xp);own.n=myName()||\'You\';own.c=myChar();rows.sort((a,b)=>b.t-a.t||a.u.localeCompare(b.u))}')
    replace("if(!rows.length){E.innerHTML='<div class=\"small\">No scores yet this season. Finish a game to be first.</div>';return}", "if(!rows.length){E.innerHTML='<div class=\"small\">No published scores yet. Your current Season score: '+nfmt(S.tr||0)+' 🏆.</div>';return}")

    # Short landscape screens need the property list, rather than a fixed-height summary.
    replace("const draw=()=>{const list=propsOf(p.id);", "const draw=()=>{pn.classList.toggle('pf2mort',filter==='mort');const list=propsOf(p.id);")
    replace("if(sel==null||G.own[sel].o!==p.id)sel=list.find(i=>!ro&&canBuild(p.id,i))", "if(sel==null||G.own[sel].o!==p.id||(filter==='mort'&&!G.own[sel].m))sel=list.find(i=>filter==='mort'?G.own[i].m:!ro&&canBuild(p.id,i))")
    replace("if(!ro&&!debt){\n        const hub=el('section','pf3quick')", "if(!ro&&!debt&&filter!=='mort'){\n        const hub=el('section','pf3quick')")
    replace("if(mine){b.onclick=()=>{sel=i;draw()};b.ondblclick=()=>showSquare(i)}box.append(b)", """if(mine){b.onclick=()=>{sel=i;draw()};b.ondblclick=()=>showSquare(i)}box.append(b);
          if(mine&&o.m&&!ro&&!debt){const redeem=el('button','pf-redeem','Redeem '+fmt(unmCost(i)));redeem.dataset.redeem=String(i);redeem.disabled=!canUnmort(p.id,i);redeem.setAttribute('aria-label','Redeem '+SQ[i].n+' for '+fmt(unmCost(i)));redeem.onclick=()=>{if(!canUnmort(p.id,i)){toast('Not enough match cash to redeem this property.');return}unmortgage(p.id,i);renderRoster();save();draw()};box.append(redeem)}""")
    body += '''<style>
    .mp.pf2.pf2mort .pf3overview{display:none}
    .mp.pf2 .pf2grp{flex-shrink:0}.mp.pf2 .pf2row{flex-shrink:0;min-height:48px}
    .pf-redeem{min-height:52px;flex-shrink:0;border:1px solid #f6d681;border-radius:10px;background:#e9c36f;color:#112333;font-size:14px;font-weight:800;cursor:pointer}
    .pf-redeem:disabled{background:#304451;color:#ccd7dc;border-color:#627c87}.pf-redeem:focus-visible{outline:3px solid white;outline-offset:2px}
    @media(max-height:500px) and (min-width:481px){
      .mp.pf2{width:min(100%,1000px);padding:10px 12px;gap:6px}
      .mp.pf2 .pf2h h2{font-size:23px}.mp.pf2 .pf2s span{padding:6px 10px}.mp.pf2 .pf2s b{font-size:16px}
      .mp.pf2 .pf3overview{padding:5px 8px;max-height:92px;overflow:auto;flex-shrink:1;min-height:0}
      .mp.pf2 .pf3metrics,.mp.pf2 .pf3overview>p{display:none}
      .mp.pf2 .pf3quick{border:0;margin:0;padding:0}.mp.pf2 .pf3quickhead small{display:none}
      .mp.pf2:not(.pf2dm) .pf2b{min-height:130px;grid-template-columns:minmax(0,1fr) minmax(0,1fr);overflow:hidden}.mp.pf2 .pf2pic{max-height:110px}
      .mp.pf2 .pf2g{scrollbar-width:auto;scrollbar-color:#e9c36f #152c3a}
    }
    </style>'''
    return body
