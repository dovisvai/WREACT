## Inspiration

Everyone has taken a reaction-time test. You tap when the screen goes green, you get a number, you close the tab. It is a solved genre and a lonely one — the number means nothing to anyone but you.

I wanted to know what happens when that number stops being yours. In WREACT your personal best is your **country's** entry in a world table. A 12ms improvement stops being vanity and becomes your nation's average moving. And because a country needs five athletes before it appears on the board at all, you cannot carry it alone — so the fastest route up the table is not practising, it is bringing people in.

## What it does

Tap when it turns green. That is the whole game, and it takes two seconds.

Your personal best contributes to your country's average, and **192 nations** are ranked in a table that resets every Monday at 00:00 UTC. One athlete contributes one time, so a country cannot be carried by a single person grinding — which means small nations genuinely win, because five committed people beat five thousand casual ones when the metric is a mean.

- **Six disciplines** — Classic, Trap, Sequence, Target, Stroop, plus a rotating daily event
- **Live 1v1 duels** — same signal, same moment, fastest thumb wins
- **Weekly matchdays** with medals at the whistle, then everyone starts from nothing
- **Share cards** that turn a good time into an invite, because recruiting is the mechanic

Only Classic counts toward a national average. The app says so on screen rather than letting you assume it.

## How we built it

React 19 + TypeScript + Vite, wrapped in Capacitor for Android. An Express + `ws` server owns the live state — standings, ticker, duels — with Firestore as the durable record it rehydrates from. Firebase anonymous auth means you compete without signing up for anything.

Two decisions shaped everything else.

**The server is the authority.** The client is a display terminal. It measures its own reaction time, because timing server-side would make the game a contest of ping — but the server validates every submission, derives identity from a verified Firebase ID token rather than the payload, and computes the standings itself.

**No Firebase Admin SDK.** Tokens are verified against Google's published JWKS with `jose`. No service-account credential to provision, store or rotate; the public key set is enough to prove a token was minted for this project.

## Challenges we ran into

The app looked finished long before anything about it was true. Almost every real problem was invisible from the screen, and every one below was found by measuring rather than reading.

**The stopwatch was wrong, twice.** It measured `click`, which fires on *release*, adding the whole press-and-lift to every score. And the clock started next to the `setState` call rather than when green pixels appeared — a full frame early. Measured on a real handset, a synthetic 185ms input recorded as 216ms. Both fixed; bias is now within a frame of zero.

**The leaderboard had no integrity.** The API took `userId` from the request body and believed it. Two hundred forged submissions put Vatican City at world number one in under two seconds.

**The rule protecting national integrity could never run.** On a Firestore `create`, `resource` is null — so `resource.data.keys()` errored and the whole rule denied. No athlete document had *ever* been written, which silently made the "your nation is fixed" guarantee inert: with no profile to compare against, any client could post each score under a different flag.

**Sanctions were one string from decorative.** Country was `slice(0,3).toUpperCase()` against an exact-match list, so `"RUS"` and `"RU "` both walked past a list containing `"RU"`.

**One frame could kill the server.** `ws` reports client protocol faults as an `'error'` event on the socket; nothing listened, so Node rethrew and the single instance exited — taking every connected player with it. Reproducible by an unauthenticated peer in one line.

**A whole game mode did not exist.** Precision Target had no hit detection: the full-bleed wrapper called the same handler as the target, so tapping any blank pixel scored. It was Classic with a decorative circle.

And the two that would have been worst in public: a "Sign in with Google" button that was a 1.2s timer fabricating a session, and a paywall that granted Pro for free while reporting a successful purchase.

## Accomplishments that we're proud of

**It is finished and shipped, not a prototype.** A signed, R8-obfuscated release bundle is live on Google Play's internal track, talking to a production server, on a real device.

- **Every security claim was tested by execution.** The server crash was reproduced, then the fix verified against the real build. The Firestore rules were run through the emulator, before and after. The sanctions bypass was exercised across `RU`, `RUS`, `RU `, `PRK`, `BLR`. R8 was validated by installing an actual release APK and confirming no reflection broke.
- **The timing is honest.** For a product whose premise is millisecond accuracy, this mattered more than any feature: measured bias went from +31ms to within one frame.
- **The app never invents data.** No fabricated ticker, no padded online count, no "4,280 entrants" on an empty leaderboard. When a country has not qualified, it says so and explains what qualifying takes.
- **12.46 MB → 5.19 MB** release build, with logging stripped from both the Java shell and the JavaScript bundle, and the server bundle removed from the APK it had been shipping inside.

## What we learned

**A screenshot is not evidence.** Every serious defect here rendered perfectly. The paywall looked right while granting Pro for nothing. The sign-in looked right while authenticating no one. The leaderboard looked right while accepting forged scores. What separated working from broken was always a measurement — a reproduced crash, an emulator run, a pixel comparison, a timing delta.

**Client-side hardening can be theatre.** This is a WebView app: all the game logic sits in readable JavaScript inside the APK. Root and Frida detection would guard a shell containing nothing worth protecting. The defence that actually works is server authority, and knowing the difference saved building the wrong thing well.

**Honesty is a design constraint with teeth.** Deciding the app would never show a number it could not justify killed several comfortable shortcuts — and produced better mechanics. The empty leaderboard became a recruitment prompt instead of a padded fake.

## What's next for WREACT

**Play Integrity.** The one gap I know about: Firebase anonymous accounts are free and unlimited, so a determined person could mint five and put a small country top of the table. Every other control holds; this is the one that needs device attestation, and it is next.

**Firebase App Check**, paired with it, to stop scripted account creation against the project.

**iOS**, with cross-device sync — the Capacitor layer is already in place.

**A populated table.** The standings are empty by design until nations field five athletes. Getting real players onto real phones is the whole game now, and everything in the product — the share cards, the recruit prompts, the five-athlete threshold — was built to make that the thing players want to do.
