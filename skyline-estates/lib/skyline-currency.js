/* Skyline Cash (SC) and Skyline Coins — web-only currency presentation and casual earned-SC bonuses.
   The existing match cash and Shop coin balances are deliberately NOT converted or merged. */
(function () {
  'use strict';
  if (window.SkylineCurrency) return;

  /* Match cash is stored internally in millions; 1,000 means SC 1B. */
  function compact(n) {
    const rounded = Math.round(n * 100) / 100;
    return String(rounded);
  }
  function formatSC(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 'SC —';
    const a = Math.abs(n);
    return (n < 0 ? '−' : '') + 'SC ' + (a >= 1000 ? compact(a / 1000) + 'B' : compact(a) + 'M');
  }
  // Only the web view changes. Numeric balances and server snapshots stay intact.
  const previousFormat = fmt;
  fmt = function (value) {
    if (!(G && G.online)) return formatSC(value);
    // Legacy peer-driven online games still serialize their generated log strings.
    // Keep those byte-compatible; presentation is translated below instead.
    const displayCurrency = CUR;
    try { CUR = countryOf((G.set && G.set.city) || CUR_CITY).cur; return previousFormat(value); }
    finally { CUR = displayCurrency; }
  };
  const cashCurrency = Object.freeze({ pre: 'SC ', post: 'M', big: 'B', bigPre: 'SC ', m: 1 });
  const previousApplyCity = applyCity;
  applyCity = function () {
    const result = previousApplyCity.apply(this, arguments);
    CUR = cashCurrency; // Also used by flying notes and Catch the Cash.
    return result;
  };
  CUR = cashCurrency;

  // Historical saves and authoritative online logs contain formatted city money.
  // Translate text nodes at the display boundary; never rewrite G.log or snapshots.
  const escapeRE = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function displayText(text) {
    const cur = countryOf((G && G.set && G.set.city) || CUR_CITY).cur;
    let result = String(text);
    for (const [prefix, suffix, scale] of [[cur.bigPre ?? cur.pre, cur.big, 1000], [cur.pre, cur.post, 1]]) {
      const pattern = new RegExp('(^|[^\\p{L}\\p{N}_])([−-]?)' + escapeRE(prefix) + '(\\d+(?:\\.\\d+)?)' + escapeRE(suffix) + '(?![\\p{L}\\p{N}_])', 'gu');
      result = result.replace(pattern, (_, boundary, sign, amount) => boundary + formatSC((sign ? -1 : 1) * Number(amount) * scale / cur.m));
    }
    return result;
  }
  function decorateLog(root) {
    if (!root) return;
    if (root.nodeType === 3) {
      if (root.parentElement?.closest('script,style,textarea,input,[contenteditable]')) return;
      const next = displayText(root.data);
      if (next !== root.data) root.data = next;
      return;
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) decorateLog(node);
  }
  if (document.body) {
    // Incremental text-only projection also covers remote prompts, buttons, floats
    // and asynchronously mounted dialogs, without touching inputs or game state.
    new MutationObserver(records => records.forEach(record => {
      if (record.type === 'characterData') decorateLog(record.target);
      else record.addedNodes.forEach(decorateLog);
    })).observe(document.body, { childList: true, subtree: true, characterData: true });
    decorateLog(document.querySelector('#ui'));
  }
  function cashPaint(paint) {
    return function () {
      const wireFormat = fmt;
      try { fmt = formatSC; return paint.apply(this, arguments); }
      finally { fmt = wireFormat; }
    };
  }
  // Canvas money must be formatted before measuring/painting the first board.
  drawBoard = cashPaint(drawBoard);
  drawCell = cashPaint(drawCell);
  const previousRoster = renderRoster;
  renderRoster = function () {
    const result = previousRoster.apply(this, arguments);
    decorateLog(document.querySelector('#roster'));
    decorateLog(document.querySelector('#round'));
    return result;
  };
  const previousModal = modal;
  modal = function () {
    const result = previousModal.apply(this, arguments);
    document.querySelectorAll('#modals .mp').forEach(decorateLog);
    return result;
  };
  const previousToast = toast;
  toast = function (text) { return previousToast.call(this, displayText(text)); };

  // Earned wallet/progression is installed by the following web-only module.
  window.SkylineCurrency = Object.freeze({
    version: 'web-sc-wallet-1', formatCash: formatSC, displayText: displayText,
    reserve: function () { return window.SkylineEarnedCash?.balance() || 0; },
    nextSoloBonusEnabled: function () { return !!PREF.scBoostNext; }
  });
})();
