# Unified Collection dashboard

Collection now shares Portfolio’s navy/gold shell and full-width four-category navigation: Characters, Tokens, Frames and Buildings. Each category uses the whole content area instead of the former half-width Tokens tab bar.

- Characters: spacious three-column catalog and enlarged selected-character panel on desktop; stacked preview and two-column cards on phones. Original character selection, equip restrictions, gestures and username controls are retained.
- Tokens: existing grid, preview, finishes, evolution and coin/win gates sit beneath the shared full-width navigation, with independent desktop scrolling.
- Frames: four columns on desktop, three on tablets and two on phones, larger avatars, ownership/progress and original wear/locked behavior.
- Buildings: three large illustrated cards per desktop row, two on tablets and one on phones. Existing six-stage guide and all descriptions remain.

No game engine, coin costs/rewards, unlock requirements, saves, original artwork or Portfolio logic changes. Generated offline manifest updated for the UI script. The audited game-source hash remains `188a50e042f252e7aff4f80300c3ae5e47da965bf4c5add50e91a26f1b7faa7e`.

Validation: three new browser regressions exercise full-width alignment across all four categories, character equipment/locked-frame restrictions, and 1024/768/390px layouts with visible accessible category buttons and no page overflow. The existing fourteen UI/reward/simulation checks remain. Local full run passed seventeen checks with zero browser errors, including 48 seeded rarity games. A final focused UI run repeats sixteen UI/reward checks after icon/heading cleanup without rerunning unchanged simulations. Full existing CI evidence will be recorded after it completes. Screenshots are included in the browser workflow artifact.
