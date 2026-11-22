// Schema-versioned local save with migration + atomic, validated transactions.
import { matchRewards, grant, levelForXp } from './progression.js';
import { MAX_LEVEL } from './data.js';

export const SAVE_KEY = 'aetherfront.save';
export const SCHEMA = 2;

export const DEFAULT_SQUADS = [
  { name: 'Vanguard', slots: ['aegis_trooper', 'bastion_guardian', 'vesper_ranger', 'pulse_cannon', 'nova_mortar'], hero: 'sovereign_lyra' },
  { name: 'Stormline', slots: ['arc_pylon', 'glacial_emitter', 'cobalt_scout', 'atlas_walker', 'halo_medic'], hero: 'orbital_commander' },
  { name: 'Siegebreak', slots: ['siege_gunner', 'helios_sniper', 'rift_guardian', 'quantum_spire', 'nova_engineer'], hero: 'sovereign_lyra' },
  { name: 'Skyguard', slots: ['aether_drone_swarm', 'volt_sentinel', 'ember_striker', 'aegis_barrier', 'aegis_trooper'], hero: 'orbital_commander' },
  { name: 'Custom', slots: ['pulse_cannon', 'cobalt_scout', 'bastion_guardian', 'glacial_emitter', 'nova_mortar'], hero: 'sovereign_lyra' },
];

export function freshSave(roster) {
  const units = {};
  for (const u of roster) units[u.id] = { level: 1, cards: u.rarity === 'legendary' ? 2 : u.rarity === 'epic' ? 6 : 12 };
  return {
    schema: SCHEMA,
    profile: { name: 'Commander', xp: 0, trophies: 0, bestScore: 0 },
    wallet: { alloy: 500, crystals: 0 },
    units,
    squads: structuredClone(DEFAULT_SQUADS),
    activeSquad: 0,
    settings: { muted: false, volume: 0.8, quality: 'auto' },
    missions: { claimed: {} },
    season: { claimed: [] },
    stats: { matches: 0, wins: 0, deploys: 0, upgrades: 0, kills: 0, titans: 0, bestWave: 0 },
    claimedMatches: [],
  };
}

export function migrate(raw, roster, legacyBest = 0) {
  if (!raw || typeof raw !== 'object') { const s = freshSave(roster); s.profile.bestScore = legacyBest; return s; }
  let s = raw;
  if (!s.schema || s.schema < 2) { // v1 (pre-meta prototype) had only {best}
    const f = freshSave(roster); f.profile.bestScore = Math.max(legacyBest, Number(s.best || 0)); s = f;
  }
  const f = freshSave(roster);
  for (const k of Object.keys(f)) if (s[k] === undefined) s[k] = f[k];
  for (const k of Object.keys(f.stats)) if (s.stats[k] === undefined) s.stats[k] = 0;
  for (const u of roster) if (!s.units[u.id]) s.units[u.id] = f.units[u.id]; // new roster entries
  for (const id of Object.keys(s.units)) if (!roster.find((u) => u.id === id)) delete s.units[id];
  while (s.squads.length < 5) s.squads.push(structuredClone(DEFAULT_SQUADS[s.squads.length]));
  s.squads = s.squads.slice(0, 5).map((q, i) => (validSquad(q, roster) ? q : structuredClone(DEFAULT_SQUADS[i])));
  s.schema = SCHEMA;
  return s;
}

export function validSquad(q, roster) {
  if (!q || !Array.isArray(q.slots) || q.slots.length !== 5) return false;
  const byId = Object.fromEntries(roster.map((u) => [u.id, u]));
  if (new Set(q.slots).size !== 5) return false;
  if (q.slots.some((id) => !byId[id] || byId[id].category === 'hero')) return false;
  return !!byId[q.hero] && byId[q.hero].category === 'hero';
}

export function validate(s, roster) {
  const errs = [];
  if (s.wallet.alloy < 0 || s.wallet.crystals < 0 || !Number.isFinite(s.wallet.alloy)) errs.push('negative wallet');
  for (const [id, u] of Object.entries(s.units)) { if (u.cards < 0) errs.push('negative cards ' + id); if (u.level < 1 || u.level > MAX_LEVEL) errs.push('bad level ' + id); }
  s.squads.forEach((q, i) => { if (!validSquad(q, roster)) errs.push('invalid squad ' + (i + 1)); });
  if (s.activeSquad < 0 || s.activeSquad > 4) errs.push('active squad');
  return errs;
}

export class Store {
  constructor(roster, storage = globalThis.localStorage) {
    this.roster = roster; this.storage = storage; this.listeners = new Set();
    let raw = null, legacy = 0;
    try { raw = JSON.parse(storage?.getItem(SAVE_KEY) || 'null'); legacy = Number(storage?.getItem('aetherfront-best') || 0); } catch { raw = null; }
    this.state = migrate(raw, roster, legacy);
    this.persist();
  }
  get() { return this.state; }
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  persist() { try { this.storage?.setItem(SAVE_KEY, JSON.stringify(this.state)); } catch { /* private mode: in-memory only */ } }
  // Atomic: mutate a clone; commit only if fn succeeds AND invariants hold.
  transact(fn) {
    const draft = structuredClone(this.state);
    const out = fn(draft);
    const errs = validate(draft, this.roster);
    if (errs.length) throw new Error('Rejected: ' + errs.join(', '));
    this.state = draft; this.persist();
    for (const l of this.listeners) l(this.state);
    return out;
  }
  claimMatch(matchId, result) {
    return this.transact((s) => {
      if (s.claimedMatches.includes(matchId)) return null; // idempotent: never double-pay
      const squad = s.squads[result.squadIndex ?? s.activeSquad];
      const rewards = matchRewards(result, [...squad.slots, squad.hero]);
      const before = levelForXp(s.profile.xp).level;
      grant(s, rewards);
      s.profile.xp += rewards.xp;
      s.profile.trophies = Math.max(0, s.profile.trophies + rewards.trophies);
      s.profile.bestScore = Math.max(s.profile.bestScore, result.score);
      s.stats.matches++; if (result.victory) s.stats.wins++;
      s.stats.kills += result.kills; s.stats.deploys += result.deploys; s.stats.titans += result.titans || 0;
      s.stats.bestWave = Math.max(s.stats.bestWave, result.wavesCleared);
      s.claimedMatches = [...s.claimedMatches, matchId].slice(-30);
      return { ...rewards, levelUp: levelForXp(s.profile.xp).level > before };
    });
  }
}
