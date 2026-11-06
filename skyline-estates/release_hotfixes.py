"""Shared web/native presentation and launch-season migration; rules source stays pinned."""
def apply(body):
    def replace(old, new):
        nonlocal body
        assert old in body, old[:100]
        body = body.replace(old, new)

    # Distinct wording (IP review): no classic-board phrases in player-visible text.
    replace("label:'THE BOARDWALK'", "label:'SANTA MONICA PIER'")
    replace('<b>Get out of the Lockup</b>', '<b>Bail Pass</b>')
    body = body.replace('Luxury Fee', 'Penthouse Levy')
    # Board pictograms: no parking sign, hotel sign or "Jail" label from the classic genre (all rule versions).
    replace("free:'🅿️'", "free:'☕'")
    replace('<span class="tag jail">Jail</span>', '<span class="tag jail">Lockup</span>')
    body = body.replace('🏨', '🏙️')
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

    # Task 08: the Gala frame is the premium-pass tier-40 reward of every Season (tierReward), not a
    # "Season 2" item; progress checked the pre-reset internal number 2 and so always showed 0.
    replace("t=typeof seasonTierNow==='function'&&season().n===2?seasonTierNow():0;return{id,name:'Skyline Gala',cls:'fr-gala',how:'Season 2 premium pass, tier 40'", "t=typeof seasonTierNow==='function'&&season().prem?seasonTierNow():0;return{id,name:'Skyline Gala',cls:'fr-gala',how:'Premium Season pass, tier 40'")

    # Task 08: league item unlocks are earned once (like promotion coins), so a Season trophy reset
    # must not take back a reached league's surround or dice.
    replace("(u.league&&leagueIdx()>=LEAGUES.findIndex(l=>l.id===u.league))", "(u.league&&Math.max(leagueIdx(),PREF.leagueBest||0)>=LEAGUES.findIndex(l=>l.id===u.league))")

    # Task 08: promotion coins pay once per league (leagueBest); after a Season reset the hero must not
    # promise them again.
    replace("${N?`<div class=\"lg3next\"><small>Reward at ${esc(N.name)}</small>", "${N&&i+1<=PREF.leagueBest?`<div class=\"lg3next\"><small>${esc(N.name)} reward</small><b>✓ Already earned</b></div>`:N?`<div class=\"lg3next\"><small>Reward at ${esc(N.name)}</small>")

    # Leagues: a player missing from the published list was drawn as rank "undefined" below everyone;
    # place them by trophies with a note on publishing instead.
    replace('const mi=rows.findIndex(r=>r.u===u);E.innerHTML=rows.map((r,k)=>row(r,k,r.u===u)).join(\'\')+(mi<0?`<div class="lg3you">${row({n:myName()||\'You\',l:lvlOf(PREF.xp),t:S.tr||0,c:myChar()},-1,true).replace(\'<em>0</em>\',\'<em>–</em>\')}</div>`:\'\')', 'const mi=rows.findIndex(r=>r.u===u);if(mi<0){rows.push({u,n:myName()||\'You\',l:lvlOf(PREF.xp),t:S.tr||0,c:myChar()});rows.sort((a,b)=>b.t-a.t||String(a.u).localeCompare(String(b.u)))}E.innerHTML=rows.map((r,k)=>row(r,k,r.u===u)).join(\'\')+(mi<0?`<div class="small lg3note">${PREF.social&&PREF.social.rankings?\'Your score is shown here from this device and will appear for others once it publishes.\':\'Only you can see your score. To appear for others, turn on “Publish legacy device-reported Season scores” in Social privacy below.\'}</div>`:\'\')')

    # Results: Home button and Play again; '1 property'.
    replace("btns:[{k:'season',label:'Season'},{k:'new',label:'New game',primary:true}]});\n  if(k==='season'){setup.tab='season';showTitle()}else if(k==='new')showTitle();", "btns:[{k:'home',label:'Home'},{k:'season',label:'Season'},{k:'new',label:G.online?'New game':'Play again',primary:true}]});\n  if(k==='season'){setup.tab='season';showTitle()}else if(k==='home'){setup.tab='play';showTitle()}else if(k==='new'){const again=!G.online;setup.tab='play';showTitle();if(again)setTimeout(()=>{const q=document.querySelector('#qAI');if(q)q.click()},250)}")
    replace('`${b.name} bought ${st(b).buys} properties`', "`${b.name} bought ${st(b).buys} propert${st(b).buys===1?'y':'ies'}`")

    # Task 02 IP audit: avoid utility names identical/close to a classic board game's.
    replace("const GENERIC_UTILS=[['Power Company','⚡'],['Water Works','💧']];", "const GENERIC_UTILS=[['City Power Grid','⚡'],['Lagoon Water Board','💧']];")

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
