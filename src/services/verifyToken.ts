import { createRemoteJWKSet, jwtVerify } from 'jose';
import { createHash } from 'crypto';
import firebaseConfig from '../../firebase-applet-config.json';

/**
 * Server-side verification of Firebase ID tokens.
 *
 * Before this existed the server took `userId` straight from the request body
 * and believed it. An unauthenticated socket could post two hundred invented
 * athletes and put any nation at the top of the world table in under two
 * seconds — the standings, which are the entire product, had no integrity.
 *
 * Verification is done against Google's published signing keys rather than the
 * Admin SDK, deliberately: the Admin SDK needs a service-account credential to
 * be provisioned, stored and rotated, and this needs none. The public JWKS is
 * enough to prove a token was minted by Firebase for this project.
 */

const PROJECT_ID = (firebaseConfig as { projectId: string }).projectId;

const ISSUER = `https://securetoken.google.com/${PROJECT_ID}`;

/** `jose` caches and refreshes this key set on its own. */
const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

export interface VerifiedUser {
  uid: string;
  /** True for anonymous sign-in, which is the normal case here. */
  anonymous: boolean;
  /** The token's own expiry, in ms. Nothing may outlive this. */
  expiresAtMs: number;
}

/**
 * Resolve a token to a trusted uid, or null if it is missing, expired,
 * malformed, or minted for a different Firebase project.
 */
export async function verifyFirebaseToken(
  token: string | undefined | null
): Promise<VerifiedUser | null> {
  if (!token || typeof token !== 'string' || token.length > 4096) return null;

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: ISSUER,
      audience: PROJECT_ID,
      // Firebase ID tokens are RS256; pinning it stops an `alg: none` downgrade.
      algorithms: ['RS256'],
      // A few seconds of NTP drift between this host and Google should not
      // reject a token that is otherwise valid. Small enough that it does not
      // meaningfully extend a token's life.
      clockTolerance: 5,
    });

    // `sub` is the uid. Firebase also sets `auth_time`; a token with no subject
    // is not usable as an identity no matter how well it verifies.
    const uid = typeof payload.sub === 'string' ? payload.sub : null;
    if (!uid) return null;

    const provider = (payload.firebase as { sign_in_provider?: string } | undefined)
      ?.sign_in_provider;

    // `exp` is guaranteed present -- jwtVerify already rejected an expired or
    // absent one -- but treat a missing value as immediately expired rather
    // than as "never expires".
    const expiresAtMs = typeof payload.exp === 'number' ? payload.exp * 1000 : 0;

    return { uid, anonymous: provider === 'anonymous', expiresAtMs };
  } catch {
    // Any failure is a rejection. Never fall back to trusting the caller.
    return null;
  }
}

/**
 * Verification result cache.
 *
 * RS256 verification is ~1ms of CPU and REST callers present a token per
 * request, so a burst of submissions would otherwise become a crypto workload.
 *
 * Three properties this has to hold, each of which it previously did not:
 *
 * 1. A cache entry never outlives the token. The old TTL was a flat five
 *    minutes from verification, so a token verified thirty seconds before it
 *    expired stayed accepted for four and a half minutes after Google
 *    considered it dead.
 * 2. Raw tokens are not held in memory. The map was keyed on the JWT itself,
 *    so a heap dump or a crash log yielded thousands of live credentials. The
 *    key is a SHA-256 of the token now; it identifies without being usable.
 * 3. Eviction is incremental. `clear()` at the ceiling dropped all 5000 entries
 *    at once and produced a re-verification stampede exactly when the server
 *    was busiest.
 */
const cache = new Map<string, { user: VerifiedUser; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX = 5000;

function cacheKey(token: string): string {
  return createHash('sha256').update(token).digest('base64url');
}

function evictOldest(count: number): void {
  const now = Date.now();
  // Expired entries first -- they are free to drop and cost nothing to keep
  // looking for.
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key);
  }
  // Map preserves insertion order, so the front is the oldest.
  let remaining = count - (CACHE_MAX - cache.size);
  if (remaining <= 0) return;
  for (const key of cache.keys()) {
    cache.delete(key);
    if (--remaining <= 0) break;
  }
}

export async function verifyFirebaseTokenCached(
  token: string | undefined | null
): Promise<VerifiedUser | null> {
  if (!token) return null;

  const key = cacheKey(token);
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.user;
  if (hit) cache.delete(key);

  const user = await verifyFirebaseToken(token);
  if (!user) return null;

  // Whichever comes first: the cache window, or the token's own expiry.
  const expiresAt = Math.min(Date.now() + CACHE_TTL_MS, user.expiresAtMs);
  if (expiresAt > Date.now()) {
    if (cache.size >= CACHE_MAX) evictOldest(Math.floor(CACHE_MAX / 10));
    cache.set(key, { user, expiresAt });
  }

  return user;
}

/** Pull a bearer token out of an Authorization header. */
export function bearerFrom(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer (.+)$/i.exec(header.trim());
  return match ? match[1] : null;
}
