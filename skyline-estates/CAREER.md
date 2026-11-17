# Skyline Career — Phase A foundation

Status: Phase A, behind a feature flag that is **off by default**. With the flag off nothing changes for players: no menu entry, no profile writes.

- Code: `lib/career.js` (DOM-free core + browser glue), loaded after `home-redesign.js`.
- Tests: `tests/career-model.cjs` (core), `tests/career-browser.cjs` (real game, Chromium and WebKit), `tests/origins-round-study.cjs` (Origins balance guard rails from the pre-development study).
- Not in Phase A: Circuit, Dominion and Empire gameplay, the global street generator, final Career screens, artwork, online play.

## Safety checks (Phase A review)

- **No double counting:** a match id is counted once; evicted ids are blocked by `floor` (above).
- **Stale tabs:** before a career match's end-of-match save, the game re-reads the saved career record and uses it, so an older tab cannot overwrite newer progress or count a match twice. Other profile fields keep the game's existing single-tab behaviour.
- **Feature flag:** stored per device in `localStorage`. If storage is unavailable (private mode, blocked storage) the flag reads as off. A shared link with `?career=on` turns it on for whoever opens it, so keep such links to testers.
- **Newer versions:** a record with a higher `v` is never modified; recording, unlocks and helper calls are refused and the record is saved back exactly as it was.
- **Game Modes:** with the flag on, the temporary entry is added first and every existing entry stays, in the same order, with the same behaviour (tested with Pass & Play). With the flag off the panel is unchanged.

## Turning it on for testing

- Open the game with `?career=on` once; the setting stays on that device (`localStorage['skylineFeature.career']='on'`).
- `?career=off` turns it off again. Stored progress is kept.
- With the flag on, Game Modes shows a temporary **Skyline Career (preview build)** entry. It is a functional test screen only; the real Career interface comes from the approved design package.

## Boards

`SkylineCareerCore.BOARDS` is the registry every Career screen reads.

