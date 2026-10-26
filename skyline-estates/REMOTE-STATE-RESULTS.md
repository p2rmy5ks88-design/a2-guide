# Remote update and reconnect validation

## Reproduced failures

A malformed JSON update with sequence 999 advanced `NET.seq` before parsing. The next valid sequence 2 was then treated as stale, freezing that client's updates. The baseline regression fails with `999 !== 1`. Initial reconnect also parsed JSON without validating its structure; values such as null or a malformed board could throw or replace the current game before rendering failed.

## Scoped client fix

`decodeRemoteGame` validates the room/edition, safe integer revision and matching serialized revision, active/finished status, player identities and declared members, approved tokens/colors, host/winner references, optional dice, and the existing game schema/economy invariants. It reuses the pure offline-save validator on a shallow flags-only view, retaining the original network state's rules and online/finished flags. Offline save validation is unchanged.

Live snapshots are validated before advancing `NET.seq` or queuing a replacement. Delayed callbacks after the session ends, stale revisions and duplicate revisions are ignored. Invalid updates trigger one warning per session; closing the session resets that warning. Reconnect validates before changing the game, generation or UI. A subsequent well-formed update can recover after a rejected malformed higher revision.

The approved board, artwork, scenery, layout, prices and custom rules are unchanged. Generated standalone HTML and the offline manifest are refreshed from the existing build script.

## Regression coverage

`tests/remote-state.cjs` extracts the actual production validator and handlers, using isolated rendering/network stubs. Its 35 checks cover the reproduced revision poisoning and invalid reconnect, malformed/foreign state, cash and bank/deck invariants, invalid identities/host/dice/token/color/winner, stale/duplicate/inactive callbacks, bounded warnings, valid reconnect/finished state and AI/optional-rule compatibility. Four additional real-browser checks validate genuine engine-generated Classic, Quick, timed and finished snapshots with their settings preserved. The complete browser/economy/offline suite and native build/package jobs run on the same updated source; final evidence is linked on the associated PR.

Run `npm run test:online --prefix skyline-estates/tests` for the isolated remote-state and room-creation regressions. SOURCE_REF can select a Git revision for baseline reproduction. No live accounts, rooms, database requests or rule deployments are used in these tests.

## Remaining security and reconnect work

These client guards reject structurally invalid or inconsistent data; they do not authenticate who wrote a plausible state, validate every legal game transition, or make client-supplied room membership authoritative. An authorized or malicious client can still supply structurally plausible invented outcomes when server rules permit it. Firebase participant/role/transition enforcement, trusted rankings and receipts remain open. Production rule state is unverified and unchanged.

This supersedes the unvalidated-remote-state finding in the prior source security review at the client boundary only. Remaining lifecycle work includes canceling old in-flight render/animation queues across room changes, competing writers/host handover, atomic join/start/leave, and lost-acknowledgement/reconnect races. Full multi-device transport, deployed rules, physical/native lifecycle and manual/store acceptance are not established by these fixtures. See ONLINE-SECURITY-RESULTS.md and issue #2 for the broader migration plan.
