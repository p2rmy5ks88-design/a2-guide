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
  fmt = formatSC;
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
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const next = displayText(node.data);
      if (next !== node.data) node.data = next;
    }
  }
  const logElement = document.querySelector('#log');
  if (logElement) {
    new MutationObserver(() => decorateLog(logElement)).observe(logElement, { childList: true, subtree: true, characterData: true });
    decorateLog(logElement);
  }
  const previousModal = modal;
  modal = function () {
    const result = previousModal.apply(this, arguments);
    document.querySelectorAll('.loglist').forEach(decorateLog);
    return result;
  };
  const previousToast = toast;
  toast = function (text) { return previousToast.call(this, displayText(text)); };

  /* Saved reserve is for optional solo practice boosts ONLY.
     It is not paid currency, does not buy Shop items, and never joins online matches. */
  function validReserve() {
    return Number.isSafeInteger(PREF.scReserve) && PREF.scReserve >= 0 ? Math.min(1000000, PREF.scReserve) : 0;
  }
  PREF.scReserve = validReserve();
  PREF.scBoostNext = PREF.scBoostNext === true;
  function addReserve(amount, reason) {
    if (!Number.isSafeInteger(amount) || amount <= 0) return;
    PREF.scReserve = Math.min(1000000, validReserve() + amount);
    PREF.scReserveLog = Array.isArray(PREF.scReserveLog) ? PREF.scReserveLog.slice(-19) : [];
    PREF.scReserveLog.push({ amount: amount, reason: String(reason).slice(0, 100), at: Date.now() });
    savePref();
  }

  /* Free Season milestones: SC 40M every fifth claimed tier.
     Existing Skyline Coins, XP, items, and free/premium grants are unchanged. */
  const previousClaimTier = claimTier;
  claimTier = function (tier, premium) {
    const claimed = previousClaimTier.apply(this, arguments);
    if (claimed && !premium && Number.isInteger(tier) && tier >= 5 && tier <= TIERS && tier % 5 === 0) {
      addReserve(40, 'Free Season tier ' + tier);
    }
    return claimed;
  };

  /* Each completed weekly challenge also grants SC 25M once.
     It uses the existing persisted weekly done flags, so rerenders do not grant again. */
  const previousWeeklyAdd = weeklyAdd;
  weeklyAdd = function (kind, number) {
    const active = weekly();
    const alreadyDone = new Set(active.list.filter(function (id) { return !!active.done[id]; }));
    const result = previousWeeklyAdd.apply(this, arguments);
    active.list.forEach(function (id) {
      if (!alreadyDone.has(id) && active.done[id]) addReserve(25, 'Weekly challenge: ' + id);
    });
    return result;
  };

  /* A reserve bonus is opt-in, only on creation of a NEW offline solo/practice match.
     At most SC 100M or 10% of normal starting cash can be transferred. */
  const previousStartWith = startWith;
  // A legacy save may lack masteryId. Only freshly constructed instances qualify.
  const newMatches = new WeakSet();
  const previousNewGame = newGame;
  newGame = function () {
    const result = previousNewGame.apply(this, arguments);
    if (G && typeof G === 'object') newMatches.add(G);
    return result;
  };
  startWith = function (game) {
    const fresh = game && newMatches.delete(game);
    const eligible = fresh && !game.online && !game.sim && !game.masteryId &&
      Array.isArray(game.players) && game.players.filter(function (p) { return !p.ai; }).length === 1 &&
      !game.players.some(function (p) { return !!p.uid; });
    if (eligible && PREF.scBoostNext && validReserve() > 0) {
      const player = game.players.find(function (p) { return !p.ai; });
      if (player && Number.isFinite(player.cash) && player.cash > 0) {
        const amount = Math.max(0, Math.min(100, Math.floor(player.cash * 0.10), validReserve()));
        if (amount > 0) {
          player.cash += amount;
          game.scAssisted = true;
          game.scStartingBonus = amount;
          PREF.scReserve -= amount;
          PREF.scBoostNext = false;
          savePref();
        }
      }
    }
    return previousStartWith.apply(this, arguments);
  };

  /* Assisted solo matches must never grant personal XP, trophies, season progression,
     match-win rewards or trusted rankings. Existing non-assisted games are unaffected. */
  const previousTrackable = trackable;
  trackable = function () {
    return previousTrackable.apply(this, arguments) && !(G && G.scAssisted);
  };

  function decorateCoins() {
    document.querySelectorAll('.coinpill').forEach(function (pill) {
      pill.title = 'Skyline Coins — Shop and collectible currency';
      pill.setAttribute('aria-label', 'Skyline Coins: ' + (pill.querySelector('b')?.textContent || '').trim());
      if (!pill.querySelector('.skyline-coin-label')) {
        const label = document.createElement('span');
        label.className = 'skyline-coin-label';
        label.textContent = 'Coins';
        pill.append(label);
      }
    });
  }
  const previousRailProfile = railProfile;
  railProfile = function () {
    const result = previousRailProfile.apply(this, arguments);
    decorateCoins();
    return result;
  };

  /* Clear, compact explanation and opt-in control inside the existing Season screen.
     No new menus, purchases or permanent cash-to-coins exchange. */
  function decorateSeason(panel) {
    const banner = panel && panel.querySelector('.sban');
    if (!banner) return;
    const section = document.createElement('section');
    section.className = 'skyline-sc-reserve';
    section.setAttribute('aria-label', 'Skyline Cash bonus reserve');
    const text = document.createElement('div');
    text.className = 'skyline-sc-reserve-text';
    const title = document.createElement('strong');
    title.textContent = 'Skyline Cash reserve: ' + formatSC(validReserve());
    const note = document.createElement('small');
    note.textContent = 'Earn SC 40M at free Season tiers 5, 10, 15… and SC 25M per completed weekly challenge. Normal match cash is earned from Start, rent, trades and events. Reserve bonuses are for solo practice only; Shop items use Skyline Coins.';
    text.append(title, note);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'skyline-sc-use';
    button.textContent = PREF.scBoostNext ? 'Cancel solo bonus' : 'Use SC in next solo game';
    button.disabled = !PREF.scBoostNext && validReserve() === 0;
    button.title = 'Optional: up to SC 100M (max 10% starting cash); assisted matches earn no XP, trophies or Season progress.';
    button.onclick = function () {
      PREF.scBoostNext = !PREF.scBoostNext;
      savePref();
      decorateSeason(panel);
    };
    section.append(text, button);
    const previous = panel.querySelector('.skyline-sc-reserve');
    if (previous) previous.replaceWith(section);
    else (panel.querySelector('#track') || banner).insertAdjacentElement('afterend', section);
  }
  const previousPaneSeason = paneSeason;
  paneSeason = function (panel) {
    const result = previousPaneSeason.apply(this, arguments);
    decorateSeason(panel);
    return result;
  };

  const style = document.createElement('style');
  style.textContent = '.skyline-coin-label{font-size:10px;opacity:.8;font-weight:700}.skyline-sc-reserve{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:7px 0 8px;padding:7px 11px;border-radius:12px;border:1px solid rgba(226,181,74,.32);background:rgba(8,26,44,.58);color:#f5efdc}.skyline-sc-reserve-text{flex:1 1 260px;min-width:0;display:grid;gap:2px}.skyline-sc-reserve-text strong{font-size:12px;color:#f5ce6b}.skyline-sc-reserve-text small{font-size:10px;line-height:1.35;opacity:.85}.skyline-sc-use{border:1px solid #c7a04f;border-radius:10px;background:#182948;color:#f5ce6b;padding:8px 10px;font:700 11px system-ui;min-height:44px;cursor:pointer}.skyline-sc-use:disabled{opacity:.5;cursor:default}';
  document.head.appendChild(style);
  decorateCoins();

  window.SkylineCurrency = Object.freeze({
    version: 'web-sc-2',
    formatCash: formatSC,
    displayText: displayText,
    reserve: function () { return validReserve(); },
    nextSoloBonusEnabled: function () { return !!PREF.scBoostNext; }
  });
})();
