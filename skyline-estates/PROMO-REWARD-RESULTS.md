# Seven-day profile reward promo

Adds one hashed promo worth exactly 500,000 coins and 100,000 profile XP, expiring 2026-11-04 at 11:15 UTC (12:15 Europe/Stockholm). It is redeemable once per existing device-local saved profile. This follows the existing local promo model, not a server-enforced account entitlement. The plaintext code is delivered directly to the owner rather than committed.

Redemption reads the current saved profile, rejects duplicates/expired codes, persists balances and receipt in one write, then refreshes the UI. Failed persistence grants neither reward nor receipt. Web Locks serialize with collection upgrades where supported. Profile level is derived from total XP; this grant does not call match/season XP or award additional level-up coins, token mastery or wins. Existing coin-only promo entries remain compatible.

Validation: nine promo unit checks (exact reward, normalization, duplicate/concurrent attempts, expiry boundary, storage failure, fresh balances and legacy rewards); real Chrome Settings → Gameplay redemption, exact saved balances, derived level, reload and duplicate rejection, unchanged season/wins and zero page errors. Collection economy: 22 checks passed. Property engine/browser parity: all 41 cases passed with zero page errors. The audited source pin was updated after reviewing the game diff: only the promo table/redemption block changed; board, artwork and gameplay rules are unchanged. Generated web/offline assets are rebuilt.

The older downloadable IPA contains its previously built source and cannot redeem this newly added promo; it needs a rebuilt native bundle. Existing web saves are retained.
