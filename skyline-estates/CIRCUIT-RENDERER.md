# Skyline Circuit — rules-to-renderer interface (v1, prototype)

Status: interface for the playable prototype. Rules approved for prototype development (owner review, 17 Nov 2026), not for production. ChatGPT owns the board design, 3D art direction, camera, environment and HUD. This document says what the rules give a renderer and what a renderer may and may not do. No artwork here.

Module: `skyline-estates/lib/circuit-rules.js` (`SkylineCircuit` in the browser, `require` in Node). It has no DOM, no timers and no `Math.random`. The game does not load it yet.

## 1. Ownership boundary

| The rules own | The renderer owns |
| --- | --- |
| Dice, RNG, movement, legality, money, influence, victory | Board geometry, camera, animation, sound, HUD layout |
| The pending decision and its legal options | How options are presented and chosen |
| Effect events (what happened, in order) | How and how fast those events are animated |
| Save data (`serialize` / `restore`) | When to save (after every `act`) |

The renderer's rules:

- **Never change the state object.** Read it through `view(s)`.
- **Only send actions taken from `pending(s).options`.** For build actions, use `view(s).build` with `reason === null`.
- **Never roll dice or pick random numbers itself.** All randomness comes from the seeded RNG inside the state.
- **Animation speed, skipping or the screen being off must not change the outcome.** A match is the same whether it is animated or not; this is tested by comparing hashes.

## 2. Loop

```js
const s = SC.newMatch({ seed, length: 'standard', fx: true,
  players: [{ name: 'You' }, { level: 'normal' }, { level: 'hard' }],
  meta: { matchId, startedAt } });   // matchId/startedAt from the app (wall clock stays outside the rules)

function tick() {
  const events = SC.drain(s);        // what just happened, in order → animate
  const v = SC.view(s);              // what to draw now
  const pd = v.pending;              // whose decision, which options (null when the match is over)
  if (pd && s.players[pd.player].ai) SC.act(s, pd.player, SC.ai(s, pd.player));   // computer turn, after its animation
  // human turn: wait for a tap that maps to one of pd.options, then SC.act(s, pd.player, option)
  save(SC.serialize(s));             // own slot: localStorage['skylineCircuitSave']
}
```

`act` runs every automatic step (moving, paying, cards, end of round) until the next decision, then returns. A renderer animates the drained events before showing the next decision.

## 3. Pending decisions (`pending(s)` / `view(s).pending`)

| `type` | Options | Notes |
| --- | --- | --- |
| `roll` | `{type:'roll', via:'stay'}`, `{type:'roll', via:'cross'}` | The route plan is part of the roll. `view.preview` gives landing probabilities for both plans and `firstJunction`. |
| `route` | `{type:'route', via:'stay'\|'cross', to}` | Only with the research rule `routeTiming:'after-roll'`. It does not occur with the approved rules. |
| `buy` | `{type:'buy'}`, `{type:'pass'}` | `node` and `price` are included. It only appears when the player can afford the price. |
| `build` | `{type:'build', node, cost, to}`… and `{type:'end'}` | Every build phase ends with `end`. `view.build` also lists the ineligible properties with a reason. |

Build refusal reasons: `not-owned`, `max-stage`, `one-stage-per-turn`, `bought-this-turn`, `needs-network-2`, `needs-network-3`, `needs-network-3-both-rings`, `cannot-afford`.

## 4. Effect events (`drain(s)`, enabled by `newMatch({fx:true})`)

Each event has a `t` field and appears in the order it happened. Events are not saved, and they are not part of the transcript or hash.

| `t` | Fields | Meaning |
| --- | --- | --- |
| `turn` | `pid, round, order` | A player's turn starts. `order` is this round's seat order. |
| `roll` | `pid, dice:[a,b], plan, from` | Dice result and the declared plan (`stay`/`cross`). |
| `step` | `pid, from, to, via:'ring'\|'connector', left` | One hop. A `connector` hop is the crossing. `left` is the number of steps remaining. |
| `payday` | `pid, amount` | Entered `O0`. |
| `route` | `pid, at, steps` | Only with after-roll timing: waiting for a route choice. |
| `land` | `pid, node, type` | The move ended. |
| `buy` / `pass` | `pid, node[, price]` | A buy decision. |
| `rent` | `pid, to, node, amount` | Rent charged. It is followed by `sell` / `bankrupt` if the player can't pay. |
| `card` | `pid, card` | Event card: `grant`, `fund`, `festival`, `inspection`, `tax`, `toll`, `repairs`, `rentday`. |
| `build` | `pid, node, stage, cost` | A building rose one stage (1 Low-rise … 4 Skyscraper). |
| `sell` | `pid, node, stage, refund` | A forced sale during a payment. `stage` is the new, lower stage. |
| `bankrupt` | `pid, creditor` | The player is out. Their properties return to the bank (`view` shows them unowned). |
| `round` | `round, tally:[{pid, properties, networks, districts, districtIds, total, inf}]` | End-of-round influence scoring, by source. |
| `order` | `order` | Turn order reversed (snake). |
| `clock` | `pid, round, since` | The leader is at the target. They win at the end of `view.clock.winsAtEndOfRound` if they still lead then. |
| `clock-reset` | `pid` | The lead or target was lost, or there was a tie. |
| `over` | `winner, reason:'influence'\|'last-solvent'\|'round-limit'` | The match ended. |

Guaranteed ordering:

- Every `roll` is followed by exactly `dice[0]+dice[1]` `step` events, then one `land`.
- A `connector` step is never directly followed by another `connector` step.

Both are tested.

## 5. View model (`view(s)`, pure)

