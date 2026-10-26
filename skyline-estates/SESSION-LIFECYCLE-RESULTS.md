# Online session isolation and host lifecycle

## Reproduced failures

A suspended remote animation left NET.applyRun active after leaving a room. Updates in the new room were then queued behind the old animation; the baseline regression fails because the new room remains at revision 1 instead of applying revision 2. Separately, last-ending/reclaim flags survived a new online session; its baseline regression fails true !== false. Retained subscriptions and asynchronous startup/last-human completion could also execute against replacement global session state.

## Scoped fix

Online sessions now have an incrementing epoch and capture their room code, reference and game generation. Stopping or starting a session invalidates the old token and resets pending/applying/forfeit/reclaim state. Snapshot subscriptions and their queue retain the token that owns them. Old queue cleanup cannot clear a replacement queue's flags or restart its turn processing.

Remote render continuations check their session after awaited dice and movement operations, before further highlights, roster, bank/cash/log updates or finishing. Superseded operations unwind through the existing Abort mechanism. The current session still coalesces queued revisions and applies the latest one.

Initial and elected-host control subscriptions, heartbeat subscriptions/intervals and delayed host ticks are session-bound. Asynchronous startup checks ownership before installing heartbeat listeners/timers. A late last-human push completion cannot finish a replacement room or clear that room's driving flag. New rooms reset the prior session's last-ending/reclaim flags. Host election order, presence grace, stale timeouts, AI stand-in behavior and custom game rules are unchanged.

## Verification

`tests/session-lifecycle.cjs` extracts production handlers, suspends dice/movement promises, retains closed callbacks and uses controlled clocks/timers. Fourteen scenarios cover old/new concurrent queues, delayed rendering, same-code rejoin, movement continuation, latest-revision coalescing, cancelled startup, stale room/heartbeat/control/interval callbacks, flag reset, late forfeit completion, two peer election views, returning old host and existing presence thresholds. SOURCE_REF selects a baseline Git revision; TEST_FILTER runs one named case. Three real-browser checks exercise session capture, stop invalidation and same-code epoch separation. The associated PR records final complete browser/native verification links.

These are deterministic lifecycle fixtures, not real multi-device Firebase transport or emulator rules tests. Rendering and clock/network effects are controlled; no real accounts, rooms, Firebase requests, production rules or configurations are changed. Existing browser economy/view/offline and native package builds run on the updated source.

## Limits and remaining work

Session guards protect the callbacks and continuations listed above. They do not establish server-side participant/role permissions, authoritative host leases, monotonic server revisions or trusted competitive outcomes. Local-clock peers can still disagree under asymmetric network conditions. Atomic join/start/leave, competing-writer/acknowledgement recovery, server fencing of stale writes and broader outbound turn/request tasks remain open. The global visual tween scheduler is unchanged; these checks stop superseded remote continuation rather than rewriting every animation callback. Full network partitions, background/native lifecycle, physical devices, unassisted human matches and signed receipt/store acceptance remain outstanding under issue #2.

The approved board, artwork, scenery, UI layout, prices and custom rules are preserved. The standalone page and scoped offline manifest are regenerated with the existing builder. No public store or release upload is part of validation.
