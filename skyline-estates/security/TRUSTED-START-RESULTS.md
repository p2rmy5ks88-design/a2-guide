# Trusted human start foundation — 2026-10-27

Related to issue #2 and [PR #31](https://github.com/p2rmy5ks88-design/a2-guide/pull/31).

## Behavior

An explicitly composed start service reads the verified admission lobby, requires the current host and revision, and initializes the existing game from its actual human seats. No privileged playing-game fixture is needed for the new integration path. Sparse lobby seat numbers compact into the source's dense player order.

The source initializer still chooses distinct floor keys, the highest-key first player, the last-player 100 cash bonus, card shuffles and Quick Deal property assignments. The initial source busy phase is handed off to pre for the first roll. One finite server entropy tape is sampled outside transaction retries. A private retained start record, request receipt and room revision commit together. A retry after a lost acknowledgement recovers the original result without resampling or paying the bonus again.

Seat choices have exact token/finish/character fields and their own revision/receipt. Caller tiers, cash, UID and outcomes are rejected. Production composition requires an explicit synchronous trusted roster policy that authorizes ownership, tier, city/theme and selections. Test policies use source fixtures; they do not prove production entitlements.

Operation settlement now supports lobby start and selection. Its retained tombstone fences a delayed original request, and saved acknowledgements remain recoverable after the room moves into play. Public game reads expose only the committed opening announcement in addition to the existing allowlisted projection. Future decks and private setup/receipt records remain private.

## Verification

Tested implementation: `15e9ca0ed35b43879d5bbad12427b0dcab913cf7`.

- [Security workflow](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40578842540): **20 new start checks, 217 real Auth/Database integration checks (eight new start cases), 57 candidate permission checks**, and the previous service/kernel suites passed. Four legacy allowances remain isolated baseline demonstrations.
- [Browser workflow](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40578842538): **six committed-start/source comparisons**, 76 existing setup comparisons, 324 dice comparisons, prior UI/gameplay comparisons, **56 simulation regressions and 175 seeded games** passed. No browser exceptions or cash/house/hotel-bank failures were reported.
- [Retained per-game/browser results](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40578842538/artifacts/12769751653) record each simulated game's rounds, errors, cash and bank invariants and outcome, alongside the source comparisons and other browser results.

Local: 20 new start checks, 18 operation checks, 18 controller checks, 76 setup cases, 324 dice cases and 39 setup guards passed. Local loopback HTTP is unavailable in this environment; HTTP, real Auth/Database integration and browser tests passed in the isolated GitHub workflows.

New coverage includes three transaction callback attempts, cross-instance duplicate starts, lost HTTP replies, retirement, a host/revision change during preparation, exhausted entropy, sparse seats, source opening integrity and selection recovery before/after start. Browser comparisons cover authoritative starts against the original source in Classic, Quick Deal and Timed modes with two and six seats.

## Deliberate scope

This is the service foundation. The waiting-room controls, source-styled opening announcement and public title/create/join routing are still to be connected. All-human games with minigames disabled and timer zero are the supported opt-in start subset; unsupported settings return an explicit gate rather than being silently changed. Full AI turns, timer/minigame service behavior, production entitlement resolution and production hosting are not supplied by this slice.

The public web client, live Firebase rules/service, billing, approved board artwork, scenery and game source are unchanged. Phase 1 remains open.
