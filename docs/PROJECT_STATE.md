# WREACT — project state

Living record of where this project actually stands. Updated after each
completed task, so any session (or person) can pick up without re-deriving
everything.

**Last updated:** 2026-09-09 · matchday 6 · versionCode 3 built and signed, awaiting upload

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

- Entitlement: `wreact_pro` — **must match the dashboard exactly**; a mismatch
  charges the player and never activates Pro. Product ids do **not** need to
  match the code: the live path maps whatever the store returns, and
  `PRODUCT_IDS` only builds the offline preview catalogue.
- `wreact_pro_monthly_399` — $3.99/mo, 3-day trial
- `wreact_pro_annual_2999` — $29.99/yr

A lifetime one-time purchase was dropped on 2026-09-07. Play models a
non-consumable entitlement awkwardly beside subscriptions and it was proving
fiddly to configure; two options cover the same intent. Nothing to create in
Console beyond these two subscriptions.

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
- [x] **Firebase Android app registered.** `google-services.json` present on disk and gitignored; `processReleaseGoogleServices` confirmed generating `google_app_id` into the bundle.
- [x] **Anonymous auth confirmed working** — evidenced by scores in Firestore under real uids, not by checking a toggle.
- [x] **Play Console app created**, Play App Signing accepted.
- [x] **Internal testing release published** — `1.0 — internal test 1`, versionCode 1.
  - **Caveat:** that build predates the client-side token refresh (`86b02d3`). The
    server now expires socket identity after an hour, and versionCode 1
    authenticates on connect only and ignores `REAUTH_REQUIRED` — so a session
    kept continuously open past an hour stops posting scores until the socket
    reconnects. Backgrounding and returning fixes it, and the heartbeat drops
    dead sockets, so it is rare in practice. If a tester reports scores silently
    stopping, this is why. Fixed in versionCode 2.
- [x] **Firestore rules deployed and emulator-tested.**
- [x] **versionCode 3 / 1.0.2 built and signed.** `jar verified`, 7.38 MB, and the
  shipped JS was unpacked and checked to actually contain the fixes rather than
  assumed to. **Not yet uploaded** — this is the next Play Console action.
  versionCode 2 was superseded before upload and must not be used: it predates
  the full-review round below.
- [x] **Firestore rules redeployed** (2026-09-09) with the tightened country check,
  emulator-verified before release.

### Full-game review round (2026-09-09)

Five parallel reviews — game modes, ranking integrity, monetization, player data,
sharing/push. Highest-severity findings, all fixed and most verified by execution:

- **A sanctioned or invented nation could hold world #1.** The Firestore read path
  was the one ingest that never ran `sanitizeCountry`, and the rules behind it only
  checked that a code was 2-3 characters. `"RUS"`, `"RU "`, `"XX"` and `"  "` each
  minted a real qualifying row. Now validated against the 198 shipped codes plus the
  restricted list, dropping what it cannot trust; the rules require `^[A-Z]{2}$`.
- **No player's personal best ever advanced.** `pb_` was written before the handler
  that reads it, so a new best was compared against itself. `bestScore` sat at 0
  forever, three badges were unreachable, and the contribution panel reported 0ms on
  exactly the runs that moved a national average.
- **Double-tapping Start scored a run nobody played.** Sequence and Stroop have no
  WAITING phase and Start fires on release; the whole button overlaps tiles 3-4.
  In Stroop that recorded ~90-150ms against a 750ms target.
- **Switching tabs mid-run voided the daily entry** and the streak with it.
- **Every share link was dead** — `wreact.app` is not registered. Links now point at
  the GitHub Pages site, which decodes the payload and hands the recipient onward.
- **The paywall sold four benefits and the code delivered none.** Full run history is
  now genuinely Pro-only; the copy sells only what exists.

### The auth lifecycle round (`c0f4d40`)

A focused review of the token-expiry change found six defects, every one of
which ended with a player losing something they had earned while the screen
said otherwise. All six fixed, three verified against a running server:

