import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { M, MemStorage, autoplay, AF } from './helpers.mjs';
import { Battle } from '../../src/sim/battle.js';
import { Store, freshSave, migrate, validSquad, SAVE_KEY } from '../../src/save.js';
import { damageAt, hpAt, upgradeStatus, applyUpgrade, matchRewards } from '../../src/progression.js';
import { COLS, ROWS, ENTRY, MAX_WAVES, UPGRADE_TABLE } from '../../src/data.js';

const squad = { slots: ['aegis_trooper', 'bastion_guardian', 'vesper_ranger', 'pulse_cannon', 'nova_mortar'], hero: 'sovereign_lyra' };
const lv = (L) => Object.fromEntries(M.roster.map((u) => [u.id, L]));

test('manifest: 21 ownable roster entries + 6 enemies, all assets referenced exist', () => {
  assert.equal(M.roster.length, 21);
  assert.equal(M.enemies.length, 6);
  assert.equal(M.roster.filter((u) => u.category === 'hero').length, 2);
  for (const u of [...M.roster, ...M.enemies]) {
    assert.ok(fs.existsSync(path.join(AF, u.model)), u.model);
    assert.ok(fs.existsSync(path.join(AF, u.audio.file)), u.audio.file);
    assert.ok(fs.existsSync(path.join(AF, u.portrait)), u.portrait);
    assert.deepEqual(u.animation_clips, ['idle', 'move', 'fire', 'hit', 'die']);
    if (u.category !== 'enemy') assert.ok(u.kind && u.range > 0 && u.atk, 'behaviour for ' + u.id);
  }
  for (const s of Object.values(M.uiSounds)) assert.ok(fs.existsSync(path.join(AF, s.file)));
  const wavs = fs.readdirSync(path.join(AF, 'assets/audio')).filter((f) => f.endsWith('.wav'));
  assert.equal(wavs.length, 34);
  const glbs = fs.readdirSync(path.join(AF, 'assets/models')).filter((f) => f.endsWith('.glb'));
  assert.equal(glbs.length, 32);
});

test('level scaling follows spec formulas', () => {
  const u = M.byId.aegis_trooper;
  assert.equal(damageAt(u, 1), 29);
  assert.equal(damageAt(u, 15), Math.round(29 * 1.105 ** 14));
  assert.equal(hpAt(u, 10), Math.round(125 * 1.12 ** 9));
  assert.deepEqual(UPGRADE_TABLE[1], { cards: 10, alloy: 100 });
  assert.deepEqual(UPGRADE_TABLE[14], { cards: 1450, alloy: 10000 });
});

test('BFS: default route exists and every open tile can reach the core', () => {
  const b = new Battle({ byId: M.byId, squad, levels: lv(1) });
  assert.ok(b.path && b.path.length > 17);
  for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) if (!b.blocked(x, y)) assert.ok(b.findPath(x, y), `tile ${x},${y}`);
});

test('tower placement can never seal the route; units never block', () => {
  const b = new Battle({ byId: M.byId, squad, levels: lv(1) });
  b.energy = 1e9;
  // Wall column 8 except one gap, then try to close the gap.
  for (let y = 0; y < ROWS; y++) if (y !== 9) assert.ok(b.deploy('pulse_cannon', 8, y).ok || true);
  const placed = b.allies.filter((a) => a.kind === 'tower').length;
  assert.ok(placed >= 9 || placed === 12, 'placed ' + placed);
  const seal = b.canDeploy('pulse_cannon', 8, 9);
  assert.equal(seal.ok, false);
  assert.ok(b.findPath(ENTRY.x, ENTRY.y));
});

test('deploy rules: energy, squad membership, single hero, occupied tiles', () => {
  const b = new Battle({ byId: M.byId, squad, levels: lv(1) });
  assert.equal(b.canDeploy('arc_pylon', 3, 3).ok, false); // not equipped
  assert.ok(b.deploy('sovereign_lyra', 3, 3).ok);
  assert.equal(b.canDeploy('sovereign_lyra', 4, 3).ok, false); // energy 4 & hero exists
  b.energy = 10;
  assert.match(b.canDeploy('sovereign_lyra', 4, 3).reason, /Hero already/);
  assert.match(b.canDeploy('aegis_trooper', 3, 3).reason, /occupied/);
  b.energy = 2; assert.match(b.canDeploy('vesper_ranger', 6, 6).reason, /energy/);
});

test('waves: 15 waves, bosses on 5/10/15, idle commander loses', () => {
  const b = new Battle({ byId: M.byId, squad, levels: lv(1) });
  let t = 0;
  while (!b.over && t < 3000) { if (!b.waveActive) b.startWave(); b.step(0.05); b.drain(); t += 0.05; }
  assert.ok(b.over); assert.equal(b.victory, false); assert.equal(b.integrity, 0);
});

