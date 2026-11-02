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
  querySelectorAll() { return []; },
  querySelector() { return null; }
};
const sandbox = {
  window: {},
  document: doc,
  PREF,
  TIERS: 40,
  G: null,
  fmt: n => '$' + n,
  CUR: {}, CUR_CITY: 'lagos',
  applyCity() {},
  countryOf() { return {cur:{pre:'$',post:'K',bigPre:'$',big:'M',m:1}}; },
  modal() {}, toast() {},
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
  newGame(game) { sandbox.G = game; },
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
sandbox.newGame(game);
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
sandbox.newGame(online);
sandbox.startWith(online);
assert.equal(online.players[0].cash, 1600, 'online matches must never receive reserve cash');
assert.equal(PREF.scReserve, 40, 'online match must not spend reserve');
assert.equal(sandbox.fmt(30), 'SC 30M', 'online and local displays must use SC');
assert.equal(sandbox.window.SkylineCurrency.displayText('Paid $30K; balance $1.6M.'), 'Paid SC 30M; balance SC 1.6B.');
for (const [cur, text, expected] of [
  [{pre:'₦',post:'M',bigPre:'₦',big:'bn',m:1}, 'Paid ₦30M; ₦1.6bn.', 'Paid SC 30M; SC 1.6B.'],
  [{pre:'',post:' Mkr',bigPre:'',big:' bn kr',m:1}, 'Paid 30 Mkr; −1.6 bn kr.', 'Paid SC 30M; −SC 1.6B.'],
  [{pre:'¥',post:'M',bigPre:'¥',big:'B',m:0.1}, 'Paid ¥3M; ¥1B.', 'Paid SC 30M; SC 10B.'],
  [{pre:'R',post:'K',bigPre:'R',big:'M',m:10}, 'Paid R300K; R1M.', 'Paid SC 30M; SC 100M.']
]) {
  sandbox.countryOf=()=>({cur});
  assert.equal(sandbox.window.SkylineCurrency.displayText(text),expected);
  assert.equal(sandbox.window.SkylineCurrency.displayText(expected),expected,'SC display must be idempotent');
}
const root=path.join(__dirname,'..');
for (const name of ['index','web-play','web-correction','web-follow','web-board','web-menus']) {
  const page=fs.readFileSync(path.join(root,name+'.html'),'utf8');
  const module=page.indexOf('<script src="./lib/skyline-currency.js">');
  assert.ok(module>0&&module<page.indexOf('try{const h=window.claude?.hot;'),'currency must install before boot: '+name);
  assert.equal(page.split('src="./lib/skyline-currency.js"').length,2,'load module exactly once');
}
assert.ok(!fs.readFileSync(path.join(root,'game.html'),'utf8').includes('skyline-currency.js'),'native/server source excludes web currency');
for (const [name, g, fresh] of [
  ['legacy resume', {players:[{ai:false,cash:1600},{ai:true,cash:1600}]}, false],
  ['current resume', {masteryId:'old',players:[{ai:false,cash:1600},{ai:true,cash:1600}]}, false],
  ['pass and play', {players:[{ai:false,cash:1600},{ai:false,cash:1600}]}, true],
  ['simulation', {sim:true,players:[{ai:false,cash:1600},{ai:true,cash:1600}]}, true],
  ['online seat', {players:[{uid:'seat',ai:false,cash:1600},{ai:true,cash:1600}]}, true]
]) {
  PREF.scReserve=40; PREF.scBoostNext=true;
  if(fresh)sandbox.newGame(g);
  sandbox.startWith(g);
  assert.equal(g.players[0].cash,1600,name+' must not gain a bonus');
  assert.equal(PREF.scReserve,40,name+' must not consume reserve');
}
PREF.scReserve=1000; PREF.scBoostNext=true;
const capped={players:[{ai:false,cash:500},{ai:true,cash:500}]};
sandbox.newGame(capped);sandbox.startWith(capped);
assert.equal(capped.players[0].cash,550,'bonus capped at 10%');
PREF.scBoostNext=true;sandbox.startWith(capped);
assert.equal(capped.players[0].cash,550,'same game cannot consume a second bonus');
assert.equal(PREF.scReserve,950);
PREF.scBoostNext=true;
const large={players:[{ai:false,cash:5000},{ai:true,cash:5000}]};
sandbox.newGame(large);sandbox.startWith(large);
assert.equal(large.players[0].cash,5100,'bonus capped at SC 100M');
assert.ok(saves > 0);
console.log('Skyline Cash currency and earnings checks passed');