- **A socket could be permanently anonymous.** The client only re-armed its
  refresh on `AUTH_RESULT` with `ok:true`; there was no `else`, so a refused
  token was dropped, no timer was set and nothing retried. Re-sending would not
  have helped — the SDK serves its cached copy — so a refusal now forces one
  fresh mint and stops if that is refused too.
- **Rejected scores were a `console.warn`.** They are now replayed over REST,
  which proves identity per request and so succeeds exactly where the socket
  failed. FIFO and capped, since the server answers in order.
- **The flood guard punished the recovery it had asked for.** Attempts never
  decayed, so four rounds across a session added up to a disconnect. 15s decay.
- **An unauthenticated `DUEL_TAP` was a bare `return`.** The client marks itself
  as tapped before sending and only a countdown clears that, so the room sat
  until the reap timeout and ended abandoned **for the opponent too**.
- **The duel socket never handled `AUTH_RESULT`** — only one of the two sockets
  had the pre-expiry refresh.
- **Re-auth on resume**, because a backgrounded webview suspends the timer meant
  to do it; and the parse error logs its name only, since a JSON syntax error
  quotes the input and the frame that fails to parse usually carries a token.

Old-server compatibility is safe: versionCode 2 sends nothing new, it only
*handles* new messages, so it behaves exactly as before against a server that
never sends them.

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

**Token lifecycle** (server + client)
- Verification cache no longer outlives the token. It used a flat five-minute TTL from verification, so a token checked thirty seconds before expiry stayed accepted four and a half minutes after Google considered it dead. Capped at `min(cache window, token exp)`.
- Cache keys are a SHA-256 of the token rather than the JWT itself — the map previously held thousands of live credentials in plain memory, readable from a heap dump or crash log.
- Eviction is incremental; `clear()` at the ceiling dropped all 5000 entries at once and caused a re-verification stampede exactly when busiest.
- 5s clock tolerance, so NTP drift does not reject otherwise-valid tokens.
- **Socket identity now expires with its token.** A socket proved itself once and was trusted for the life of the connection — hours — while the credential behind it lives one hour, so a deleted or revoked account kept full privileges as long as it held the socket open. Applies to scores and both duel handlers.
- Clients re-authenticate five minutes ahead of expiry, and on a `REAUTH_REQUIRED` push, so a player's score is never rejected for a credential that aged out between rounds. Both sockets (live data and duel lobby) do this independently.

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

### Credentials — resolved and remaining

**Android API key — resolved.** Committed in `3c1eab2` to a public repo, flagged
by GitHub secret scanning, removed in `22d4abf` and gitignored. Removing it did
not unpublish it (it is in history and was scanned), so the key was restricted
in Cloud Console instead. **Verified**: an off-app request now returns
`403 PERMISSION_DENIED — Requests from this Android client application <empty>
are blocked`. The GitHub alert can be dismissed.

`android/app/google-services.json` is now required on disk but absent from the
repo, so a new machine or CI runner must place it manually or inject it from a
secret.

**Web API key — public and unrestricted, by design and unresolved.** It lives in
`firebase-applet-config.json`, committed since `b04b77b`, and is the key the app
actually authenticates with. Verified still working after the Android
restriction. This is not the same mistake: Firebase web keys are meant to ship
in client bundles, and the protection is Firestore rules rather than secrecy.
Referrer restriction is not practical here because the Capacitor WebView's
origin is `https://localhost`.

The proper control is **Firebase App Check**, which pairs with the deferred Play
Integrity work — same attestation, and it is what would stop someone minting
anonymous accounts against the project from a script. Both need the Play Console
app, which now exists. Do it after launch; the exposure is abuse and billing,
not data.

**Stray anonymous account.** One anonymous user exists in Firebase with no
scores, created accidentally on 2026-09-07 while probing whether the web key
still worked — `accounts:signUp` with an empty body succeeds rather than merely
validating the key. Harmless (no times, cannot affect standings). Remove via
Firebase Console → Authentication → Users if wanted; it is the newest entry with
no provider.