| Tier | id | Name | Difficulty | Playable now | Unlock requirements |
| --- | --- | --- | --- | --- | --- |
| 1 | `origins` | Skyline Origins | Easy | Yes (today's Classic game) | Available immediately |
| 2 | `circuit` | Skyline Circuit | Normal | No (preview) | Origins tutorial + 2 qualifying Origins wins |
| 3 | `dominion` | Skyline Dominion | Intermediate | No (preview) | 2 qualifying Circuit wins + 3 Circuit `district` challenges |
| 4 | `empire` | Skyline Empire | Advanced | No (preview) | 2 qualifying Dominion wins + 1 Dominion `negotiation` challenge |

Each board entry carries `id`, `tier`, `name`, `difficulty`, `strategy`, `playable`, `ruleset`, `requires`, `lengths`, `defaultLength` and `preview` (`headline`, `geometry`, `movement`, `building`, `victory`, `status`, `design`). `preview.design` is `null` until an approved design package is attached (see "Visual integration").

Unlocks are **sequential and permanent**: a board unlocks only after the previous board is unlocked and all its requirements are met, and an unlocked board never locks again. A board unlocked before it has gameplay shows as `unlocked-preview` ("coming soon"). The requirement numbers above are the handoff's initial values and are still to be validated.

## Origins integration

Origins is today's Classic game with **no rule changes**. A career match is an ordinary match started with two extra `set` fields: `career:'origins'` and `careerLength`. The test suite checks that a career match's settings and players match a Quick Play start exactly, apart from those two tags.

| Length | Settings |
| --- | --- |
| Quick | 20-round Championship |
| Standard (default) | 30-round Championship |
| Extended | 40-round Championship |
| Unlimited | Classic (play to the last solvent player, existing 300-round safety cap) |

Players are the Quick Play line-up: you plus three computer players at the chosen AI difficulty.

## Data model (`PREF.career`, version 1)

```json
{
  "v": 1,
  "unlocked": { "origins": 0, "circuit": 1794872717398 },
  "boards": {
    "origins": { "xp": 600, "matches": 4, "qualified": 4, "wins": 3, "qualifiedWins": 2, "bestScore": 4120, "lastAt": 1794872717398 }
  },
  "tutorials": { "origins": 1794872700000 },
  "challenges": { "circuit": { "district-a": { "tag": "district", "at": 1794872717398 } } },
  "receipts": [["<match id>", 1794872400000], "..."],
  "floor": 0
}
```

- `unlocked`: board id → time unlocked (`origins` is always `0`).
- `boards`: per-board mastery. Board mastery XP is separate from profile XP, which the game already awards: +100 for a counted match, +100 more for a win. Mastery levels start at 0, 300, 800, 1500, 2500 and 4000 XP.
- `tutorials`: completed board tutorials. For Origins, the existing How to play tour (`PREF.tutDone`) also counts.
- `challenges`: board challenges recorded by future board modules through `SkylineCareer.completeChallenge(board, id, tag)`.
- `receipts`: the last 400 counted matches as `[matchId, startedAt]`, so a match is never counted twice.
- `floor`: the latest start time among receipts dropped from that list. Any match that started at or before it is refused (`older-than-history`), so a match that falls out of the 400-entry list can never be counted again, for example after restoring an old save. Start times come from the wallet's permanent "match started" record, which is never pruned.
- Loading normalises the record: unknown boards and malformed values are dropped, counts must be non-negative integers. A record written by a newer version is left untouched and treated as read-only.

## Qualification rules

A finished career match counts (for mastery) only if **all** of these hold. The thresholds reuse the Season & city objective rules already in the game.

- Started as an Origins career match (`set.career='origins'`).
- Not a simulation or fast-forward match, not online, not SC-assisted practice.
- Finished normally (the results screen ran).
- Has a unique match id that has not been counted before.
- Has a profile owner (a human player on this device).
- At least 5 rounds, at least 2 minutes from the wallet's "match started" record to the finish, and at least 3 actions by the profile owner (buys, builds, trades, laps, auction wins).

A counted match is a **qualifying win** (it advances unlocks) only if the profile owner won **and** at least one opponent was a computer player on **Normal or Hard**.

Owner decisions (17 Nov 2026):

- Easy AI wins count toward mastery XP but do not unlock the next board.
- Normal or Hard AI wins qualify for unlocking.
- Quick 20-round Origins matches qualify when every other rule above is met.
- Cloud sync of career progress is deferred; progress stays on the device.
- Unlock thresholds stay provisional until player testing.
- All-human (pass-and-play) wins earn mastery XP only, like Easy wins.

Career progress is never written with the flag off, and City Boards progress is never read or written by career code. The browser test checks that a qualifying career match leaves every other part of the profile identical to the same match played with the flag off.

## Save compatibility

- **Existing saves:** unaffected. The Classic save slot (`skylineSave`) is reused for Origins career matches. The only addition is the two `set` tags, which the save validator already accepts. Tested: a career match saves, validates and resumes with its tags.
- **Harbour Ring and other saves:** untouched.
- **New boards:** each must use its own versioned slot (for example `skylineCircuitSave`), never the Classic or Harbour Ring slot. It must store ruleset version, seed, property manifest, players, ownership, development, turn state, scoring and pending decisions.
- **Profile:** `PREF.career` is a new, independent key, saved with the rest of the device profile (`skylinePrefs`).
- **Cloud sync limitation:** cloud sync does not carry `PREF.career` yet. Sync maps a fixed list of fields; adding career needs a server schema change, which needs backend approval. Until then career progress is per device. Sync neither reads nor removes it.

## Global property system (prepared, not built)

- `SkylineCareerCore.CATEGORIES`: `grand-boulevards`, `market-streets`, `financial-districts`, `cultural-streets`, `residential-districts`, `transport-corridors`.
- `SkylineCareerCore.rng(seed)`: deterministic seeded generator, so the same seed gives the same board on every device.
- `SkylineCareerCore.validateManifest(m)`: checks `{v:1, seed, ruleset, slots:[{slot, name, city, country, category, tier}]}`. It rejects duplicate names, unknown categories, bad seeds and tiers outside 1–8.
- Phase B adds the generator, category tags for the 662 streets and the World Tour option for Origins. Prices and rents stay tied to board slots, so balance does not change.

## Visual integration (for ChatGPT's design packages)

Each board's design package plugs in through its board registry entry (`preview.design`) and its own UI module, following the Harbour Ring pattern: a separate rules module, a separate UI module and its own save slot.

What each design package needs to provide:

1. **Geometry:** every space or node with a stable id, type (property, corner, junction, event, transport…), slot number, position in board units, and orientation for label text.
2. **Movement graph:** edges between nodes, direction, junction choices and any route rules shown on the board.
3. **Property presentation:** where names, prices, owner marks and building levels appear for each slot, at the smallest supported screen (667×375).
4. **Building placement:** an anchor point and footprint per buildable slot, with the five stages (Plot, Low-rise, Mid-rise, High-rise, Skyscraper) and the owner indicator.
5. **Camera:** overview and follow framings, plus any board-specific views, given as target, distance and angle.
6. **HUD layout:** regions for player cards, turn actions, prompts and board-specific panels, avoiding the player list and tool buttons on short landscape screens.
7. **States:** every interactive state (available, unavailable with reason, selected, contested, mortgaged, locked preview).
8. **Look:** colours as tokens, materials, lighting (Golden Hour and Daylight), with text drawn as real UI text rather than baked into images.
9. **Assets:** source assets at 3× for phones; textures up to 2048 px unless measured evidence supports more.
10. **Locked preview:** a still or simple scene of the board for the Career screen before it unlocks.

What the code provides to the design: board state through the rules module's read model (who decides what, legal actions, scores), the Career read model `SkylineCareer.state()` (status, requirements with progress, mastery, preview text per board), adaptive render resolution, and the existing token, character and currency services.

Performance budget: the design must hold a smooth frame rate on a mid-range phone in landscape. If a design exceeds it, the code team reports measured numbers and proposes a visually consistent alternative before changing anything.

## Known limitations

- Circuit, Dominion and Empire have no rules or UI; they can only be previewed and unlocked.
- Challenge kinds (`district`, `negotiation`) are placeholders until those boards define them.
- The temporary Career screen is functional only; it scrolls to reach the start buttons on short phones.
- Career progress is per device until cloud sync gains a career field (backend approval needed).
- Online Origins matches never count toward the career in Phase A.
