// AETHERFRONT: LAST LINE — app shell: boot, navigation (Home → Squads → Battle → Results → Home),
// meta-game UI, battle controller. No full reloads between matches; progression persists.
import { loadManifest, MAX_WAVES, RARITIES, ENERGY_MAX, COLS, ROWS, FIELD_CAP } from './data.js';
import { Store, validSquad } from './save.js';
import { damageAt, hpAt, upgradeReq, upgradeStatus, applyUpgrade, power, levelForXp, MISSIONS, SEASON_TRACK, grant } from './progression.js';
import { Battle, MK_COST } from './sim/battle.js';
import { Audio } from './audio.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = (n) => Math.floor(n).toLocaleString('en-US').replace(/,/g, ' ');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const STARS = { common: 1, rare: 2, epic: 3, legendary: 4 };

const app = { screen: null, M: null, store: null, audio: null, engine: null, lib: null, three: null, gl: false, homeView: null, battle: null, squadsUI: { tab: 'squads', idx: null, sel: 'aegis_trooper', filter: 'all', sort: 'rarity', draft: null, replacing: false } };
window.__AF = app; // test/debug hook (no secrets)

function toast(msg, bad = false) { const d = document.createElement('div'); d.textContent = msg; if (bad) d.className = 'bad'; $('#toast').append(d); setTimeout(() => d.remove(), 2300); }
function modal(html, onClick) { const m = $('#modal'); m.innerHTML = `<div class="panel">${html}</div>`; m.classList.remove('hidden'); m.onclick = (e) => { if (e.target === m) closeModal(); const b = e.target.closest('[data-act]'); if (b) onClick?.(b.dataset.act, b); }; }
function ask(text, { input = null, ok = 'OK', cancel = 'Cancel', danger = false } = {}) { // in-game confirm/prompt (native dialogs are blocked in sandboxed frames)
  return new Promise((res) => {
    const d = document.createElement('div'); d.className = 'dialog-veil';
    d.innerHTML = `<div class="panel"><p>${esc(text)}</p>${input !== null ? `<input class="dlg-input" maxlength="18" value="${esc(input)}">` : ''}<div class="row-btns"><button class="btn ghost" data-r="0">${cancel}</button><button class="btn ${danger ? 'red' : 'gold'}" data-r="1">${ok}</button></div></div>`;
    document.body.append(d); d.querySelector('input')?.focus();
    d.onclick = (e) => { const b = e.target.closest('[data-r]'); if (!b) return; const v = b.dataset.r === '1' ? (input !== null ? d.querySelector('input').value : true) : (input !== null ? null : false); d.remove(); res(v); };
  });
}
function closeModal() { $('#modal').classList.add('hidden'); $('#modal').innerHTML = ''; }
const S = () => app.store.get();

// ------------------------------------------------------------------ boot
async function boot() {
  const setP = (p, msg) => { $('#boot-fill').style.width = Math.round(p * 100) + '%'; if (msg) $('#boot-msg').textContent = msg; };
  try {
    app.M = await loadManifest();
    app.store = new Store(app.M.roster);
    app.audio = new Audio(app.M, () => S().settings);
    const unlock = () => { app.audio.unlock(); };
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });
    setP(0.1, 'Starting renderer…');
    try {
      const eng = await import('./render/engine.js');
      if (!eng.webglAvailable()) throw new Error('no webgl');
      app.three = { eng, battle: await import('./render/battle-view.js'), home: await import('./render/home-view.js') };
      app.engine = new eng.Engine();
      app.lib = new eng.ModelLibrary(app.M.byId);
      app.gl = true;
      if (S().settings.quality !== 'auto') app.engine.setQuality(S().settings.quality);
      const first = ['core_reactor', 'entry_gate', 'obstacle_crate', 'nova_mortar', 'arc_pylon', 'quantum_spire', ...activeSquad().slots, activeSquad().hero];
      await app.lib.preload([...new Set(first)], (p) => setP(0.1 + p * 0.85, 'Loading 3D units…'));
      app.lib.preload([...app.M.roster, ...app.M.enemies].map((u) => u.id)); // rest in background
    } catch (e) {
      console.warn('[aetherfront] WebGL unavailable → 2D fallback', e);
      app.gl = false;
    }
    setP(1, 'Ready');
    go('home');
    setTimeout(() => $('#boot').classList.add('gone'), 150);
  } catch (e) {
    $('#boot-msg').textContent = 'Failed to start: ' + e.message;
    console.error(e);
  }
}

// ------------------------------------------------------------------ navigation + orientation
function go(name, opts) {
  if (app.screen === 'battle' && name !== 'battle') endBattleView();
  app.screen = name;
  $$('.screen').forEach((s) => s.classList.toggle('active', s.id === 'screen-' + name));
  if (name === 'home') renderHome();
  if (name === 'squads') { app.squadsUI.idx = opts?.idx ?? S().activeSquad; app.squadsUI.draft = null; renderSquads(); }
  if (name === 'battle') startBattle(opts?.squad ?? S().activeSquad);
  checkOrientation();
}
let rotateIgnored = false;
function checkOrientation() {
  const portrait = innerHeight > innerWidth;
  const need = app.screen === 'battle' && portrait && !rotateIgnored && innerWidth < 900;
  $('#rotate').classList.toggle('hidden', !need);
}
addEventListener('resize', () => { checkOrientation(); if (app.screen === 'battle') layoutBattle(); });
$('#rotate').addEventListener('click', (e) => { if (e.target.closest('[data-act=rotate-ignore]')) { rotateIgnored = true; checkOrientation(); } });

const activeSquad = () => S().squads[S().activeSquad];
const unit = (id) => app.M.byId[id];

function cardHTML(id, { cls = '', prog = false, data = '' } = {}) {
  const u = unit(id), inv = S().units[id];
  const req = upgradeReq(inv.level);
  const ready = upgradeStatus(S(), id).ok;
  const p = req ? `<div class="prog ${inv.cards >= req.cards ? 'full' : ''}"><i style="width:${Math.min(100, (inv.cards / req.cards) * 100)}%"></i><span>${inv.cards}/${req.cards}</span></div>` : `<div class="prog full"><i style="width:100%"></i><span>MAX</span></div>`;
  return `<div class="cell"><div class="card rarity-${u.rarity} ${ready ? 'ready' : ''} ${cls}" data-id="${id}" ${data} role="button" aria-label="${esc(u.display_name)} level ${inv.level}">
    <span class="cost">${u.energy_cost}</span><div class="in"><img src="${u.portrait}" alt="" loading="lazy"></div>
    <div class="lv">Lv. ${inv.level}</div><div class="stars">${'★'.repeat(STARS[u.rarity])}</div></div>${prog ? p : ''}</div>`;
}
const walletHTML = () => `<span class="pill"><i class="ico alloy"></i>${fmt(S().wallet.alloy)}</span><span class="pill"><i class="ico crystal"></i>${fmt(S().wallet.crystals)}</span>`;
const squadPower = (q) => [...q.slots, q.hero].reduce((s, id) => s + power(unit(id), S().units[id].level), 0);