### Blocking a production release

1. **Create the three products** in Play Console → Monetise. Unblocked by the internal upload.
2. **RevenueCat**: project, connect Play (service-account JSON), entitlement `wreact_pro`, offering marked Current, copy `goog_` key → `.env` → **rebuild**.
3. **OneSignal**: upload the Firebase service-account JSON for FCM, then build the five campaigns defined in `src/services/push.ts`.
4. **Store assets**: 512×512 icon, 1024×500 feature graphic, phone screenshots.
5. **Publicly hosted privacy policy URL** + a separate web-accessible account-deletion request URL.
6. **Data safety form**, content rating (IARC), target audience, ads declaration.
7. **Closed test** — new developer accounts generally must run one before production unlocks. Confirm the current requirement in Console.

### Known gaps, deliberately deferred

- **Play Integrity is not wired up.** Firebase anonymous accounts are free and unlimited, so five of them can put a small country top of the table. Every other control is intact and it still works. This is the real remaining security hole; it needs the Play Console app (now exists) plus a Google Cloud project and server-side verdict verification. Do it after launch, properly — client-side only would be theatre.
- **App Links will not verify** unless `wreact.app` is owned and serves `assetlinks.json` with the app signing SHA-256. Until then shared `https://` links open in a browser. The `wreact://` scheme works.
- **iOS** entirely deferred.
- **All audit findings are now closed.** The last five (Trap's fixed decoy gap, the contribution panel reading the cross-mode best, the share card labelled with the wrapper mode, FLIP keyed on the unfiltered list, unguarded `localStorage` writes) were fixed in `e38b68c`. Sequence's lack of feedback on a repeated step is now fixed too: a tile that must be tapped again grows and lifts above its neighbours (`ReactionGame.tsx:508`), so a repeat reads as a bigger target rather than as nothing happening. **No open audit findings remain.**
- **Testers are now the critical path.** Play's closed-test requirement for new personal developer accounts gates production, and the leaderboard needs five athletes in one country before it shows anything. Those are two different recruitment problems: the first needs 12 bodies anywhere, the second needs 5 people in the same nation.

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
| Android key restricted | Live call → `403 PERMISSION_DENIED`, blocked |
| Web key still works | Live call accepted (created one stray anonymous user) |
| Auth gate after token changes | Bad token → `AUTH_RESULT ok=false`, then `REAUTH_REQUIRED` + rejection on both scores and duels |
| FCM config in the bundle | `google_app_id` present in generated resources |
| Country validator closed | Ran every bypass string: `RUS`/`RU `/`XX`/`  `/`ZZZ` rejected, `LT`/`US`/`GB`/`  lt  ` accepted |
| Tightened rules do not break real writes | Firestore emulator with REQUEST_TIME transforms: `LT`/`US`/`GB` allowed, `RUS`/`RU `/`  `/`ZZZ`/`KP` denied |
| Personal best advances | Replayed the submit ordering across storage-working and storage-dead runs: 320→240→198 now yields 198, was 0 |
| Savings badge cannot overstate | Exercised cross-currency, decoy-tier, Infinity and negative prices — all now produce no badge |
| Challenge landing page is safe | Driven in a real browser with hostile payloads; caught a `__proto__` lookup returning `Object.prototype` |
| v3 bundle contains the fixes | Unpacked the AAB and asserted each change present and each old claim absent |
| Unauthed duel tap is answered | Live socket → `REAUTH_REQUIRED` → `DUEL_TAP_REJECTED` (was silence) |
| Flood counter forgives paced play | 3 attempts, 16s gap, 3 more → socket stayed open |
| Flood counter still stops a burst | 8 frames back to back → `CLOSED 1008` |
| v2 bundle contains the fixes | Unpacked the AAB; found `DUEL_TAP_REJECTED`, `AUTH_RESULT`, `wreact_pro` in the shipped JS |

**Not verified:** the release build's UI on a woken screen (display would not wake over adb); push delivery (no FCM credential yet); a real purchase (no products yet).
