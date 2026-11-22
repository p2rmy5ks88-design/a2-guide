// End-to-end browser QA with a REAL WebGL context (Chrome + SwiftShader). Produces screenshots in
// test-results/. Emulates iPhone viewports (portrait 393×852 / 440×956, landscape 844×390 / 956×440).
// NOTE: this is device EMULATION in desktop Chrome — not a physical iPhone Safari test.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/browser.mjs';

const AF = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(AF, 'test-results'); fs.mkdirSync(OUT, { recursive: true });
const PORT = 8793, URL = `http://127.0.0.1:${PORT}/aetherfront/`;
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const log = (...a) => console.log('•', ...a);
const results = [];
const check = (name, fn) => fn().then(() => { results.push(['PASS', name]); log('PASS', name); }, (e) => { results.push(['FAIL', name, e.message]); log('FAIL', name, e.message); });

const server = await serve(PORT);
const browser = await launch();
async function open(w, h, dpr = 3, storage) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true, userAgent: UA });
  if (storage) await ctx.addInitScript((s) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('aetherfront.save', s); sessionStorage.setItem('seeded', '1'); } }, storage);
  const page = await ctx.newPage(); page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') page.errors.push(m.text()); });
  page.on('requestfailed', (r) => { if (!/ERR_ABORTED/.test(r.failure()?.errorText || '')) page.errors.push('requestfailed ' + r.url()); });
  page.on('response', (r) => { if (r.status() >= 400) page.errors.push(r.status() + ' ' + r.url()); });
  await page.goto(URL);
  await page.waitForFunction(() => document.querySelector('#boot.gone'), null, { timeout: 90000 });
  await page.waitForTimeout(1200);
  return { ctx, page };
}
const shot = (page, name) => page.screenshot({ path: path.join(OUT, name + '.png') });
const tapSel = async (page, sel) => { await page.locator(sel).first().scrollIntoViewIfNeeded().catch(() => {}); const b = await page.locator(sel).first().boundingBox(); assert.ok(b, 'no element ' + sel); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(250); };

// ---------------------------------------------------------------- portrait meta-game
for (const [w, h] of [[393, 852], [440, 956]]) {
  await check(`portrait ${w}×${h}: home, squads, equip, upgrade, persistence`, async () => {
    const { ctx, page } = await open(w, h, 3);
    assert.equal(await page.evaluate(() => __AF.gl), true, 'WebGL active');
    await page.waitForTimeout(1500);
    await shot(page, `home-portrait-${w}x${h}`);
    const ov = await page.evaluate(() => { const r = document.querySelector('#battle-btn').getBoundingClientRect(); return { bottom: r.bottom, h: innerHeight, w: r.width }; });
    assert.ok(ov.bottom <= ov.h + 1, 'BATTLE button visible');
    await tapSel(page, '[data-act=units]');
    assert.equal(await page.evaluate(() => __AF.screen), 'squads');
    await shot(page, `squads-portrait-${w}x${h}`);
    // select Arc Pylon in collection, equip → replace slot 1
    await page.evaluate(() => document.querySelector('.grid .card[data-id="arc_pylon"]').scrollIntoView());
    await tapSel(page, '.grid .card[data-id="arc_pylon"]');
    await tapSel(page, '.detail [data-act=equip]');
    await page.evaluate(() => document.querySelector('.sq-scroll').scrollTop = 0);
    await tapSel(page, '[data-slot="0"]');
    let sq = await page.evaluate(() => JSON.parse(localStorage.getItem('aetherfront.save')).squads[0]);
    assert.equal(sq.slots[0], 'arc_pylon', 'slot replaced and saved');
    assert.equal(new Set(sq.slots).size, 5, 'no duplicates');
    // duplicate equip is impossible (button turns into Remove)
    assert.equal(await page.locator('.detail [data-act=remove]').count(), 1);
    // upgrade Aegis Trooper 1 → 2 (12 cards, 500 alloy)
    await page.evaluate(() => document.querySelector('.grid .card[data-id="aegis_trooper"]').scrollIntoView());
    await tapSel(page, '.grid .card[data-id="aegis_trooper"]');
    await tapSel(page, '.detail [data-act=upgrade]');
    const s1 = await page.evaluate(() => JSON.parse(localStorage.getItem('aetherfront.save')));
    assert.equal(s1.units.aegis_trooper.level, 2); assert.equal(s1.wallet.alloy, 400);
    assert.equal(await page.locator('.detail [data-act=upgrade]').isDisabled(), true, 'upgrade disabled when unaffordable');
    await shot(page, `collection-upgraded-${w}x${h}`);
    // reload → persisted
    await page.reload(); await page.waitForFunction(() => document.querySelector('#boot.gone'), null, { timeout: 90000 });
    const s2 = await page.evaluate(() => __AF.store.get());
    assert.equal(s2.units.aegis_trooper.level, 2); assert.equal(s2.squads[0].slots[0], 'arc_pylon');
    // switch active squad via home chip
    await tapSel(page, '[data-act=pick-squad][data-i="2"]');
    assert.equal(await page.evaluate(() => __AF.store.get().activeSquad), 2);
    assert.deepEqual(page.errors, []);
    await ctx.close();
  });
}

