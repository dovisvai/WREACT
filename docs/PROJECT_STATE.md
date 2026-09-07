# WREACT — project state

Living record of where this project actually stands. Updated after each
completed task, so any session (or person) can pick up without re-deriving
everything.

**Last updated:** 2026-09-07 · matchday 6 · `22d4abf`

---

## 1. What this is

A competitive reaction-time game. Players post times, times aggregate into a
national average, and countries are ranked in a weekly table (a "matchday",
Monday–Sunday UTC). One athlete contributes one personal best; a country needs
5 athletes before it qualifies for the standings.

Shipping Android-first to Google Play. iOS is deferred.

**Stack:** React 19 + TypeScript + Vite 6 + Tailwind v4 · Express + `ws` ·
Firebase (anonymous auth + Firestore) · Capacitor 8 · RevenueCat · OneSignal.

---

## 2. Identity and endpoints

| | |
|---|---|
| Package / appId | `com.wreact.app` |
| Version | `versionCode 1`, `versionName "1.0"` |
| SDK | min 24, compile/target 36 |
| Backend | `https://wreact-production.up.railway.app` (Railway, Docker, **1 replica**) |
| Firebase project | `gen-lang-client-0063491611` |
| Firestore database | `ai-studio-worldreaction-f365f8c1-3ce8-43b9-a4dc-551cd66a49dc` (**named, not `(default)`**) |
| Repo | `github.com/dovisvai/WREACT` (public) |

### Signing

Two different keys. Confusing them is the most common cause of silent failure.

| key | SHA-256 | used for |
|---|---|---|
| **Upload** (`~/wreact-upload.jks`, alias `upload`) | `77:43:A9:C4:B2:B5:C3:07:3B:15:C7:E3:EF:E4:45:08:7B:EF:86:5D:E9:69:1D:A1:88:04:DB:DB:32:C9:A9:CA` | signing bundles you upload |
| **App signing** (Google holds it) | `DD:1A:89:92:B2:8E:D7:6E:3D:04:27:A1:5F:A1:EA:C5:75:36:E0:75:79:23:98:5E:1A:5D:02:A8:0F:C5:4A:CA` | what real Play installs carry |

Upload key SHA-1: `30:20:AF:D7:D3:DE:19:73:05:CA:70:FF:B7:89:BC:15:F0:F9:7B:F9`

`assetlinks.json` needs the **app signing** one. Firebase should have both.

### Product IDs the code expects

Literal strings in `src/services/revenuecat.ts` — a mismatch means the product
silently never appears.

- Entitlement: `pro_access`
- `wreact_pro_monthly_399` — $3.99/mo, 3-day trial
- `wreact_pro_annual_2999` — $29.99/yr
- `wreact_founder_lifetime_4999` — $49.99 one-time

### Build-time env (Vite inlines these — must be right *before* building)

| var | state |
|---|---|
| `VITE_API_ORIGIN` | set |
| `VITE_ONESIGNAL_APP_ID` | set |
| `VITE_REVENUECAT_ANDROID_KEY` | **unset** — paywall refuses by design |
| `VITE_REVENUECAT_IOS_KEY` | unset (iOS deferred) |
| `VITE_SHARE_ORIGIN` | unset — falls back to `https://wreact.app` |

---

## 3. Done

### Launch progress

- [x] **Signing key created and verified.** `jar verified`, `CN=dovidas.vaivada`, valid to 2054.
- [x] **Firebase Android app registered.** `google-services.json` committed; `processReleaseGoogleServices` confirmed generating `google_app_id` into the bundle.
- [x] **Anonymous auth confirmed working** — evidenced by scores in Firestore under real uids, not by checking a toggle.
- [x] **Play Console app created**, Play App Signing accepted.
- [x] **Internal testing release published** — `1.0 — internal test 1`, versionCode 1.
- [x] **Firestore rules deployed and emulator-tested.**

### Code — fixed and verified this cycle

Every item below was verified by execution, not by reading:

**Server / security**
- Socket `'error'` handler — one oversized frame from an unauthenticated peer killed the process. Reproduced, then confirmed the patched server survives.
- Duel auth. `JOIN_DUEL`/`DUEL_TAP` had no identity check, and `DUEL_TAP` took the acting player from the payload while `JOIN_DUEL` handed out both ids — either player could forge the other's result. Identity now comes from the socket.
- Duel room lifecycle: released on disconnect, hard lifetime cap, timers cleared. Rooms previously leaked and stranded the next real player against a ghost.
- Country validated against the 198 shipped ISO codes. `"RUS"` and `"RU "` previously walked past a sanctions list containing `"RU"`.
- REST rate limit moved after auth — it was a single shared bucket on the proxy IP, so one anonymous caller could 429 everybody.
- `/api/leaderboard` cached; was copying and sorting the whole 40k pool per unauthenticated request on the event loop.
- Matchday rollover no longer re-aliases `scores`/`localScores` (double-counted every submission).
- WebSocket heartbeat; mode validated; duel fallback score bounded.

