// Pure progression rules: stat scaling, collection upgrades, rewards, missions, season track.
import { UPGRADE_TABLE, MAX_LEVEL } from './data.js';

export const damageAt = (u, L) => Math.round(u.base_damage * Math.pow(u.damage_scale_per_level ?? 1.105, L - 1));
export const hpAt = (u, L) => Math.round(u.base_hp * Math.pow(u.hp_scale_per_level ?? 1.12, L - 1));
export const upgradeReq = (L) => (L >= MAX_LEVEL ? null : UPGRADE_TABLE[L]);
export const power = (u, L) => Math.round(hpAt(u, L) * 0.6 + damageAt(u, L) * 9 + L * 40);

export function upgradeStatus(save, id) {
  const inv = save.units[id];
  if (!inv) return { ok: false, reason: 'not owned' };
  const req = upgradeReq(inv.level);
  if (!req) return { ok: false, reason: 'max level', req: null };
  if (inv.cards < req.cards) return { ok: false, reason: 'cards', req };
  if (save.wallet.alloy < req.alloy) return { ok: false, reason: 'alloy', req };
  return { ok: true, req };
}

// mutates the (draft) save; callers use store.transact for atomicity
export function applyUpgrade(save, id) {
  const st = upgradeStatus(save, id);
  if (!st.ok) throw new Error('Cannot upgrade: ' + st.reason);
  save.units[id].cards -= st.req.cards;
  save.wallet.alloy -= st.req.alloy;
  save.units[id].level += 1;
  save.stats.upgrades += 1;
  return save.units[id].level;
}

export const levelForXp = (xp) => { let L = 1, need = 150; while (xp >= need) { xp -= need; L++; need = 150 + L * 60; } return { level: L, into: xp, need }; };

// Deterministic match rewards (no randomness, no duplicate claims — enforced by matchId in store)
export function matchRewards(result, squadIds) {
  const w = result.wavesCleared, win = !!result.victory;
  const r = {
    alloy: 40 * w + (win ? 300 : 0) + Math.floor(result.kills * 1),
    xp: 30 * w + (win ? 150 : 0),
    crystals: win ? 10 : 0,
    trophies: win ? 30 : -10,
    cards: {},
  };
  const each = 2 + Math.floor(w / 3) + (win ? 4 : 0);
  for (const id of squadIds) r.cards[id] = each;
  return r;
}

export const MISSIONS = [
  { id: 'win1', title: 'Win a battle', stat: 'wins', goal: 1, reward: { alloy: 200 } },
  { id: 'deploy30', title: 'Deploy 30 units', stat: 'deploys', goal: 30, reward: { crystals: 10 } },
  { id: 'upgrade1', title: 'Upgrade any unit', stat: 'upgrades', goal: 1, reward: { alloy: 150 } },
  { id: 'wave10', title: 'Reach wave 10', stat: 'bestWave', goal: 10, reward: { crystals: 15 } },
  { id: 'titan1', title: 'Defeat a Titan Breaker', stat: 'titans', goal: 1, reward: { alloy: 250 } },
  { id: 'kills500', title: 'Destroy 500 enemies', stat: 'kills', goal: 500, reward: { crystals: 25 } },
];
export const SEASON_TRACK = [
  { xp: 100, reward: { alloy: 150 }, label: '150 Alloy' },
  { xp: 300, reward: { crystals: 20 }, label: '20 Crystals' },
  { xp: 600, reward: { cards: { aegis_trooper: 15 } }, label: 'Aegis ×15' },
  { xp: 1000, reward: { alloy: 400 }, label: '400 Alloy' },
  { xp: 1500, reward: { cards: { sovereign_lyra: 10, orbital_commander: 10 } }, label: 'Hero cards' },
  { xp: 2200, reward: { crystals: 50 }, label: '50 Crystals' },
];

export function grant(save, reward) {
  if (reward.alloy) save.wallet.alloy += reward.alloy;
  if (reward.crystals) save.wallet.crystals += reward.crystals;
  if (reward.cards) for (const [id, n] of Object.entries(reward.cards)) if (save.units[id]) save.units[id].cards += n;
}
