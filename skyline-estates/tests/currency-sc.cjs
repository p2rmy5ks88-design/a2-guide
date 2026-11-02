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
  drawBoard() { sandbox.paintCash = sandbox.fmt(30); }, drawCell() {}, renderRoster() {},
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
sandbox.G={online:true,set:{city:'lagos'}};
assert.equal(sandbox.fmt(30),'$30','online wire format stays intact');
sandbox.drawBoard();assert.equal(sandbox.paintCash,'SC 30M');assert.equal(sandbox.fmt(30),'$30');
const root=path.join(__dirname,'..');
for(const name of ['index','web-play','web-correction','web-follow','web-board','web-menus']){
 const page=fs.readFileSync(path.join(root,name+'.html'),'utf8'),boot=page.indexOf('try{const h=window.claude?.hot;');
 for(const file of ['skyline-sc-wallet','skyline-currency','skyline-earned-cash']){
  const tag='src="./lib/'+file+'.js"';assert.equal(page.split(tag).length,2);assert.ok(page.indexOf(tag)<boot);
 }
}
assert.ok(!fs.readFileSync(path.join(root,'game.html'),'utf8').includes('skyline-earned-cash'));
require('./sc-wallet.cjs');
console.log('SC formatter, generated startup and wallet checks passed');