- **`round`, `rounds`, `target`, `length`:** match position and settings.
- **`turn`, `order`, `orderIdx`:** current seat and the order for this round.
- **`phase`:** `roll`, `route`, `buy`, `build` or `over`.
- **`pending`:** the current decision (see section 3).
- **`clock`:** `{pid, since, winsAtEndOfRound}` or `null`.
- **`over`, `winner`, `endReason`:** how the match ended, once it has.
- **`nodes[32]`:** each has `id, type ('property'|'event'|'junction'), ring ('O'|'I'), idx, quadrant (district 0–3), link (paired junction or null)`.
  - Properties also have `price, owner (-1 = bank), stage 0–4, stageName, rent, nextCost`.
- **`players[]`:** `id, name, ai ('route'|'random'|null for human), level, cash, influence, pos, out, netWorth`, plus:
  - `nextTally`: what they would score at the next round end, split by source;
  - `networks`: `[{props, size, rings}]`, for highlighting connected ownership.
- **`build`:** during a build phase, each of the player's properties with `stage, cost, reason`.
- **`preview`:** during a roll phase:
  - `{stay, cross}`, each with `landing:[{node, p}]` (sums to 1) and `junctionChance` (the chance the plan applies at all);
  - `firstJunction:{node, stepsAway, crossTo}`.

## 6. The 10 interaction states and how they are presented

The renderer derives each state from `view(s).phase`/`pending` and the drained events. The presentation column is a functional requirement, not a visual design; ChatGPT decides the look.

| # | State | Source | Presentation requirement |
| --- | --- | --- | --- |
| 1 | **Plan and roll** | `pending.type==='roll'` | A two-way Stay/Cross control with Roll as the main action. Highlight `firstJunction` and its connector. Show both plans' likely landings from `preview` (for example, a faint heat strip on each route). If `junctionChance` is 0, say the plan has no effect this turn. Computer players skip the control. |
| 2 | **Movement** | `roll` → `step`… → `land` | Animate hop by hop. A connector hop travels along the connector. Payday shows on the `O0` hop. Skippable. |
| 3 | **Buy** | `pending.type==='buy'` | Show the property's name, price, district, rent at Plot, and whether buying would join a network (compare `networks` before and after). Buy and Pass. |
| 4 | **Build** | `pending.type==='build'`, `view.build` | Owned properties with their next stage and cost. Ineligible ones are shown greyed out with their reason in plain words (for example "Needs 3 connected properties on both rings"). End turn is always present. |
| 5 | **Event card** | `card` | The card face and its effect (cash or influence change). |
| 6 | **Rent** | `rent` | Payer to owner, the amount, and the network bonus if any. Show it from the receiver's side too. |
| 7 | **Bankruptcy** | `sell`… `bankrupt` | Forced sales one by one, then the player is out and their properties return to the bank. |
| 8 | **End of round** | `round`, then `order` | The influence tally per player (properties, networks, districts). Then the turn-order reversal shown clearly (snake order is new to players). |
| 9 | **Victory clock** | `clock` / `clock-reset`, `view.clock` | A persistent banner: "*Name* is at the target — wins at the end of round *N* if still leading". It clears on reset. |
| 10 | **Game over** | `over` | Winner, reason, and final influence and net worth. Career progress, when integrated, uses `careerFacts`. |

## 7. Saves

- `serialize(s)` produces `{key:'skylineCircuitSave', ruleset:'circuit-v0', v:1, state}`. The state is plain JSON, including the RNG position, so a restored match resumes exactly.
- `restore(text)` returns `{ok, state}` or `{ok:false, reason}`:
  - `invalid` for a corrupt or malformed save;
  - `wrong-ruleset` for another board's data;
  - `newer-version` for a save from a newer app. It is refused and must be left as stored.
- The Circuit uses its own storage key. It never reads or writes `skylineSave` (Classic) or `skylineRingSave` (Harbour Ring).

## 8. Career integration (prepared, not wired)

- `careerFacts(s, {ownerSeat, endedAt, online, assisted, sim})` returns the facts object that `SkylineCareerCore.record()` takes (PR #212).
- `board:'circuit'`.
- `activity` = buys + builds.
- `aiLevel` is the **weakest** computer opponent's level, so an Easy seat can't be hidden behind a Hard one.
- `experimental:true` for Quick.
- Difficulty mapping (`AI_LEVELS`): `easy` = random route, `normal` = route-aware, `hard` = route-aware. A stronger Hard AI has not been built yet.
- Needed in Career before Circuit can count, a small change to PR #212 or a later PR:
  1. `qualify()` accepts a board marked playable rather than only `'origins'`.
  2. Circuit becomes `playable:true` with `ruleset:'circuit-v0'` and lengths `['standard','extended']`.
  3. Decide whether experimental Quick matches count; the recommendation is mastery XP only.
- Not done here, because PR #212 is under separate approval.

## 9. Layout check for the board design

`validateLayout({unit:'pt', nodes:{O0:{x,y}, …}}, {minSpacing:44})` checks a proposed top-view layout. y points toward the viewer, as on screen.

- **Hard checks (errors):**
  - all 32 IDs present, and no others;
  - both rings run clockwise;
  - every inner node is inside the outer ring;
  - no two node centres closer than `minSpacing`;
  - no connector passes over another node.
- **Warning:** a connector shorter than `minSpacing`.
- **Stats:** closest pair, connector lengths and the bounding box.
- `referenceLayout()` is a mechanical circle-on-circle layout used for tests. It is **not** artwork.

## 10. Determinism contract

- Same seed and same actions give an identical transcript hash (`hash(s)`).
- Changing these never changes the hash or the winner (tested):
  - effects on or off;
  - `view` called at every step;
  - save and restore mid-match.
- Simulations run headless with effects off.
