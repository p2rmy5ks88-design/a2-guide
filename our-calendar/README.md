# Our Calendar

A shared calendar and to-do list for two, built to live on your iPhone Home Screen.

- Month calendar, upcoming agenda and a shared to-do list, synced live between both phones
- Push notification to your partner whenever one of you adds, changes or removes a plan or adds a to-do
- Reminder alerts before each appointment (10 min, 30 min, 1 hour, 1 day…)
- "Add to iPhone Calendar with alarm" on any plan, for a native Calendar alarm
- Only your two email addresses can sign in and see anything
- Works offline and opens like a real app

Preview the design without signing in: add `#demo` to the end of the app's address.

---

## One-time setup (about 15 minutes)

### 1. Create the Firebase project (free)

1. Go to <https://console.firebase.google.com> → **Add project** → name it `our-calendar` → you can turn off Google Analytics → **Create**.
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable → Save.**
3. **Authentication → Users → Add user** — add yourself (email + password), then your wife.
4. **Authentication → Settings → User actions** — untick **Enable create (sign-up)** so nobody else can make an account.
5. **Authentication → Settings → Authorized domains → Add domain** — add `YOUR-GITHUB-USERNAME.github.io`.
6. **Build → Firestore Database → Create database** → pick location `eur3 (europe-west)` → **Start in production mode**.
7. Open **Firestore → Rules**, paste the contents of [`firestore.rules`](firestore.rules), replace the two example emails with yours (lowercase), and **Publish**.
8. **Project settings (gear) → General → Your apps → Web (`</>`)** → register app `Our Calendar` (no hosting) → copy the `firebaseConfig` values.

### 2. Paste the config

Open [`config.js`](config.js) in this repo on GitHub (pencil icon), replace each `PASTE_HERE` with the matching value, and **Commit changes**. The page updates within a minute.

> These Firebase web values are not passwords. Your plans are protected by sign-in plus the Firestore rules, so only your two accounts can read or change them.

### 3. Put it on both iPhones

1. Open the app link in **Safari** (it must be Safari).
2. Sign in.
3. Tap **Share → Add to Home Screen → Add**.
4. Open it from the Home Screen icon from now on.

Kess ❤️ is coral and Bumblebee 😘 is green (set in `config.js`). You can rename yourselves anytime under **☰ → Settings**.

### 4. Turn on push notifications (each phone)

1. Install **ntfy** from the App Store (free).
2. In Our Calendar tap **☰ → Settings** and tap **Copy** next to your notification topic.
3. In ntfy tap **+**, paste the topic, keep the server as `ntfy.sh`, tap **Subscribe**, and allow notifications.
4. Back in Our Calendar, tap **Send me a test notification**.

Each of you has your own topic, so you're notified about what your partner adds and about reminders for your own plans, not about your own changes.

---

## How alerts work

| What | How it reaches you |
|---|---|
| Partner adds/changes/removes a plan or adds a to-do | Instant push via ntfy |
| Reminder before an appointment | Push via ntfy at the chosen time |
| App is open when partner adds something | Pop-up banner inside the app |
| Want a native iPhone alarm | Open the plan → **Add to iPhone Calendar with alarm** |

ntfy can queue a reminder at most 3 days ahead. Reminders further out are queued automatically the next time either of you opens the app in that 3-day window — so open the app every couple of days (you will anyway), or use **Add to iPhone Calendar** for important dates far ahead.

Keep your topic name private: anyone who knows it could read those notifications. If it leaks, delete the `meta/settings` document's `topic` field in Firestore and a new one is created.

## Files

| File | What it is |
|---|---|
| `index.html`, `styles.css`, `app.js` | The app |
| `config.js` | Your Firebase settings (step 2) |
| `firestore.rules` | Who may access the data (step 1.7) |
| `sw.js`, `manifest.webmanifest`, `icons/` | Home Screen app + offline support |