// ------------------------------------------------------------------ HOME
function claimableMissions() { return MISSIONS.filter((m) => !S().missions.claimed[m.id] && (S().stats[m.stat] || 0) >= m.goal); }
function renderHome() {
  const s = S(), q = activeSquad(), lv = levelForXp(s.profile.xp), hero = unit(q.hero);
  const reached = SEASON_TRACK.filter((t) => s.profile.xp >= t.xp).length;
  const nextIdx = Math.min(SEASON_TRACK.length - 1, reached);
  const trackFill = Math.min(100, (s.profile.xp / SEASON_TRACK[SEASON_TRACK.length - 1].xp) * 100);
  const claimSeason = SEASON_TRACK.some((t, i) => s.profile.xp >= t.xp && !s.season.claimed.includes(i));
  $('#screen-home').innerHTML = `<div class="home">
    <div class="logo"><span class="a-mark"></span><b>AETHERFRONT:</b><i>LAST LINE</i></div>
    <div class="h-top">
      <div class="avatar"><img src="${hero.portrait}" alt=""><span class="lvl">${lv.level}</span></div>
      <div class="who"><div class="nm">${esc(s.profile.name)}</div><div class="xpbar"><i style="width:${(lv.into / lv.need) * 100}%"></i><span>${lv.into} / ${lv.need} XP</span></div></div>
      <div class="wallet">${walletHTML()}</div>
    </div>
    <div class="h-row2">
      <span class="pill" style="height:44px;font-size:17px"><i class="ico trophy"></i>${fmt(s.profile.trophies)}</span>
      <div class="rank panel"><div class="shield-ico">${Math.min(5, 1 + Math.floor(s.profile.trophies / 150))}</div><div style="flex:1">${rankName(s.profile.trophies)}<div class="segs">${Array.from({ length: 8 }, (_, i) => `<i class="${i < (s.profile.trophies % 150) / 18.75 ? 'on' : ''}"></i>`).join('')}</div></div></div>
      <button class="icon-btn" data-act="settings" aria-label="Settings">☰</button>
    </div>
    <div class="h-mid">
      <div id="home-3d"></div>
      <div class="season-banner"><small>SEASON 1</small><h3>AETHER CORE SIEGE</h3><span class="ends">Local campaign · 15 waves</span></div>
      <div class="side left">
        <button class="tile-btn purple" data-act="events"><span class="glyph">📅</span>EVENTS</button>
        <button class="tile-btn" data-act="missions"><span class="glyph">📋</span>MISSIONS${claimableMissions().length ? `<span class="badge-dot">${claimableMissions().length}</span>` : ''}</button>
        <button class="tile-btn gold" data-act="season"><span class="glyph">🎁</span>REWARDS${claimSeason ? '<span class="badge-dot">!</span>' : ''}</button>
      </div>
      <div class="side right">
        <button class="tile-btn gold" data-act="season"><span class="glyph">🏅</span>TRACK</button>
        <button class="tile-btn purple" data-act="shop"><span class="glyph">💎</span>SHOP</button>
        <button class="tile-btn" data-act="units"><span class="glyph">🃏</span>UNITS</button>
      </div>
    </div>
    <div class="track panel">
      <div class="track-head"><span>SEASON REWARD TRACK</span><span class="xp">${fmt(s.profile.xp)} / ${fmt(SEASON_TRACK[SEASON_TRACK.length - 1].xp)} XP</span></div>
      <div class="track-row"><div class="fill" style="width:calc(${trackFill}% - 16px)"></div>
        ${SEASON_TRACK.map((t, i) => `<div class="tier ${s.profile.xp >= t.xp ? 'reached' : ''} ${s.profile.xp >= t.xp && !s.season.claimed.includes(i) ? 'claimable' : ''} ${s.season.claimed.includes(i) ? 'claimed' : ''}" data-act="season"><div class="box">${t.label}</div><div class="node"></div></div>`).join('')}
      </div>
    </div>
    <div class="mysquad panel">
      <div class="head"><span>◎ MY SQUAD · ${esc(q.name)}</span><span class="squad-chips">${s.squads.map((_, i) => `<button class="${i === s.activeSquad ? 'on' : ''}" data-act="pick-squad" data-i="${i}">${i + 1}</button>`).join('')}</span><span class="pow">⚡ ${fmt(squadPower(q))}</span></div>
      <div class="row">${[...q.slots, q.hero].map((id) => cardHTML(id)).join('')}<button class="edit-btn" data-act="units">✎<span>EDIT</span></button></div>
    </div>
    <div class="h-bottom">
      <button class="side-nav" data-act="stats"><span>🏆</span>RECORDS</button>
      <button class="btn gold battle-btn" data-act="battle" id="battle-btn">⚔ BATTLE</button>
      <button class="side-nav r" data-act="units"><span>🛡</span>SQUADS</button>
    </div>
  </div>`;
  $('#screen-home').onclick = (e) => { const b = e.target.closest('[data-act]'); if (!b) { if (e.target.closest('.card')) { app.audio.ui_('ui_select'); go('squads'); } return; } homeAct(b.dataset.act, b); };
  mountHome3D();
}
function rankName(t) { return ['Recruit', 'Aether Cadet', 'Aether Vanguard', 'Core Warden', 'Last Line Legend'][Math.min(4, Math.floor(t / 150))] + ' ' + ['I', 'II', 'III'][Math.floor((t % 150) / 50)]; }
function mountHome3D() {
  const host = $('#home-3d'); if (!host) return;
  if (!app.gl) { host.innerHTML = `<img src="${unit('core_reactor').portrait}" alt="" style="position:absolute;left:50%;top:50%;width:60%;transform:translate(-50%,-40%);filter:drop-shadow(0 0 30px #3ce5ff)">`; return; }
  if (!app.homeView) app.homeView = new app.three.home.HomeView(app.engine, app.lib, [activeSquad().slots[0], activeSquad().hero]);
  app.engine.attach(host, app.homeView);
}
function homeAct(act, b) {
  app.audio.ui_('ui_select');
  switch (act) {
    case 'battle': app.audio.ui_('ui_confirm'); go('battle'); break;
    case 'units': go('squads'); break;
    case 'pick-squad': app.store.transact((s) => { s.activeSquad = Number(b.dataset.i); }); renderHome(); break;
    case 'missions': showMissions(); break;
    case 'season': showSeason(); break;
    case 'events': modal(`<h2>Events</h2><p class="note">Live events and multiplayer are <b>not available</b> in this build — everything here is a local, offline campaign. Current mode: <b>Aegis Perimeter</b>, 15 waves with Titan Breaker bosses on waves 5, 10 and 15.</p><div class="row-btns"><button class="btn" data-act="close">OK</button></div>`, () => closeModal()); break;
    case 'shop': modal(`<h2>Shop</h2><p class="note">There is <b>no store and no purchases</b> in this build. Alloy and Aether Crystals are earned only by playing battles, missions and the season track.</p><div class="row-btns"><button class="btn" data-act="close">OK</button></div>`, () => closeModal()); break;
    case 'stats': { const st = S().stats; modal(`<h2>Records</h2><table class="stat-table"><tr><td>Matches</td><td>${st.matches}</td></tr><tr><td>Victories</td><td>${st.wins}</td></tr><tr><td>Best wave</td><td>${st.bestWave}/15</td></tr><tr><td>Enemies destroyed</td><td>${fmt(st.kills)}</td></tr><tr><td>Titans defeated</td><td>${st.titans}</td></tr><tr><td>Units deployed</td><td>${st.deploys}</td></tr><tr><td>Best score</td><td>${fmt(S().profile.bestScore)}</td></tr></table><div class="row-btns"><button class="btn" data-act="close">Close</button></div>`, () => closeModal()); break; }
    case 'settings': showSettings(); break;
  }
}
function showMissions() {
  const s = S();
  const rewardTxt = (r) => (r.alloy ? `+${r.alloy} alloy` : '') + (r.crystals ? `+${r.crystals} crystals` : '');
  modal(`<h2>Missions</h2><div class="mlist">${MISSIONS.map((m) => { const v = Math.min(m.goal, s.stats[m.stat] || 0), done = v >= m.goal, cl = s.missions.claimed[m.id];
    return `<div class="mrow"><div><b>${m.title}</b> <small class="note">${rewardTxt(m.reward)}</small><div class="prog ${done ? 'full' : ''}"><i style="width:${(v / m.goal) * 100}%"></i><span>${v}/${m.goal}</span></div></div>${cl ? '<span class="note">Claimed ✓</span>' : `<button class="btn ${done ? 'gold' : ''}" data-act="claim" data-id="${m.id}" ${done ? '' : 'disabled'}>Claim</button>`}</div>`; }).join('')}</div><div class="row-btns"><button class="btn ghost" data-act="close">Close</button></div>`,
  (act, b) => {
    if (act === 'close') { closeModal(); renderHome(); return; }
    if (act === 'claim') { const m = MISSIONS.find((x) => x.id === b.dataset.id); try { app.store.transact((d) => { if (d.missions.claimed[m.id] || (d.stats[m.stat] || 0) < m.goal) throw new Error('not claimable'); d.missions.claimed[m.id] = true; grant(d, m.reward); }); app.audio.ui_('ui_upgrade'); toast('Mission reward claimed'); } catch (e) { toast(e.message, true); } showMissions(); }
  });
}
function showSeason() {
  const s = S();
  modal(`<h2>Season Reward Track</h2><p class="note">Earn XP from battles. Rewards are free and local — there is no paid pass.</p><div class="mlist">${SEASON_TRACK.map((t, i) => { const ok = s.profile.xp >= t.xp, cl = s.season.claimed.includes(i);
    return `<div class="mrow"><div><b>${t.label}</b><div class="prog ${ok ? 'full' : ''}"><i style="width:${Math.min(100, (s.profile.xp / t.xp) * 100)}%"></i><span>${Math.min(s.profile.xp, t.xp)}/${t.xp} XP</span></div></div>${cl ? '<span class="note">Claimed ✓</span>' : `<button class="btn ${ok ? 'gold' : ''}" data-act="claim" data-i="${i}" ${ok ? '' : 'disabled'}>Claim</button>`}</div>`; }).join('')}</div><div class="row-btns"><button class="btn ghost" data-act="close">Close</button></div>`,
  (act, b) => {
    if (act === 'close') { closeModal(); renderHome(); return; }
    if (act === 'claim') { const i = Number(b.dataset.i); try { app.store.transact((d) => { if (d.season.claimed.includes(i) || d.profile.xp < SEASON_TRACK[i].xp) throw new Error('not claimable'); d.season.claimed.push(i); grant(d, SEASON_TRACK[i].reward); }); app.audio.ui_('ui_upgrade'); toast('Reward claimed: ' + SEASON_TRACK[i].label); } catch (e) { toast(e.message, true); } showSeason(); }
  });
}
function showSettings() {
  const st = S().settings;
  modal(`<h2>Settings</h2>
    <table class="stat-table"><tr><td>Sound</td><td><button class="btn ghost" data-act="mute">${st.muted ? 'Muted 🔇' : 'On 🔊'}</button></td></tr>
    <tr><td>Volume</td><td><input type="range" min="0" max="1" step="0.1" value="${st.volume}" id="vol" style="width:140px"></td></tr>
    <tr><td>Graphics</td><td>${['auto', 'high', 'low'].map((q) => `<button class="btn ${st.quality === q ? 'gold' : 'ghost'}" style="min-height:36px;padding:0 10px" data-act="q-${q}">${q}</button>`).join(' ')}</td></tr>
    <tr><td>Renderer</td><td>${app.gl ? 'WebGL 3D' : '2D fallback'}${app.engine ? ` · ${app.engine.stats.fps || '–'} fps` : ''}</td></tr></table>
    <p class="note">Progress is saved on this device only (schema v2). Resetting cannot be undone.</p>
    <div class="row-btns"><button class="btn red" data-act="reset">Reset progress</button><button class="btn" data-act="close">Done</button></div>`,
  (act) => {
    if (act === 'close') { closeModal(); renderHome(); return; }
    if (act === 'mute') { app.store.transact((s) => { s.settings.muted = !s.settings.muted; }); app.audio.apply(); showSettings(); }
    if (act.startsWith('q-')) { const q = act.slice(2); app.store.transact((s) => { s.settings.quality = q; }); app.engine?.setQuality(q); showSettings(); }
    if (act === 'reset') { ask('Reset ALL Aetherfront progress on this device? This cannot be undone.', { ok: 'Reset', danger: true }).then((y) => { if (y) { try { app.store.storage.removeItem('aetherfront.save'); } catch {} location.reload(); } }); }
  });
  $('#vol').oninput = (e) => { app.store.transact((s) => { s.settings.volume = Number(e.target.value); }); app.audio.apply(); };
}