**Firestore rules** (emulator-verified before → after)
- Athlete `create` could never pass (`resource` is null on create, so `resource.data.keys()` errored). No athlete doc had *ever* been written.
- That made the nation lock inert — `!exists(...)` was always true, so any client could post each score under a different flag.
- `createdAt` was client-set and chose the matchday. Now pinned to `request.time` server-side, and both read paths select by it.

**Play policy**
- Removed a simulated Google sign-in: a 1.2s timer fabricating a session, granting "Verified" for nothing, using a stock photo of a real person as the avatar, behind Google branding. Cancelling signed you in anyway.
- Paywall granted Pro free and reported success whenever the RevenueCat key was a placeholder — which is true on any unconfigured build.
- Account deletion deleted nothing (and cancelling still deleted). Now removes scores, profile and auth account.
- Legal copy was written for Apple; declared collecting GPS location the app has no code for.

**Game logic**
- `PRECISION_TARGET` had no hit detection — tapping any blank pixel scored. The mode was Classic with a decorative circle.
- Timing bias: the clock started before the stimulus painted. Measured **+31ms → within a frame of zero**.
- Streak broke every Monday: rotation was weekday-pinned *and* a single-reaction 2000ms ceiling was applied to a four-tap mode.
- Head-to-head result panel could never render (both state updates batched into one commit).
- Double-tapping Start was always an instant false start.
- Sub-80ms results destroyed the stored personal best.
- Daily event date showed a day early for everyone west of UTC.

**Client robustness**
- WebSocket reconnect with backoff (there was none — first drop stranded the app for the session).
- CORS preflight omitted `Authorization`, so the REST fallback was blocked.
- Error boundary added; `@types/react` was never installed, so the whole component layer type-checked as `any`.
- Boot restore merges per field instead of racing (posting one score during boot destroyed the cloud profile in both places).

**Android hardening**
- `allowBackup=false` + extraction rules; TLS-only network config trusting system CAs only.
- R8 + `shrinkResources` with keep rules for Capacitor/Cordova/RevenueCat reflection. **Verified on a real release install**: no `ClassNotFoundException`. 12.46 MB → 5.19 MB.
- Logging stripped from Java *and* the JS bundle; no source maps in release.
- ~16 launcher-badge permissions (incl. `WRITE_SETTINGS`) removed from the merged manifest.
- Server bundle no longer packaged into the APK — it was shipping `server.cjs` + sourcemap, i.e. the full server source.

---

## 4. Outstanding

Ordered by dependency. Full detail in the launch runbook artifact.

### Open security item — Firebase Android API key

The Android API key from `google-services.json` was committed in `3c1eab2`
to a public repo and flagged by GitHub secret scanning. The file has been
removed from version control (`22d4abf`) and gitignored, **but the key
remains in git history and has already been scanned.**

Removing it does not unpublish it. The fix that matters is in Google Cloud
Console → APIs & Services → Credentials, on that Android key:

- **Application restrictions** → Android apps → add package `com.wreact.app`
  with **both** SHA-1 fingerprints (upload and app signing).
- **API restrictions** → limit to only the APIs the app actually calls.
- Or regenerate the key in Firebase and download a fresh `google-services.json`.

Context for judging severity: the key grants **no** Firestore data access —
rules govern that, and they are deployed and emulator-tested. The exposure is
that an unrestricted Google API key can be used to call other APIs enabled on
the project, which is a billing risk rather than a data one.

`android/app/google-services.json` is now required on disk but absent from the
repo, so a new machine or CI runner must place it manually or inject it from a
secret.

### Blocking a production release

1. **Create the three products** in Play Console → Monetise. Unblocked by the internal upload.
2. **RevenueCat**: project, connect Play (service-account JSON), entitlement `pro_access`, offering marked Current, copy `goog_` key → `.env` → **rebuild**.
3. **OneSignal**: upload the Firebase service-account JSON for FCM, then build the five campaigns defined in `src/services/push.ts`.
4. **Store assets**: 512×512 icon, 1024×500 feature graphic, phone screenshots.
5. **Publicly hosted privacy policy URL** + a separate web-accessible account-deletion request URL.
6. **Data safety form**, content rating (IARC), target audience, ads declaration.
7. **Closed test** — new developer accounts generally must run one before production unlocks. Confirm the current requirement in Console.

