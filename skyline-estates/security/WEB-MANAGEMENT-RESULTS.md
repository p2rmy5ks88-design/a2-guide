# Portfolio, debt and consented trade controls — 2026-10-27

Related to issue #2 and [PR #30](https://github.com/p2rmy5ks88-design/a2-guide/pull/30). Tested implementation: `edfb43e28752cb3c80a00fe479738ca0d65e77e8`.

## Scope and behavior

The opt-in trusted screen now uses the original portfolio and trade editor/review dialogs for ordinary property management, raising purchase cash, debt liquidation/payment/bankruptcy and human trade consent. Its build/sell/mortgage/redeem callbacks dispatch commands instead of executing local financial functions. State/checkpoint/revision/receipt changes remain authoritative server transactions. The original functions and handlers are restored on close. Managed portfolios reopen at the selected property from acknowledged state; profile scanning and legacy pushes stay disabled during rendering.

The new ordinary property HTTP alias reuses the existing admission action implementation and normalized ledger digest. A retry through either alias therefore recovers the same operation. Existing journal settlement and retained operation-ID fences also cover assetAction and purchaseAsset; a lost reply cannot trigger a second mortgage, build or repayment.

Purchase-only asset edits require the current private purchase checkpoint, actor, source price/affordability and still-bank-owned offered square. The original financial rules apply while the game remains at that decision. The saved dice/card/landing context is retained without replaying movement, rotating a deck, charging an earlier bill or buying automatically. Source price is unchanged and canBuy is recomputed after the edit. Retained roll/end slots fence stale edits; the ordinary property route still cannot bypass a pending decision.

Debt portfolios send sell/mortgage through the existing debt replay handler and pay the fixed effective bill only after explicit Pay. Bankruptcy is disabled when funds cover that bill, including after portfolio selection/footer redraws; the server independently rejects funded bankruptcy. Closing/locating a property does not invent automatic liquidation or payment.

Trade proposals transfer nothing. Recipient review binds the current revision and exact saved offer hash. Accept/decline/counter use the original terms and source three-counter limit; cancelling the counter editor retains the original decline behavior. Stale callbacks do not apply to a replacement offer. Developed-group restrictions, mortgages, cash and held-pass semantics remain in the source kernels; the UI only sees pass counts.

Confirmed preview UI fixes: unchanged polling no longer replaces the recovery control and steals its click/focus; a funded-debt bankruptcy button stays disabled when the original portfolio redraws its footer.

## Verification

- [Security workflow](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40573891253): **26 management checks**, **209 total real Auth/Database integration checks (10 new management cases)**, prior operation/controller/gameplay suites and **57 candidate permission checks** passed. Four legacy allowances remain isolated baseline demonstrations.
- [Browser workflow](https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40573891212): **17 original-source property comparison cases and 14 management UI checks**, zero captured browser exceptions. Covers build/sell, lost mortgage/reload/redeem, stable recovery focus, proposal/accept/counter/decline, no local profile rewards, Raise cash, debt mortgage/Pay and explicit bankruptcy. The funded-bankruptcy check includes a portfolio selection redraw.
- The prior 11 board-control and 13 transport browser checks, all source gameplay comparisons including 1,022 AI comparisons, **289 existing regressions and 175 seeded games** passed. No simulation errors or cash/house/hotel-bank failures. Workflow artifact `skyline-stability-results/skyline-phase1.json` retains per-run rounds/errors/invariants/outcomes; other reports are in the same artifact.
- Real Auth/Database cases cover duplicate builds across independent connections, normalized legacy/new property receipt recovery, retirement fencing, once-only purchase mortgages, ordinary-route and wrong-seat denial, funded purchase continuation and HTTP lost-reply recovery/redemption.
- Generated offline assets and whitespace checks passed. Game source remains pinned to `4f1fded99af3eabdab0de3dbe453f97b401c5d03b3c9cdc39aa1e4a91a9f0d0b`. Approved board/art/scenery/custom values and generated game/index/offline assets are unchanged. No new runtime dependency was added.

## Public release limits

This is a tested opt-in screen/service connection; the normal title/lobby still does not import or activate it. Public lobby/start and trusted roster/entitlement validation, jail-phase ordinary property management, full AI/worker orchestration, remaining minigame/timer/reward/result UX, disconnect/expiry/rejoin/forfeit, production hosting/identity/rules migration/rollback and polling/retention/quota/abuse/scaling gates remain open.

The existing free setup is unchanged. No paid plan, production credential, server/site, live service/rules deployment, native build or store release was created. Physical Android/iOS testing is not established by these browser/emulator cases. Phase 1 and issue #2 remain open.
