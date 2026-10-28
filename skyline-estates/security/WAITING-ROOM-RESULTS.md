# Trusted waiting-room controls — 28 October 2026

Connects the existing opt-in trusted start/seat endpoints to an acknowledged waiting-room controller and DOM controls. The public game still uses its existing lobby; no live service, paid plan, Firebase rule change, native release, board/art/economy or custom-rule change is included.

Implemented: authenticated member/host/seat view validation; monotonic revision/focus retention; own token choice retaining server finish/character; host-only two-player Start; visible timer/minigame gates; durable lost-reply/reload reconciliation; duplicate-choice rejection; shared-client handoff to the existing acknowledged board; cancellation of detached screens. Game journals and foreign-room journals cannot be cleared as lobby operations. UI catalogue/role checks do not replace server-side entitlement/host validation.

Local verification: 17 controller cases using actual start/operation services; 13 real Chrome two-context browser cases using the actual page and service implementations through a file-mode test bridge, zero page exceptions. Existing 20 start-service and 18 game-controller cases passed. Cosmetic animation is disabled only in the browser harness. It compares reward/ownership state rather than the expected changing startup timestamp. Real HTTP/CORS and real Auth/Database checks run separately in CI; seven new admitted-room integration cases cover lost selection/start replies, replacement clients, guest authority, game-controller handoff and membership revocation.

The initial browser assertion exposed a changing lastOpen timestamp, not a reward mutation; the snapshot now specifically compares coins/XP/ownership/wins. A later click needed the standard test animation suppression used by existing board tests. Both harness corrections are recorded; no product gameplay change was made for them.

Remaining: public create/join/invite handling and journaled admission, final product handoff initial-read/partial-mount recovery, source-styled opening announcement, production entitlement resolver/hosting/rules migration, AI workers, unsupported online timers/minigames, disconnect/forfeit policy and trusted rewards/receipts. The onStarted callback owns game-screen retry/cleanup and must not leave partially mounted screens on a failed attempt. This milestone does not claim a completed production multiplayer rollout.

CI run links and final measured counts will be added after completion.