### Known gaps, deliberately deferred

- **Play Integrity is not wired up.** Firebase anonymous accounts are free and unlimited, so five of them can put a small country top of the table. Every other control is intact and it still works. This is the real remaining security hole; it needs the Play Console app (now exists) plus a Google Cloud project and server-side verdict verification. Do it after launch, properly — client-side only would be theatre.
- **App Links will not verify** unless `wreact.app` is owned and serves `assetlinks.json` with the app signing SHA-256. Until then shared `https://` links open in a browser. The `wreact://` scheme works.
- **iOS** entirely deferred.
- Lower-severity audit findings not yet addressed: Trap's decoy gap is a learnable hardcoded 1400ms; Sequence gives no feedback on repeated steps; the contribution panel reasons from the cross-mode best; the share card is labelled with the wrapper mode; FLIP animation measures stale positions after filtering; some `localStorage` writes unguarded; token cache can outlive expiry by 5 min.

---

## 5. Constraints and gotchas

Things that cost time to discover. Read before debugging something that looks broken.

- **An empty leaderboard on a Monday is correct.** Matchdays run Monday–Sunday UTC and the pool resets. Production showed 0 scores on 2026-09-07 because matchday 6 had just started; the previous week's 51 were matchday 5. `lastMatchdayResults` is empty when no country reached 5 athletes.
- **The world table stays empty until some country fields 5 athletes.** By design, not a bug. It makes early days look quiet.
- **Railway runs one replica** and the live standings, ticker and duels are in that process's memory. A restart drops sockets and rebuilds from Firestore. More than one replica splits duels and the ticker.
- **Gradle must be 9.1.0+.** Android Studio's bundled JDK is Java 25, whose class files Gradle 8.14.3's Groovy cannot read — the build fails with `Unsupported class file major version 69` on an unmodified tree.
- **`JAVA_HOME` must point at the Android Studio JBR:** `C:\Program Files\Android\Android Studio\jbr`.
- **`keytool` is not on PATH**; call it by full path from that JBR. The shell here is PowerShell — `\` is not a line continuation, and the wrapper is `.\gradlew`.
- **`git push` hangs.** Git Credential Manager opens a GUI prompt that cannot render. Use:
  `git -c credential.helper= -c credential.helper='!gh auth git-credential' push origin main`
- **Firestore rules deploy to a named database.** A plain deploy targets `(default)` and reports success while leaving the real database untouched. `firebase.json` pins the right one.
- **`.env` is read at build time, not runtime.** Changing a key means rebuilding and re-uploading.
- **The paywall refusing purchases is correct** until `VITE_REVENUECAT_ANDROID_KEY` is set. It used to grant Pro free and report success.
- **`versionCode` must increase on every upload**; Play rejects a reused one permanently.
- Device testing harness: `adb` over wireless debugging + Chrome DevTools into the WebView. Release builds disable that socket, which is intended — use logcat instead.

---

## 6. Verification log

What was actually exercised, so nothing gets re-claimed on the strength of a code read.

| claim | how it was verified |
|---|---|
| Server survives a hostile frame | Reproduced the crash, then the fix, against the real build |
| Duels reject unauthenticated callers | Live socket test → `DUEL_REJECTED reason=unauthenticated` |
| Nation lock enforced | Firestore emulator, all six cases before/after |
| Sanctions bypass closed | Ran the validator over `RU`/`RUS`/`RU `/`PRK`/`BLR`/`Cu` |
| R8 keeps reflection working | Installed the release APK; no `ClassNotFoundException`, plugins alive |
| Timing bias removed | 5 rounds, same synthetic 185ms input: +31ms → −10ms |
| Target hit detection | Tapped empty space → no score; hit target → scored |
| Sequence ceiling | 3145ms run recorded instead of rejected |
| Scroll affordance | Pixel luma at both edges, both scroll positions |
| Deep-link validation | Ran the parser over hostile tokens — caught that `RU` still passed |
| Bundle is genuinely signed | `jarsigner -verify` → `jar verified` |
| FCM config in the bundle | `google_app_id` present in generated resources |

**Not verified:** the release build's UI on a woken screen (display would not wake over adb); push delivery (no FCM credential yet); a real purchase (no products yet).