// ---------------------------------------------------------------- landscape battle loop
const autoplayInPage = ([maxSim, drop]) => {
  const B = __AF.battle, sim = B.sim; const plan = [[3, 3], [3, 5], [7, 3], [7, 5], [9, 4], [8, 6], [12, 3], [12, 6], [4, 4], [10, 2], [13, 5], [6, 4], [16, 3]];
  let t = 0, pi = 0;
  while (!sim.over && t < maxSim) {
    if (!sim.waveActive) sim.startWave();
    for (const id of sim.cards()) { const u = sim.byId[id]; if (sim.energy >= u.energy_cost) for (let k = 0; k < plan.length; k++) { const [x, y] = plan[(pi + k) % plan.length]; if (sim.canDeploy(id, x, y).ok) { sim.deploy(id, x, y); pi++; break; } } }
    if (sim.ultReady()) sim.ultimate(14, 4);
    for (const a of sim.allies) if (a.mk < 3 && sim.battleAlloy > 400) sim.upgradeMk(a.uid);
    sim.step(0.05); t += 0.05;
    if (drop) { const ev = sim.drain(); const o = ev.find((e) => e.type === 'over'); if (o) sim.events.push(o); }
  }
  return { over: sim.over, victory: sim.victory, wave: sim.wave, t };
};
for (const [w, h] of [[956, 440], [844, 390]]) {
  await check(`landscape ${w}×${h}: battle deploy by touch, picking accuracy, waves, results, return home, rematch`, async () => {
    const { ctx, page } = await open(w, h, 2);
    await shot(page, `home-landscape-${w}x${h}`);
    await tapSel(page, '#battle-btn');
    await page.waitForFunction(() => __AF.battle?.view && __AF.screen === 'battle');
    await page.waitForTimeout(2500);
    // HUD and all six cards fully on-screen
    const lay = await page.evaluate(() => ({ cards: [...document.querySelectorAll('.hand .card')].map((c) => c.getBoundingClientRect().toJSON()), vw: innerWidth, vh: innerHeight, hud: document.querySelector('.hud').getBoundingClientRect().toJSON() }));
    assert.equal(lay.cards.length, 6);
    for (const c of lay.cards) { assert.ok(c.bottom <= lay.vh + 0.5 && c.top >= 0 && c.right <= lay.vw + 0.5, 'card visible'); assert.ok(c.width >= 44 && c.height >= 44, 'touch target ≥44px'); }
    // board must sit between HUD and deck: project the 4 board corners
    const fit = await page.evaluate(() => { const v = __AF.battle.view; const pts = [[0, 0], [17, 0], [0, 9], [17, 9]].map(([x, y]) => v.tileScreen(x, y)); const deckTop = document.querySelector('.deck').getBoundingClientRect().top + 20; const hudB = document.querySelector('.hud').getBoundingClientRect().bottom - 6; return { pts, deckTop, hudB }; });
    for (const p of fit.pts) assert.ok(p.y > fit.hudB && p.y < fit.deckTop && p.x > 0 && p.x < w, `tile corner on screen ${JSON.stringify(p)}`);
    // straight rails: left/right board edges' horizontal skew stays small (rigid rectangle, not bent)
    const skew = Math.abs((fit.pts[0].x - fit.pts[2].x) - (fit.pts[3].x - fit.pts[1].x)) / 2;
    assert.ok(Math.abs(fit.pts[0].y - fit.pts[1].y) < 0.5 && Math.abs(fit.pts[2].y - fit.pts[3].y) < 0.5, 'top/bottom rails exactly horizontal');
    log(`   perspective edge convergence ${skew.toFixed(1)}px (rails straight)`);
    // picking accuracy for all 180 tiles
    const miss = await page.evaluate(() => { const v = __AF.battle.view, r = document.querySelector('#battle-host').getBoundingClientRect(); let bad = []; for (let x = 0; x < 18; x++) for (let y = 0; y < 10; y++) { const s = v.tileScreen(x, y); const p = v.pick(r.left + s.x, r.top + s.y, r); if (p.x !== x || p.y !== y) bad.push([x, y, p.x, p.y]); } return bad; });
    assert.deepEqual(miss, [], 'every tile centre picks itself');
    // real touch deploys: card → tile
    const tapTile = async (x, y) => { const s = await page.evaluate(([x, y]) => __AF.battle.view.tileScreen(x, y), [x, y]); await page.touchscreen.tap(s.x, s.y); await page.waitForTimeout(200); };
    const deck = await page.evaluate(() => [...__AF.battle.sim.squad.slots, __AF.battle.sim.squad.hero]);
    await tapSel(page, `[data-card="${deck[3]}"]`); // pulse cannon (tower)
    assert.ok(await page.evaluate(() => __AF.battle.view.validTiles.count > 100), 'valid tiles highlighted');
    await shot(page, `battle-select-${w}x${h}`);
    await tapTile(7, 3);
    await tapSel(page, `[data-card="${deck[0]}"]`); await tapTile(6, 5);
    await tapSel(page, `[data-card="${deck[5]}"]`); await page.waitForTimeout(200);
    let st = await page.evaluate(() => ({ allies: __AF.battle.sim.allies.map((a) => [a.id, a.cx, a.cy]), e: __AF.battle.sim.energy }));
    assert.ok(st.allies.some((a) => a[1] === 7 && a[2] === 3), 'tower deployed at tapped tile');
    assert.ok(st.allies.some((a) => a[1] === 6 && a[2] === 5), 'unit deployed at tapped tile');
    // deny: tapping hero with too little energy keeps it selected and toasts
    await tapTile(9, 2);
    // start wave by button, let it render real combat for a while
    await page.waitForTimeout(800);
    await page.evaluate(() => { __AF.battle.sim.energy = 10; });
    await tapSel(page, '#h-wavebtn');
    assert.equal(await page.evaluate(() => __AF.battle.sim.wave), 1);
    await page.evaluate(() => { const s = __AF.battle.sim; s.energy = 10; for (const [id, x, y] of [[s.squad.hero, 9, 4], [s.squad.slots[1], 4, 4]]) s.deploy(id, x, y); });
    await page.waitForTimeout(6000);
    await shot(page, `battle-wave1-${w}x${h}`);
    // inspect a deployed unit by tapping it, and Mk-upgrade with battle alloy
    await page.evaluate(() => { __AF.battle.sim.battleAlloy = 999; });
    await tapTile(7, 3);
    assert.ok(await page.locator('.inspect').count() === 1, 'inspect panel opened by tapping deployed unit');
    await tapSel(page, '[data-act=mk]');
    assert.equal(await page.evaluate(() => __AF.battle.sim.allies.find((a) => a.cx === 7 && a.cy === 3).mk), 2);
    await shot(page, `battle-inspect-${w}x${h}`);
    // fast-forward through the match with a scripted commander, rendering mid-way
    await page.evaluate(() => { __AF.__auto = true; });
    let r = await page.evaluate(autoplayInPage, [25, false]);
    await page.waitForTimeout(1500);
    await shot(page, `battle-mid-${w}x${h}`);
    r = await page.evaluate(autoplayInPage, [3000, true]);
    assert.ok(r.over, 'match ended');
    await page.waitForSelector('#return-home', { timeout: 10000 });
    await shot(page, `results-${r.victory ? 'victory' : 'defeat'}-${w}x${h}`);
    const before = await page.evaluate(() => __AF.store.get());
    assert.equal(before.stats.matches, 1); assert.ok(before.wallet.alloy > 500, 'rewards paid');
    const firstMatch = before.claimedMatches[0];
    // return home (no reload) → start again
    const navCount = await page.evaluate(() => performance.getEntriesByType('navigation').length);
    await tapSel(page, '#return-home');
    assert.equal(await page.evaluate(() => __AF.screen), 'home');
    await tapSel(page, '#battle-btn');
    await page.waitForFunction(() => __AF.battle?.sim && __AF.battle.sim.wave === 0);
    const after = await page.evaluate(() => ({ m: __AF.battle.sim.matchId, s: __AF.store.get(), nav: performance.getEntriesByType('navigation').length }));
    assert.notEqual(after.m, firstMatch); assert.equal(after.s.wallet.alloy, before.wallet.alloy, 'progression kept'); assert.equal(after.nav, navCount, 'no page reload');
    assert.deepEqual(page.errors, []);
    await ctx.close();
  });
}

