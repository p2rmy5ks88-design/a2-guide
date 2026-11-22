// Canonical gameplay data. Unit identity/stats come from data/asset_manifest.json;
// this file adds the battle-behaviour parameters the manifest does not carry.
export const COLS = 18, ROWS = 10, MAX_WAVES = 15;
export const ENTRY = { x: 0, y: 4 }, EXIT = { x: 17, y: 4 };
export const OBSTACLES = [[5, 2], [5, 3], [5, 6], [5, 7], [11, 1], [11, 2], [11, 7], [11, 8], [14, 4], [14, 5]];
export const MAX_LEVEL = 15;
export const ENERGY_MAX = 10, ENERGY_START = 10, ENERGY_REGEN_SECONDS = 2.4;
export const FIELD_CAP = 12; // regular deployables on the field at once (hero excluded)
export const CORE_INTEGRITY = 20;
export const RARITIES = ['common', 'rare', 'epic', 'legendary'];

// Collection upgrade requirements (GAME_DESIGN_AND_RULES.md). index = current level.
export const UPGRADE_TABLE = [null,
  { cards: 10, alloy: 100 }, { cards: 20, alloy: 180 }, { cards: 35, alloy: 300 }, { cards: 50, alloy: 450 },
  { cards: 80, alloy: 650 }, { cards: 120, alloy: 850 }, { cards: 180, alloy: 1200 }, { cards: 260, alloy: 1600 },
  { cards: 360, alloy: 2200 }, { cards: 490, alloy: 3000 }, { cards: 650, alloy: 4200 }, { cards: 850, alloy: 5700 },
  { cards: 1100, alloy: 7500 }, { cards: 1450, alloy: 10000 }];

// kind: unit (does not block path) | tower (occupies tile, blocks ground path) | hero
// atk: bolt | beam | rail | splash | arc | chain | cryo | flame | heal | repair | shield
export const BEHAVIOUR = {
  aegis_trooper:      { kind: 'unit', range: 2.8, rate: 0.6, atk: 'bolt', air: true, color: '#3ce5ff', trait: 'Steady pulse fire, hits air' },
  cobalt_scout:       { kind: 'unit', range: 2.4, rate: 0.42, atk: 'bolt', air: true, color: '#7ff3ff', trait: 'Cheap, very fast blaster' },
  ember_striker:      { kind: 'unit', range: 1.8, rate: 0.3, atk: 'flame', splash: 0.7, burn: 2, color: '#ff8a2a', trait: 'Short-range flame, burns groups' },
  helios_sniper:      { kind: 'unit', range: 5.2, rate: 1.7, atk: 'rail', air: true, priority: 'hp', color: '#ffc14a', trait: 'Rail shot, targets toughest enemy' },
  vesper_ranger:      { kind: 'unit', range: 3.2, rate: 0.5, atk: 'beam', air: true, color: '#ff4fd8', trait: 'Plasma beam, hits air' },
  siege_gunner:       { kind: 'unit', range: 3.0, rate: 0.2, atk: 'splash', splash: 0.45, color: '#ff9a3a', trait: 'Gatling barrage with splash' },
  bastion_guardian:   { kind: 'unit', tank: 3, armor: 0.3, range: 1.6, rate: 0.9, atk: 'bolt', color: '#ffd36e', trait: 'Holds 3 ground enemies, 30% armour' },
  rift_guardian:      { kind: 'unit', tank: 3, armor: 0.2, range: 1.8, rate: 1.0, atk: 'cryo', slow: 0.35, color: '#a46bff', trait: 'Holds 3 enemies, void blast slows' },
  atlas_walker:       { kind: 'unit', tank: 4, armor: 0.25, range: 2.6, rate: 0.85, atk: 'splash', splash: 0.55, color: '#3ce5ff', trait: 'Holds 4 enemies, twin cannons' },
  aether_drone_swarm: { kind: 'unit', flying: true, range: 2.6, rate: 0.35, atk: 'bolt', air: true, color: '#3ce5ff', trait: 'Flies over the field, hits air' },
  halo_medic:         { kind: 'unit', range: 2.0, rate: 1.2, atk: 'heal', healMult: 3, color: '#8affc8', trait: 'Heals units and towers nearby' },
  nova_engineer:      { kind: 'unit', range: 2.2, rate: 1.4, atk: 'repair', healMult: 4, color: '#ffb347', trait: 'Repairs towers at double strength' },
  pulse_cannon:       { kind: 'tower', range: 2.8, rate: 0.32, atk: 'bolt', air: true, color: '#3ce5ff', trait: 'Fast single-target turret' },
  nova_mortar:        { kind: 'tower', range: 4.2, minRange: 1.0, rate: 1.6, atk: 'mortar', splash: 1.1, color: '#ff8a2a', trait: 'Long-range ballistic splash' },
  arc_pylon:          { kind: 'tower', range: 2.6, rate: 0.8, atk: 'chain', chains: 3, air: true, color: '#c58bff', trait: 'Lightning chains 3 targets' },
  glacial_emitter:    { kind: 'tower', range: 2.6, rate: 0.8, atk: 'cryo', slow: 0.5, air: true, color: '#9ff4ff', trait: 'Freezes: −50% speed' },
  volt_sentinel:      { kind: 'tower', range: 3.0, rate: 0.24, atk: 'beam', air: true, color: '#4f8bff', trait: 'Rapid volt laser, hits air' },
  quantum_spire:      { kind: 'tower', range: 3.0, rate: 1.1, atk: 'chain', chains: 4, color: '#ff7ae6', trait: 'Quantum burst chains 4 targets' },
  aegis_barrier:      { kind: 'tower', range: 2.0, rate: 4.0, atk: 'shield', shieldMult: 0.35, color: '#4aa8ff', trait: 'Shields allies in 2 tiles' },
  sovereign_lyra:     { kind: 'hero', range: 3.2, rate: 0.55, atk: 'beam', air: true, color: '#d78bff', ult: 'lance', ultCharge: 100, trait: 'ULT: Aether Lance sweeps her whole row' },
  orbital_commander:  { kind: 'hero', range: 3.4, rate: 0.5, atk: 'bolt', air: true, color: '#3ce5ff', ult: 'orbital', ultCharge: 100, trait: 'ULT: Orbital barrage on any tile' },
};