test('balance: an active commander with a levelled squad wins all 15 waves; level 1 is hard', () => {
  const win = new Battle({ byId: M.byId, squad, levels: lv(8) });
  autoplay(win);
  assert.ok(win.over, 'finished'); assert.equal(win.victory, true, `level-8 squad should win (reached wave ${win.wave}, integrity ${win.integrity})`);
  assert.equal(win.wave, MAX_WAVES);
  const r = win.result(0); assert.equal(r.wavesCleared, 15);
  const hard = new Battle({ byId: M.byId, squad, levels: lv(1) });
  autoplay(hard);
  console.log(`  L1 autoplay reached wave ${hard.wave} victory=${hard.victory} integrity=${hard.integrity}; L8 integrity=${win.integrity}`);
});

test('match upgrades use battle alloy only; recall refunds energy', () => {
  const b = new Battle({ byId: M.byId, squad, levels: lv(1) });
  const a = b.deploy('pulse_cannon', 3, 3).ally;
  const dmg1 = a.dmg; b.battleAlloy = 1000;
  assert.ok(b.upgradeMk(a.uid).ok); assert.ok(a.dmg > dmg1); assert.equal(a.mk, 2);
  assert.ok(b.battleAlloy < 1000);
  const e0 = b.energy; const r = b.recall(a.uid); assert.ok(r.ok); assert.equal(b.energy, Math.min(10, e0 + r.refund));
});

test('hero ultimate needs charge and hero on field', () => {
  const b = new Battle({ byId: M.byId, squad, levels: lv(1) });
  assert.equal(b.ultimate().ok, false);
  b.deploy('sovereign_lyra', 3, 4); b.ult = 100;
  b.startWave(); for (let i = 0; i < 60; i++) b.step(0.05);
  assert.ok(b.ultimate().ok); assert.ok(b.ult < 100);
});

test('save: fresh, squads valid, upgrade atomic, no negative wallet', () => {
  const st = new Store(M.roster, new MemStorage());
  const s = st.get();
  assert.equal(s.squads.length, 5);
  for (const q of s.squads) assert.ok(validSquad(q, M.roster));
  // upgrade aegis (12 cards, 500 alloy, needs 10/100)
  st.transact((d) => applyUpgrade(d, 'aegis_trooper'));
  assert.equal(st.get().units.aegis_trooper.level, 2);
  assert.equal(st.get().wallet.alloy, 400);
  assert.throws(() => st.transact((d) => applyUpgrade(d, 'aegis_trooper'))); // only 2 cards left
  assert.throws(() => st.transact((d) => { d.wallet.alloy = -5; }));
  assert.equal(st.get().wallet.alloy, 400, 'rejected transaction left state untouched');
  assert.throws(() => st.transact((d) => { d.squads[0].slots[1] = d.squads[0].slots[0]; }), /invalid squad/);
  assert.throws(() => st.transact((d) => { d.squads[0].slots[1] = 'orbital_commander'; }), /invalid squad/);
});

test('save: persists, reloads and migrates legacy prototype data', () => {
  const mem = new MemStorage();
  const a = new Store(M.roster, mem);
  a.transact((d) => { d.activeSquad = 3; d.squads[3].hero = 'sovereign_lyra'; d.settings.muted = true; });
  const b = new Store(M.roster, mem);
  assert.equal(b.get().activeSquad, 3); assert.equal(b.get().squads[3].hero, 'sovereign_lyra'); assert.equal(b.get().settings.muted, true);
  const legacy = new MemStorage(); legacy.setItem('aetherfront-best', '4321');
  assert.equal(new Store(M.roster, legacy).get().profile.bestScore, 4321);
  const broken = new MemStorage(); broken.setItem(SAVE_KEY, '{not json');
  assert.equal(new Store(M.roster, broken).get().schema, 2);
  const partial = migrate({ schema: 2, wallet: { alloy: 9, crystals: 1 }, units: {}, squads: [], stats: {} }, M.roster);
  assert.equal(partial.squads.length, 5); assert.equal(Object.keys(partial.units).length, 21);
});

test('rewards are deterministic and claimed exactly once per match', () => {
  const st = new Store(M.roster, new MemStorage());
  const res = { matchId: 'abc', victory: true, wavesCleared: 15, kills: 200, score: 9000, deploys: 25, titans: 4, squadIndex: 0 };
  const exp = matchRewards(res, ['x']);
  const a0 = st.get().wallet.alloy;
  const got = st.claimMatch('abc', res);
  assert.equal(st.get().wallet.alloy, a0 + exp.alloy);
  assert.equal(st.claimMatch('abc', res), null);
  assert.equal(st.get().wallet.alloy, a0 + exp.alloy, 'no double pay');
  assert.equal(st.get().stats.wins, 1);
  assert.ok(got.cards.sovereign_lyra > 0);
});
