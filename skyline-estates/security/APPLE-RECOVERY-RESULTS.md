# Apple authentication and account recovery

29 October 2026. Owner reports iOS 1.0.29 device testing works; this confirms the fullscreen keyboard-warning acceptance check. PR45 is merged and Pages deployment 40795601922 succeeded.

Apple app com.kenstylez.skylineestates has Sign in with Apple enabled. Unpublished App Store Connect record: 6828220714. Approved web Services ID com.kenstylez.skylineestates.web is associated with that primary app; domain eko-estates.firebaseapp.com and return URL https://eko-estates.firebaseapp.com/__/auth/handler were saved. A dedicated Apple authentication key was registered with explicit owner approval; no key material belongs in source control, client assets, CI logs or this report. Firebase Apple provider credentials were saved and a fresh reload confirmed Apple, Email/Password, Google and Anonymous all Enabled. This is console configuration acceptance, not a successful live Apple login. Private-key material was never committed or emitted into the tool output.

Recovery test now completes an emailed emulator reset code, rejects the old password, recovers the same verified UID using an independent Firebase SDK client, and rejects reset-code reuse. Eleven account controller checks passed locally; isolated emulator CI passed at 97fb8aca548350de46a58059a52c7dbb6cecac68: https://github.com/p2rmy5ks88-design/a2-guide/actions/runs/40796976009 — 272 integration checks. Emulator results do not establish real email delivery or live Apple acceptance.

Accounts and purchases remain disabled in the shipped game. Native SDK/configuration, Apple revocation/deletion service, cloud-save migration and real cross-device acceptance remain separate rollout gates.

References: https://firebase.google.com/docs/auth/web/apple and https://firebase.google.com/docs/auth/web/manage-users

Remaining Apple rollout requirements: native authentication SDK and platform files/entitlements, web authorized-domain review, private email relay sender configuration and live Apple sign-in/reauthentication/revocation tests. Account launch also requires secure deletion and cloud-save migration. No additional paid services, purchase agreements or store submissions were made.