export const ENEMY = {
  crawler_swarm:        { speed: 1.45, range: 0.6, rate: 0.8, bounty: 4, leak: 1, charge: 2 },
  scavenger_drone:      { speed: 1.35, range: 1.6, rate: 1.0, bounty: 5, leak: 1, flying: true, charge: 2 },
  assault_crab:         { speed: 0.95, range: 1.8, rate: 0.7, bounty: 8, leak: 2, charge: 3 },
  spectral_interceptor: { speed: 1.95, range: 1.8, rate: 0.9, bounty: 9, leak: 2, flying: true, charge: 3 },
  siege_walker:         { speed: 0.6, range: 2.6, rate: 1.8, bounty: 22, leak: 4, armor: 0.2, targetTowers: true, charge: 6 },
  titan_breaker:        { speed: 0.45, range: 2.4, rate: 2.2, bounty: 90, leak: 10, armor: 0.25, boss: true, splash: 0.8, targetTowers: true, charge: 25 },
};

export function waveComposition(w) {
  const q = [];
  const count = 8 + w * 2;
  for (let i = 0; i < count; i++) {
    let t = 'crawler_swarm';
    if (w >= 2 && i % 4 === 1) t = 'scavenger_drone';
    if (w >= 3 && i % 5 === 3) t = 'assault_crab';
    if (w >= 4 && i % 6 === 5) t = 'spectral_interceptor';
    if (w >= 6 && i % 9 === 7) t = 'siege_walker';
    if (w >= 11 && i % 7 === 2) t = 'assault_crab';
    q.push(t);
  }
  if (w % 5 === 0) q.push('titan_breaker');
  if (w === 15) q.splice(Math.floor(q.length / 2), 0, 'titan_breaker');
  return q;
}
export const waveHpMult = (w) => 1 + (w - 1) * 0.13 + Math.max(0, w - 10) * 0.06;
export const waveDmgMult = (w) => 0.72 * (1 + (w - 1) * 0.05);

let _manifest = null;
export async function loadManifest(url = 'data/asset_manifest.json') {
  if (_manifest) return _manifest;
  const res = await fetch(url);
  if (!res.ok) throw new Error('manifest ' + res.status);
  return setManifest(await res.json());
}
export function setManifest(m) {
  const byId = {};
  for (const u of m.units) byId[u.id] = { ...u, ...(BEHAVIOUR[u.id] || {}), ...(ENEMY[u.id] ? { enemy: ENEMY[u.id] } : {}) };
  for (const e of m.environment) byId[e.id] = { ...e };
  _manifest = { raw: m, byId, roster: m.units.filter((u) => u.category !== 'enemy').map((u) => byId[u.id]), enemies: m.units.filter((u) => u.category === 'enemy').map((u) => byId[u.id]), uiSounds: m.ui_sounds, rarity: m.rarity_rules };
  return _manifest;
}
export const manifest = () => _manifest;