// ------------------------------------------------------------------ SQUADS / COLLECTION
function currentDraft() { const u = app.squadsUI; return u.draft ?? structuredClone(S().squads[u.idx]); }
function commitDraft(d) {
  const u = app.squadsUI;
  if (validSquad(d, app.M.roster)) { app.store.transact((s) => { s.squads[u.idx] = d; }); u.draft = null; }
  else u.draft = d;
}
function renderSquads() {
  const u = app.squadsUI, s = S(), d = currentDraft();
  const ids = [...d.slots, d.hero].filter(Boolean);
  const avg = ids.length ? (ids.reduce((a, id) => a + unit(id).energy_cost, 0) / ids.length).toFixed(1) : '–';
  let list = app.M.roster.slice();
  if (u.filter !== 'all') list = list.filter((x) => (u.filter === 'ready' ? upgradeStatus(s, x.id).ok : u.filter === 'hero' ? x.category === 'hero' : u.filter === 'tower' ? x.kind === 'tower' : x.role === u.filter));
  const rk = (x) => RARITIES.indexOf(x.rarity);
  list.sort((a, b) => (u.sort === 'cost' ? a.energy_cost - b.energy_cost : u.sort === 'level' ? s.units[b.id].level - s.units[a.id].level : rk(b) - rk(a)) || a.display_name.localeCompare(b.display_name));
  const roles = [...new Set(app.M.roster.map((x) => x.role))];
  const sel = unit(u.sel), inv = s.units[u.sel], req = upgradeReq(inv.level), ust = upgradeStatus(s, u.sel);
  const inSquad = d.slots.includes(u.sel) || d.hero === u.sel;
  const valid = validSquad(d, app.M.roster);
  $('#screen-squads').innerHTML = `<div class="sq">
    <div class="sq-top"><div class="logo"><span class="a-mark"></span><b>AETHERFRONT:</b><i>LAST LINE</i></div><div class="wallet">${walletHTML()}</div></div>
    <div class="sq-scroll">
      <div class="tabs"><button class="${u.tab === 'squads' ? 'on' : ''}" data-act="tab-squads">▣ Squads</button><button class="${u.tab === 'collection' ? 'on' : ''}" data-act="tab-collection">▤ Collection</button></div>
      ${u.tab === 'squads' ? `<div class="panel sq-panel">
        <div class="sq-nums">${s.squads.map((_, i) => `<button class="${i === u.idx ? 'on' : ''}" data-act="sq" data-i="${i}">${i + 1}</button>`).join('')}</div>
        <div class="sq-head"><div class="sq-name">${esc(d.name || 'Squad ' + (u.idx + 1))} <button data-act="rename" aria-label="Rename">✎</button></div>
          <div class="sq-stats"><div>Avg Cost<b>💧 ${avg}</b></div><div>Squad Power<b>⚡ ${valid ? fmt(squadPower(d)) : '–'}</b></div></div></div>
        <div class="slots ${u.replacing ? 'replace' : ''}">${d.slots.map((id, i) => id ? `<div data-slot="${i}">${cardHTML(id, { prog: true, cls: id === u.sel ? 'sel' : '' })}</div>` : `<div data-slot="${i}"><div class="slot-empty">+</div><div class="slot-label">Unit ${i + 1}</div></div>`).join('')}
          <div data-slot="hero">${d.hero ? cardHTML(d.hero, { prog: true, cls: d.hero === u.sel ? 'sel' : '' }) : '<div class="slot-empty hero">★</div><div class="slot-label">Hero</div>'}</div></div>
        ${valid ? '' : '<div class="warn">Squad incomplete: it needs 5 units + 1 hero. Unsaved changes are kept until you fill every slot.</div>'}
        <div class="sq-actions"><button class="btn" data-act="auto">⇄ Auto Build</button><button class="btn ${S().activeSquad === u.idx ? 'gold' : ''}" data-act="activate" ${valid ? '' : 'disabled'}>${S().activeSquad === u.idx ? '✓ Active squad' : 'Use this squad'}</button></div>
      </div>` : ''}
      <div class="coll-head"><div><h2>Unit Collection</h2><small>Owned: <b>${app.M.roster.length}/${app.M.roster.length}</b> · Upgrades ready: ${app.M.roster.filter((x) => upgradeStatus(s, x.id).ok).length}</small></div>
        <div class="filters"><select class="filter" id="f-sort" aria-label="Sort"><option value="rarity">Rarity</option><option value="cost">Cost</option><option value="level">Level</option></select>
        <select class="filter" id="f-filter" aria-label="Filter"><option value="all">All Units</option><option value="ready">Upgrade ready</option><option value="hero">Heroes</option><option value="tower">Towers</option>${roles.filter((r) => r !== 'Ultimate').map((r) => `<option value="${r}">${r}</option>`).join('')}</select></div></div>
      <div class="grid">${list.map((x) => cardHTML(x.id, { prog: true, cls: (x.id === u.sel ? 'sel ' : '') + (d.slots.includes(x.id) || d.hero === x.id ? '' : '') })).join('')}</div>
    </div>
    <div class="detail" style="--rc:${app.M.rarity[sel.rarity]?.frame}">
      <div class="r1"><div class="pic"><img src="${sel.portrait}" alt=""></div>
        <div><h3>${esc(sel.display_name)}</h3><div class="meta">◎ ${sel.role} · ${sel.kind === 'tower' ? 'Tower' : sel.kind === 'hero' ? 'Hero' : 'Unit'} · ${sel.rarity}</div><div class="trait">${esc(sel.trait || '')}</div></div>
        <div class="lvbox"><div>💧 ${sel.energy_cost}</div><div>Lv. ${inv.level}</div><div class="stars">${'★'.repeat(STARS[sel.rarity])}</div></div></div>
      <div class="r2">
        <div><div class="prog ${req && inv.cards >= req.cards ? 'full' : ''}"><i style="width:${req ? Math.min(100, (inv.cards / req.cards) * 100) : 100}%"></i><span>${req ? `${inv.cards}/${req.cards}` : 'MAX'}</span></div>${req && !ust.ok ? `<div class="need">${ust.reason === 'cards' ? `Need ${req.cards - inv.cards} more cards` : `Need ${fmt(req.alloy)} alloy`}</div>` : ''}</div>
        <button class="btn" data-act="info">Info</button>
        <button class="btn ${inSquad ? 'red' : ''}" data-act="${inSquad ? 'remove' : 'equip'}">${inSquad ? 'Remove' : 'Equip'}</button>
        <button class="btn gold" data-act="upgrade" ${ust.ok ? '' : 'disabled'}>⬆ ${req ? fmt(req.alloy) : 'MAX'}</button>
      </div>
    </div>
    <nav class="bottom-nav"><button data-act="nav-home"><span>🏠</span>Home</button><button class="on" data-act="tab-squads"><span>🃏</span>Units</button><button data-act="nav-battle" ${valid ? '' : 'disabled'}><span>⚔</span>Battle</button><button data-act="nav-missions"><span>📋</span>Missions</button><button data-act="nav-settings"><span>⚙</span>Settings</button></nav>
  </div>`;
  $('#f-sort').value = u.sort; $('#f-filter').value = u.filter;
  $('#f-sort').onchange = (e) => { u.sort = e.target.value; renderSquads(); };
  $('#f-filter').onchange = (e) => { u.filter = e.target.value; renderSquads(); };
  $('#screen-squads').onclick = squadsClick;
}
function squadsClick(e) {
  const u = app.squadsUI, b = e.target.closest('[data-act]');
  const slotEl = e.target.closest('[data-slot]');
  if (u.replacing && slotEl) { // replace chosen slot with selected card
    const d = currentDraft(), id = u.sel, isHero = unit(id).category === 'hero', slot = slotEl.dataset.slot;
    if (isHero !== (slot === 'hero')) { toast(isHero ? 'Heroes go in the hero slot' : 'Units cannot use the hero slot', true); app.audio.ui_('ui_error'); return; }
    if (isHero) d.hero = id; else d.slots[Number(slot)] = id;
    u.replacing = false; commitDraft(d); app.audio.ui_('ui_confirm'); renderSquads(); return;
  }
  if (b) return squadsAct(b.dataset.act, b);
  const card = e.target.closest('.card');
  if (card) { u.sel = card.dataset.id; u.replacing = false; app.audio.ui_('ui_select'); renderSquads(); }
}
function squadsAct(act, b) {
  const u = app.squadsUI;
  if (!['upgrade'].includes(act)) app.audio.ui_('ui_select');
  const leaveCheck = () => { if (u.draft) toast(`Squad ${u.idx + 1} incomplete — reverted to last valid lineup`, true); u.draft = null; };
  switch (act) {
    case 'tab-squads': u.tab = 'squads'; renderSquads(); break;
    case 'tab-collection': u.tab = 'collection'; renderSquads(); break;
    case 'sq': leaveCheck(); u.idx = Number(b.dataset.i); u.replacing = false; renderSquads(); break;
    case 'rename': { const d = currentDraft(); ask('Squad name', { input: d.name || '', ok: 'Save' }).then((n) => { if (n !== null) { d.name = n.trim().slice(0, 18) || 'Squad ' + (u.idx + 1); commitDraft(d); renderSquads(); } }); break; }
    case 'auto': { // strongest affordable mix: 2 towers, 1 tank, 2 best others + best hero
      const lv = (id) => S().units[id].level, pw = (x) => power(x, lv(x.id));
      const R = app.M.roster.filter((x) => x.category !== 'hero');
      const towers = R.filter((x) => x.kind === 'tower' && x.atk !== 'shield').sort((a, c) => pw(c) - pw(a)).slice(0, 2);
      const tank = R.filter((x) => x.tank).sort((a, c) => pw(c) - pw(a)).slice(0, 1);
      const rest = R.filter((x) => !towers.includes(x) && !tank.includes(x) && x.atk !== 'heal' && x.atk !== 'repair').sort((a, c) => pw(c) - pw(a)).slice(0, 2);
      const hero = app.M.roster.filter((x) => x.category === 'hero').sort((a, c) => pw(c) - pw(a))[0];
      const d = currentDraft(); d.slots = [...towers, ...tank, ...rest].map((x) => x.id); d.hero = hero.id; commitDraft(d); toast('Auto-built strongest squad'); renderSquads(); break;
    }
    case 'activate': if (!u.draft) { app.store.transact((s) => { s.activeSquad = u.idx; }); app.audio.ui_('ui_confirm'); toast(`Squad ${u.idx + 1} is now active`); renderSquads(); } break;
    case 'equip': {
      const d = currentDraft(), id = u.sel, isHero = unit(id).category === 'hero';
      if (isHero) { d.hero = id; commitDraft(d); app.audio.ui_('ui_confirm'); renderSquads(); break; }
      const empty = d.slots.findIndex((x) => !x);
      if (empty >= 0) { d.slots[empty] = id; commitDraft(d); app.audio.ui_('ui_confirm'); renderSquads(); break; }
      u.tab = 'squads'; u.replacing = true; toast('Tap a squad slot to replace'); renderSquads(); $('.sq-scroll').scrollTop = 0; break;
    }
    case 'remove': { const d = currentDraft(); if (d.hero === u.sel) d.hero = null; else d.slots = d.slots.map((x) => (x === u.sel ? null : x)); commitDraft(d); renderSquads(); break; }
    case 'upgrade': {
      try {
        const L = app.store.transact((s) => applyUpgrade(s, u.sel));
        app.audio.ui_('ui_upgrade'); toast(`${unit(u.sel).display_name} upgraded to Lv. ${L}!`);
      } catch (e) { app.audio.ui_('ui_error'); toast(e.message, true); }
      renderSquads(); break;
    }
    case 'info': showInfo(u.sel); break;
    case 'nav-home': leaveCheck(); go('home'); break;
    case 'nav-battle': leaveCheck(); go('battle', { squad: S().activeSquad }); break;
    case 'nav-missions': showMissions(); break;
    case 'nav-settings': showSettings(); break;
  }
}
function showInfo(id) {
  const x = unit(id), L = S().units[id].level, n = Math.min(15, L + 1);
  const support = x.atk === 'heal' || x.atk === 'repair' || x.atk === 'shield';
  modal(`<div style="display:flex;gap:12px;align-items:center"><img src="${x.portrait}" style="width:84px;height:84px;object-fit:cover;object-position:50% 15%;border-radius:12px;background:#1a2a6a"><div><h2 style="margin:0">${esc(x.display_name)}</h2><div class="note">${x.role} · ${x.kind} · ${x.rarity} · ${esc(x.weapon_name)}</div><div class="note">${esc(x.trait || '')}</div></div></div>
    <table class="stat-table" style="margin-top:10px"><tr><td></td><td style="text-align:right;color:var(--dim)">Lv. ${L} → ${n}</td></tr>
    <tr><td>Health</td><td>${fmt(hpAt(x, L))} → ${fmt(hpAt(x, n))}</td></tr>
    <tr><td>${support ? (x.atk === 'shield' ? 'Shield strength' : 'Heal / repair per pulse') : 'Damage per hit'}</td><td>${support ? (x.atk === 'shield' ? `${Math.round(hpAt(x, L) * x.shieldMult)} → ${Math.round(hpAt(x, n) * x.shieldMult)}` : `${Math.round(damageAt(x, L) * x.healMult)} → ${Math.round(damageAt(x, n) * x.healMult)}`) : `${damageAt(x, L)} → ${damageAt(x, n)}`}</td></tr>
    <tr><td>Range</td><td>${x.range} tiles</td></tr><tr><td>Attack interval</td><td>${x.rate}s</td></tr><tr><td>Energy cost</td><td>${x.energy_cost}</td></tr>
    <tr><td>Blocks enemy route</td><td>${x.kind === 'tower' ? 'Yes (tower)' : 'No'}</td></tr>${x.tank ? `<tr><td>Holds enemies</td><td>${x.tank}</td></tr>` : ''}${x.ult ? `<tr><td>Ultimate</td><td>${x.ult === 'lance' ? 'Aether Lance (row)' : 'Orbital barrage (any tile)'}</td></tr>` : ''}</table>
    <div class="row-btns"><button class="btn" data-act="close">Close</button></div>`, () => closeModal());
}

