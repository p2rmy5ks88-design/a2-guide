# Phone Portfolio and profile Settings polish

Preserves the large-screen Portfolio dashboard and game/economy rules. Phone layouts use progressive navigation rather than squeezing every desktop panel onto one screen.

- Phone overview: three real totals (cash, net worth, properties), compact city/round context and eight district progress rows.
- Tap district → its owned/missing properties → tap property → readable illustration and financial details. Back controls return to properties/districts; navigation starts at the top of the new view.
- Property growth/perks/upgrade controls are grouped inside an expandable Growth & upgrades section. Its open state survives a confirmed purchase; previewing/navigating/cancelling never changes match state.
- A native Portfolio view selector replaces cramped five-way tabs on phones. Assets, Income and History use readable rows/cards; rail/utility assets remain informative rows rather than opening an unrelated street detail.
- Settings is removed from the phone sidebar and available through the profile button’s menu. Characters/profile remains there too. Desktop retains its sidebar gear and dashboard layout. Menu supports Arrow keys, Home/End, Escape with focus restoration, Tab/outside dismissal and 44px+ actions.
- Phone profile/wallet header uses two rows to avoid crushing the name; short landscape screens use a compact single row. Existing Collection/token illustrations remain.

Responsive mode uses widths up to 600 CSS pixels, or widths up to 1000 with height up to 500; no unverified device-specific screen specification is assumed. Desktop/tablet layouts above these conditions remain their existing design. Resize navigation is settled before layout screenshots are captured.

Local focused GPU-disabled Chrome suite: 22 UI/reward checks, zero browser errors. New regressions cover profile menu access/keyboard/dismissal, 360×800 / 360×420 (keyboard-like short portrait) / 390×844 / 430×932 / 480×960 / 844×390 navigation, actual mobile views, upgrade cancellation and exact 4,000-coin Mythic purchase, expanded growth after purchase, identical active match state, desktop restoration of six metrics and Settings gear. Existing stage image/preview/reward/legacy checks remain. These are emulated browser viewports, not a physical iPhone test.

No engine source, pinned rules hash, financial rules, unlock requirements, saved games, artwork, service permissions or paid services change. Offline manifest regenerated for the UI script (138 local resources). Full existing CI results will be appended after completion.

A final narrow/short-portrait check confirmed that the compact landscape header could shrink the profile target below 44px. The single-row header is now limited to widths above 600px; narrow phone headers retain two rows even with a short viewport. The extra regression checks the profile target remains reachable.
