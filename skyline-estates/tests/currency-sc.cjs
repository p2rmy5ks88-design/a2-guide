/* Run with: node skyline-estates/tests/currency-sc.cjs */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const script = fs.readFileSync(path.join(__dirname, '../lib/skyline-currency.js'), 'utf8');

const seasonState = { cf: {}, cp: {} };
const weeklyState = { list: ['games5'], done: {}, prog: {} };
const PREF = { coins: 250, scReserve: 0, scBoostNext: false };
let saves = 0;
const doc = {
  head: { appendChild() {} },
  createElement() {
    return {
      className: '', textContent: '', title: '', disabled: false,
      setAttribute() {}, append() {}, replaceWith() {}, insertAdjacentElement() {}
    };
  },
  querySelectorAll() { return []; }
};
const sandbox = {
  window: {},
  document: doc,
  PREF,
  TIERS: 40,
  G: null,
  fmt: n => '$' + n,
  savePref() { saves++; },
  claimTier(i, prem) {
    const box = prem ? seasonState.cp : seasonState.cf;
    if (box[i]) return false;
    box[i] = 1;
    return true;
  },
  weekly() { return weeklyState; },
  weeklyAdd(kind) {
    if (kind === 'games' && !weeklyState.done.games5) weeklyState.done.games5 = 1;
  },
  startWith(game) { sandbox.G = game; return game; },
  trackable() { return true; },
  railProfile() {},
  paneSeason() {},
  Date, Set, Number, Math, String, Object, Array
};
vm.runInNewContext(script, sandbox, { filename: 'skyline-currency.js' });
assert.equal(sandbox.fmt(1890), 'SC 1.89B');
assert.equal(sandbox.fmt(50), 'SC 50M');
assert.equal(sandbox.fmt(-12), '−SC 12M');
assert.equal(PREF.coins, 250, 'Shop coin balance must not change');
assert.equal(sandbox.claimTier(5, false), true);
assert.equal(PREF.scReserve, 40, 'free Season milestone must grant SC once');
assert.equal(sandbox.claimTier(5, false), false);
assert.equal(PREF.scReserve, 40, 'claiming twice must not duplicate the grant');
sandbox.weeklyAdd('games', 1);
assert.equal(PREF.scReserve, 65, 'weekly completion grants 25 SC');
sandbox.weeklyAdd('games', 1);
assert.equal(PREF.scReserve, 65, 'weekly completion may not duplicate SC');
PREF.scBoostNext = true;
const game = { online: false, sim: false, players: [{ ai: false, cash: 1600 }, { ai: true, cash: 1600 }] };
sandbox.startWith(game);
assert.equal(game.players[0].cash, 1665, 'only opted-in solo match gets available reserve');
assert.equal(game.players[1].cash, 1600, 'AI starts with normal cash');
assert.equal(game.scAssisted, true);
assert.equal(PREF.scReserve, 0);
assert.equal(PREF.scBoostNext, false);
assert.equal(sandbox.trackable(), false, 'assisted matches must be unranked/unrewarded');
const online = { online: true, sim: false, players: [{ ai: false, cash: 1600 }] };
PREF.scBoostNext = true;
PREF.scReserve = 40;
sandbox.startWith(online);
assert.equal(online.players[0].cash, 1600, 'online matches must never receive reserve cash');
assert.equal(PREF.scReserve, 40, 'online match must not spend reserve');
assert.ok(saves > 0);
console.log('Skyline Cash currency and earnings checks passed');