// ------------------------------------------------------------------ BATTLE
const B = { sim: null, view: null, squadIndex: 0, pick: null, paused: false, speed: 1, inspect: null, ultAim: false, lastHud: 0, validAt: 0, started: 0 };
function startBattle(squadIndex) {
  const q = S().squads[squadIndex];
  if (!validSquad(q, app.M.roster)) { toast('Squad is incomplete', true); go('squads'); return; }
  Object.assign(B, { squadIndex, pick: null, paused: false, speed: 1, inspect: null, ultAim: false, started: performance.now() });
  const levels = Object.fromEntries(Object.entries(S().units).map(([k, v]) => [k, v.level]));
  B.sim = new Battle({ byId: app.M.byId, squad: q, levels, matchId: 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) });
  app.battle = B;
  app.audio.preload([...q.slots, q.hero, ...app.M.enemies.map((e) => e.id)].map((id) => unit(id).audio.file));
  renderBattleUI();
  const hooks = { step: battleStep, onEvent: battleEvent };
  const host = $('#battle-host');
  if (app.gl) {
    app.engine.detach?.();
    B.view = new app.three.battle.BattleView(app.engine, app.lib, B.sim, hooks);
    app.engine.attach(host, B.view);
  } else {
    import('./render/fallback2d.js').then((m) => { B.view = new m.Fallback2D(host, B.sim, app.M.byId, hooks); layoutBattle(); });
  }
  layoutBattle();
  bindBattleInput(host);
  setTimeout(() => banner('DEPLOY YOUR SQUAD'), 300);
}
function endBattleView() {
  if (!B.view) return;
  if (app.gl) { app.engine.detach(); B.view.dispose(); } else B.view.dispose();
  B.view = null; B.sim = null; $('#battle-ui').innerHTML = '';
}
function layoutBattle() {
  if (!B.view) return;
  const hud = $('.hud'), deck = $('.deck');
  if (!hud || !deck) return;
  const H = $('#battle-host').clientHeight;
  const top = hud.getBoundingClientRect().bottom + 4, bottom = H - deck.getBoundingClientRect().top + 2;
  const rect = $('#battle-host').getBoundingClientRect();
  B.view.setSafeArea({ top, bottom, left: 8, right: 8 });
  void rect;
}
function renderBattleUI() {
  const q = S().squads[B.squadIndex], cards = [...q.slots, q.hero];
  $('#battle-ui').innerHTML = `
    <div class="hud">
      <div class="logo"><span class="a-mark"></span><b>AETHERFRONT:</b><i>LAST LINE</i></div>
      <button class="btn gold wave-btn" data-act="wave" id="h-wavebtn">▶ WAVE 1</button><div class="sp"></div>
      <span class="pill" title="Battle alloy (match only — spent on Mk upgrades)"><i class="ico balloy"></i><span><small>BATTLE ALLOY</small><b id="h-balloy">0</b></span></span>
      <span class="pill" title="Core integrity"><i class="ico heart"></i><b id="h-int">20</b></span>
      <div class="wave-box">WAVE <span id="h-wave">0 / ${MAX_WAVES}</span><div class="wave-dots">${Array.from({ length: MAX_WAVES }, (_, i) => `<i class="${(i + 1) % 5 === 0 ? 'boss' : ''}"></i>`).join('')}</div></div>
      <button class="sq-btn" data-act="speed" id="h-speed" aria-label="Game speed">1× ▸</button>
      <button class="sq-btn" data-act="pause" aria-label="Pause">❚❚</button>
    </div>
    <div class="map-chip"><span class="tgt"></span><div>Aegis Perimeter<small>Grid ${COLS} × ${ROWS} · ${esc(q.name)}</small></div></div>
    <div class="deck">
      <div class="energy"><div class="n"><i class="ico"></i><span id="h-energy">10</span><small>/ ${ENERGY_MAX}</small></div><div class="bar" id="h-ebar">${Array.from({ length: ENERGY_MAX }, () => '<i><b></b></i>').join('')}</div></div>
      <div class="hand">${cards.map((id) => `<div class="card rarity-${unit(id).rarity}" data-card="${id}" role="button" aria-label="Deploy ${esc(unit(id).display_name)}"><span class="cost">${unit(id).energy_cost}</span><div class="in"><img src="${unit(id).portrait}" alt=""></div><div class="lv">Lv. ${S().units[id].level}</div><div class="stars">${'★'.repeat(STARS[unit(id).rarity])}</div><div class="energy-fill"><b></b></div></div>`).join('')}</div>
      <button class="ult" data-act="ult" id="h-ult"><div class="chg" id="h-ultc"></div><div class="hexb">✦</div>ULTIMATE</button>
    </div>
    <div id="b-inspect"></div><div id="b-hint"></div><div id="b-veil"></div>`;
  $('#battle-ui').onclick = battleUIClick;
  updateHud(true);
}
function banner(text, boss = false) { const d = document.createElement('div'); d.className = 'banner' + (boss ? ' boss' : ''); d.textContent = text; $('#battle-ui')?.append(d); setTimeout(() => d.remove(), 1900); }
function hint(text) { const h = $('#b-hint'); if (h) h.innerHTML = text ? `<div class="hint">${text}</div>` : ''; }
function battleUIClick(e) {
  const card = e.target.closest('[data-card]');
  if (card) {
    const id = card.dataset.card; app.audio.unlock();
    B.ultAim = false; closeInspect();
    if (B.pick === id) { B.pick = null; hint(''); } else { B.pick = id; app.audio.ui_('ui_select'); hint(`Tap a highlighted tile to deploy <b>${esc(unit(id).display_name)}</b>${unit(id).kind === 'tower' ? ' (tower — reroutes enemies)' : ''}`); }
    refreshValid(true); updateHud(true); return;
  }
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act, sim = B.sim;
  switch (a) {
    case 'wave': if (sim.startWave()) { app.audio.ui_('ui_confirm'); } break;
    case 'speed': B.speed = B.speed === 1 ? 2 : 1; $('#h-speed').textContent = B.speed + '× ' + (B.speed === 2 ? '▸▸' : '▸'); app.audio.ui_('ui_select'); break;
    case 'pause': setPaused(!B.paused); break;
    case 'resume': setPaused(false); break;
    case 'quit': ask('Leave the battle? It counts as a defeat (rewards for waves cleared still apply).', { ok: 'Leave', danger: true }).then((y) => { if (y && B.sim === sim) { setPaused(false); sim.finish(false); } }); break;
    case 'ult': {
      if (!sim.ultReady()) { app.audio.ui_('ui_error'); toast(sim.allies.some((x) => x.kind === 'hero') ? `Ultimate charging ${Math.floor(sim.ult)}%` : 'Deploy your hero first', true); break; }
      const hero = sim.allies.find((x) => x.kind === 'hero');
      if (hero.def.ult === 'orbital') { B.ultAim = !B.ultAim; B.pick = null; hint(B.ultAim ? 'Tap any tile to call the <b>orbital barrage</b>' : ''); refreshValid(true); }
      else { sim.ultimate(); }
      break;
    }
    case 'mk': { const r = sim.upgradeMk(B.inspect.uid); if (r.ok) app.audio.ui_('ui_upgrade'); else { toast(r.reason, true); app.audio.ui_('ui_error'); } showInspect(B.inspect); break; }
    case 'recall': { const r = sim.recall(B.inspect.uid); if (r.ok) { toast(`Recalled · +${r.refund} energy`); closeInspect(); } else toast(r.reason, true); break; }
    case 'close-inspect': closeInspect(); break;
  }
  updateHud(true);
}
function setPaused(p) {
  B.paused = p;
  $('#b-veil').innerHTML = p ? `<div class="paused-veil"><div class="panel"><h2 style="margin:0">PAUSED</h2><button class="btn gold" data-act="resume">▶ Resume</button><button class="btn ghost" data-act="quit">Leave battle</button></div></div>` : '';
}
function bindBattleInput(host) {
  host.onpointermove = (e) => {
    if (!B.view || (!B.pick && !B.ultAim) || e.pointerType === 'touch' && e.buttons === 0) { if (e.pointerType !== 'touch') B.view?.showHover(null); return; }
    const p = B.view.pick(e.clientX, e.clientY, host.getBoundingClientRect());
    if (!p?.inside) return B.view.showHover(null);
    if (B.ultAim) return B.view.showHover(p, true, 1.8);
    const ok = B.sim.canDeploy(B.pick, p.x, p.y).ok;
    B.view.showHover(p, ok, unit(B.pick).range);
  };
  host.onpointerdown = (e) => { host.onpointermove(e); };
  host.onpointerup = (e) => {
    if (!B.view || !B.sim) return;
    app.audio.unlock();
    const p = B.view.pick(e.clientX, e.clientY, host.getBoundingClientRect());
    if (B.ultAim) { if (p?.inside) { const r = B.sim.ultimate(p.x + 0.5, p.y + 0.5); if (!r.ok) toast(r.reason, true); B.ultAim = false; hint(''); B.view.showHover(null); } return; }
    if (B.pick) {
      if (!p?.inside) return;
      const occ = B.sim.occupiedByUnit(p.x, p.y);
      if (occ) { B.pick = null; hint(''); B.view.showHover(null); refreshValid(true); showInspect(occ); updateHud(true); return; }
      const r = B.sim.deploy(B.pick, p.x, p.y);
      if (r.ok) { app.audio.play(B.pick, { volume: 0.7 }); B.pick = null; hint(''); B.view.showHover(null); refreshValid(true); }
      else if (p.ally && /occupied/.test(r.reason)) { B.pick = null; hint(''); B.view.showHover(null); refreshValid(true); showInspect(p.ally); }
      else { app.audio.ui_('ui_error'); toast(r.reason, true); }
      updateHud(true); return;
    }
    if (p?.ally) showInspect(p.ally); else closeInspect();
  };
  host.onpointerleave = () => B.view?.showHover(null);
}
function refreshValid(force) {
  if (!B.view || !B.sim) return;
  const now = performance.now();
  if (!force && now - B.validAt < 450) return;
  B.validAt = now;
  if (!B.pick) return B.view.showValid([]);
  const tiles = [];
  for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) if (B.sim.canDeploy(B.pick, x, y).ok) tiles.push([x, y]);
  B.view.showValid(tiles);
}
function showInspect(ent) {
  if (!ent?.alive) return closeInspect();
  B.inspect = ent; B.view.select(ent); app.audio.ui_('ui_select');
  const d = ent.def, cost = ent.mk < 3 ? MK_COST(d, ent.mk) : null;
  $('#b-inspect').innerHTML = `<div class="inspect panel"><div class="r"><img src="${d.portrait}" alt=""><div><h4>${esc(d.display_name)} <small style="color:var(--gold)">Mk ${'I'.repeat(ent.mk)}</small></h4><div class="note">Lv. ${ent.level} · ${d.role} · ${esc(d.trait || '')}</div></div></div>
    <div class="st"><div>HP<b>${Math.ceil(ent.hp)}/${ent.maxHp}</b></div><div>${d.atk === 'heal' || d.atk === 'repair' ? 'Heal' : d.atk === 'shield' ? 'Shield' : 'DMG'}<b>${Math.round(d.atk === 'shield' ? ent.maxHp * d.shieldMult : ent.dmg * (d.healMult || 1))}</b></div><div>Range<b>${ent.range.toFixed(1)}</b></div><div>Shield<b>${Math.round(ent.shield)}</b></div></div>
    <div class="acts"><button class="btn gold" data-act="mk" ${cost && B.sim.battleAlloy >= cost ? '' : 'disabled'}>${cost ? `⬆ Mk ${'I'.repeat(ent.mk + 1)} · ${cost} ⬟` : 'Mk III max'}</button>${ent.kind === 'hero' ? '<span></span>' : `<button class="btn red" data-act="recall">Recall +${Math.floor(ent.spent / 2)}⚡</button>`}<button class="btn ghost" data-act="close-inspect" aria-label="Close">✕</button></div></div>`;
}
function closeInspect() { B.inspect = null; B.view?.select(null); const el = $('#b-inspect'); if (el) el.innerHTML = ''; }
function battleStep(dt) {
  const sim = B.sim; if (!sim) return 0;
  if (B.paused || sim.over) return B.paused ? 0 : dt;
  let t = dt * B.speed; const sdt = t;
  while (t > 0) { const h = Math.min(0.05, t); sim.step(h); t -= h; }
  const now = performance.now();
  if (now - B.lastHud > 120) { B.lastHud = now; updateHud(); if (B.inspect) { if (!B.inspect.alive) closeInspect(); } }
  refreshValid(false);
  return sdt;
}
function updateHud(force) {
  const sim = B.sim; if (!sim || !$('#h-energy')) return;
  $('#h-energy').textContent = Math.floor(sim.energy);
  $$('#h-ebar i b').forEach((b, i) => { b.style.width = Math.max(0, Math.min(1, sim.energy - i)) * 100 + '%'; });
  $('#h-balloy').textContent = fmt(sim.battleAlloy);
  $('#h-int').textContent = sim.integrity;
  $('#h-wave').textContent = `${sim.wave} / ${MAX_WAVES}`;
  $$('.wave-dots i').forEach((d, i) => d.classList.toggle('on', i < sim.wave));
  const wb = $('#h-wavebtn');
  wb.classList.toggle('hidden', sim.waveActive || sim.over || sim.wave >= MAX_WAVES);
  wb.innerHTML = `▶ ${(sim.wave + 1) % 5 === 0 ? '⚠ ' : ''}START WAVE ${sim.wave + 1}`;
  const heroOut = sim.allies.some((a) => a.kind === 'hero');
  const fieldCount = sim.allies.filter((a) => a.kind !== 'hero').length;
  $$('.hand .card').forEach((c) => {
    const u = unit(c.dataset.card);
    c.classList.toggle('pick', B.pick === u.id);
    const heroBlocked = u.kind === 'hero' && (heroOut || sim.time < sim.heroDownUntil);
    c.classList.toggle('poor', sim.energy < u.energy_cost || heroBlocked || (u.kind !== 'hero' && fieldCount >= FIELD_CAP));
    c.classList.toggle('hero-down', u.kind === 'hero' && !heroOut && sim.time < sim.heroDownUntil);
    if (u.kind === 'hero') c.dataset.cd = Math.ceil(sim.heroDownUntil - sim.time) + 's';
    c.querySelector('.energy-fill b').style.width = Math.min(100, (sim.energy / u.energy_cost) * 100) + '%';
  });
  $('#h-ultc').style.height = sim.ult + '%';
  $('#h-ult').classList.toggle('ready', sim.ultReady());
  $('#h-ult').classList.toggle('aim', B.ultAim);
  void force;
}
function battleEvent(ev) {
  const a = app.audio;
  switch (ev.type) {
    case 'fire': a.play(ev.ally.id, { volume: ev.ally.kind === 'hero' ? 0.8 : 0.5, maxVoices: 2, minGap: 0.09 }); break;
    case 'efire': a.play(ev.enemy.id, { volume: ev.enemy.boss ? 0.8 : 0.32, maxVoices: 2, minGap: 0.12 }); break;
    case 'wave': a.ui_('wave_start'); banner(ev.boss ? `⚠ WAVE ${ev.wave} · TITAN INBOUND` : `WAVE ${ev.wave} · INCOMING`, ev.boss); updateHud(); break;
    case 'waveClear': a.ui_('wave_complete'); if (ev.wave < MAX_WAVES) { banner(`SECTOR CLEARED · +${ev.bonus} BATTLE ALLOY`); } updateHud(); break;
    case 'leak': a.ui_('core_damage'); updateHud(); break;
    case 'ult': a.play(ev.hero.id, { volume: 1, maxVoices: 1, minGap: 0 }); banner(ev.kind === 'lance' ? 'AETHER LANCE' : 'ORBITAL BARRAGE'); break;
    case 'deny': break;
    case 'over': setTimeout(() => showResults(), 1400); break;
  }
}
function showResults() {
  if (!B.sim) return;
  const sim = B.sim, res = sim.result(B.squadIndex);
  const rewards = app.store.claimMatch(sim.matchId, res);
  const r = rewards || { alloy: 0, xp: 0, crystals: 0, trophies: 0, cards: {} };
  const cardEntries = Object.entries(r.cards);
  modal(`<h2 class="result-title ${res.victory ? '' : 'lose'}">${res.victory ? 'VICTORY' : 'DEFEAT'}</h2>
    <p class="note" style="text-align:center">${res.victory ? 'The Aether Core holds. Sector secured.' : 'The core has fallen. Upgrade your squad and return.'}</p>
    <div class="statline"><div>Waves cleared<b>${res.wavesCleared}/${MAX_WAVES}</b></div><div>Enemies<b>${res.kills}</b></div><div>Core<b>${res.integrity}/20</b></div><div>Score<b>${fmt(res.score)}</b></div></div>
    <div class="rewards">
      <div class="reward"><b><i class="ico alloy"></i>+${fmt(r.alloy)}</b>Alloy</div>
      <div class="reward"><b>+${r.xp}</b>XP${r.levelUp ? ' · LEVEL UP!' : ''}</div>
      <div class="reward"><b><i class="ico crystal"></i>+${r.crystals}</b>Crystals</div>
      <div class="reward"><b><i class="ico trophy"></i>${r.trophies >= 0 ? '+' : ''}${r.trophies}</b>Trophies</div>
      ${cardEntries.map(([id, n]) => `<div class="reward"><img src="${unit(id).portrait}" style="width:44px;height:44px;object-fit:cover;object-position:50% 15%;border-radius:8px"><b>+${n}</b>${esc(unit(id).display_name)} cards</div>`).join('')}
    </div>
    ${rewards ? '' : '<p class="note">Rewards for this match were already claimed.</p>'}
    <div class="row-btns"><button class="btn ghost" data-act="again">⟳ Play again</button><button class="btn gold" data-act="home" id="return-home">⌂ RETURN HOME</button></div>`,
  (act) => {
    if (act === 'home') { closeModal(); go('home'); }
    if (act === 'again') { closeModal(); endBattleView(); go('battle', { squad: B.squadIndex }); }
  });
  $('#modal').onclick = (e) => { const b = e.target.closest('[data-act]'); if (b) { if (b.dataset.act === 'home') { closeModal(); go('home'); } else if (b.dataset.act === 'again') { closeModal(); endBattleView(); go('battle', { squad: B.squadIndex }); } } };
}
addEventListener('keydown', (e) => {
  if (app.screen !== 'battle' || !B.sim) return;
  const cards = [...B.sim.squad.slots, B.sim.squad.hero];
  if (e.key >= '1' && e.key <= '6') { const c = $(`[data-card="${cards[Number(e.key) - 1]}"]`); c?.click(); }
  if (e.key === ' ') { e.preventDefault(); B.sim.startWave(); }
  if (e.key === 'p') setPaused(!B.paused);
  if (e.key === 'Escape') { B.pick = null; B.ultAim = false; hint(''); refreshValid(true); closeInspect(); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden && app.screen === 'battle' && B.sim && !B.sim.over) setPaused(true); });

boot();
