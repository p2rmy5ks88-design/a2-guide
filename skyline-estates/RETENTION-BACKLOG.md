# Retention backlog — defer implementation until the current core milestone

The game already implements daily missions, streaks, weekly season challenges, trophies, leagues, progression and cosmetic unlocks. Relevant source areas are `daily`, `streakMark`, `weekly`, `season` and the trophy/progression definitions in game.html. New systems must not duplicate these or distract from reliable saved progress, stable matches and trusted online outcomes.

Recommendation: plan now, then test **one small improvement** after the current web stability/security slice is accepted. There is no need to wait for an App Store release to prototype that improvement on the web, but signed/device acceptance and online security remain separate gates. No new retention feature is implemented by this milestone.

| Priority | Idea | Why / dependency |
| --- | --- | --- |
| First | Make the existing daily objective and earned progress easier to notice | Reuses missions and existing rewards; confirm progress/save reliability and do not add another currency |
| Next | A simple rematch / invite-the-same-friends flow | Builds on trusted room admission; preserve seats/settings and test joins/retries |
| Later | A clear next cosmetic milestone after a completed match | Use existing unlocks; show an achievable goal without rewriting the economy |
| Later | A small weekly themed challenge using existing supported settings | Confirm players understand it and finish matches; no new rule set is assumed approved |
| Hold | More currencies, monetized rewards, competitive events or push campaigns | Requires trusted progression/receipts, operational support and privacy/notification choices |

Choose one hypothesis, keep the reward small and earned, and assess completion/understanding and whether playtesters voluntarily return. Establish any analytics/privacy requirements before collecting new telemetry; this plan adds no tracking. Do not make maintaining a streak a penalty for missing a day.

The earlier referenced conversation does not expose its full suggestion text to repository tools, so this is a current, source-grounded shortlist rather than a claim to reproduce that list verbatim. The approved board artwork, 3D scenery, UI and custom rules remain unchanged.