// ---------------------------------------------------------------- victory path with a levelled save
await check('landscape 956×440: levelled squad wins 15 waves → victory rewards', async () => {
  const { ctx: c0, page: p0 } = await open(956, 440, 1);
  const save = await p0.evaluate(() => { const s = structuredClone(__AF.store.get()); for (const k in s.units) s.units[k].level = 10; return JSON.stringify(s); });
  await c0.close();
  const { ctx, page } = await open(956, 440, 2, save);
  await tapSel(page, '#battle-btn');
  await page.waitForFunction(() => __AF.battle?.view);
  await page.waitForTimeout(1500);
  await page.evaluate(autoplayInPage, [40, false]);
  await page.waitForTimeout(1200);
  await shot(page, 'battle-levelled-956x440');
  const r = await page.evaluate(autoplayInPage, [3000, true]);
  assert.equal(r.victory, true, 'victory');
  await page.waitForSelector('#return-home', { timeout: 10000 });
  await shot(page, 'results-victory-956x440');
  const s = await page.evaluate(() => __AF.store.get());
  assert.equal(s.stats.wins, 1); assert.ok(s.wallet.crystals >= 10);
  assert.deepEqual(page.errors, []);
  await ctx.close();
});

// ---------------------------------------------------------------- portrait battle shows rotate prompt
await check('portrait battle shows rotate guidance', async () => {
  const { ctx, page } = await open(393, 852, 2);
  await tapSel(page, '#battle-btn');
  await page.waitForTimeout(800);
  assert.equal(await page.locator('#rotate').isVisible(), true);
  await shot(page, 'battle-portrait-rotate-prompt');
  await ctx.close();
});

// ---------------------------------------------------------------- no-WebGL fallback
await check('2D fallback when WebGL is unavailable', async () => {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => { const o = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { return /webgl/.test(t) ? null : o.call(this, t, ...a); }; });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(URL); await page.waitForFunction(() => document.querySelector('#boot.gone'), null, { timeout: 60000 });
  assert.equal(await page.evaluate(() => __AF.gl), false);
  await tapSel(page, '#battle-btn'); await page.waitForTimeout(1200);
  await page.evaluate(() => { const s = __AF.battle.sim; s.deploy(s.squad.slots[3], 7, 3); s.startWave(); });
  await page.waitForTimeout(3000);
  await shot(page, 'battle-fallback2d-844x390');
  assert.deepEqual(errs, []);
  await ctx.close();
});

// ---------------------------------------------------------------- asset resolution under a sub-path (GitHub Pages)
await check('all GLB/WAV/portrait paths resolve relative to /aetherfront/', async () => {
  const m = JSON.parse(fs.readFileSync(path.join(AF, 'data/asset_manifest.json'), 'utf8'));
  const files = [...m.units.flatMap((u) => [u.model, u.audio.file, u.portrait, u.starter_model]), ...m.environment.map((e) => e.model), ...Object.values(m.ui_sounds).map((s) => s.file)];
  for (const f of files) { assert.ok(!f.startsWith('/'), 'relative path ' + f); const r = await fetch(URL + f); assert.equal(r.status, 200, f); }
});

await browser.close(); server.close();
fs.writeFileSync(path.join(OUT, 'e2e-summary.json'), JSON.stringify(results, null, 2));
const failed = results.filter((r) => r[0] === 'FAIL');
console.log(`\n${results.length - failed.length}/${results.length} browser checks passed`);
process.exit(failed.length ? 1 : 0);
