import { createRemoteJWKSet, jwtVerify } from 'jose';
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
    });

    // `sub` is the uid. Firebase also sets `auth_time`; a token with no subject
    // is not usable as an identity no matter how well it verifies.
    const uid = typeof payload.sub === 'string' ? payload.sub : null;
    if (!uid) return null;

    const provider = (payload.firebase as { sign_in_provider?: string } | undefined)
      ?.sign_in_provider;

    return { uid, anonymous: provider === 'anonymous' };
  } catch {
    // Any failure is a rejection. Never fall back to trusting the caller.
    return null;
  }
}

/**
 * Verification result cache.
 *
 * A socket authenticates once, but REST callers present a token per request and
 * RS256 verification is ~1ms of CPU. Caching by token for a short window keeps a
 * burst of submissions from turning into a crypto workload, without extending
 * the life of a token beyond its own expiry.
 */
const cache = new Map<string, { user: VerifiedUser; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX = 5000;

export async function verifyFirebaseTokenCached(
  token: string | undefined | null
): Promise<VerifiedUser | null> {
  if (!token) return null;

  const hit = cache.get(token);
  if (hit && hit.expiresAt > Date.now()) return hit.user;

  const user = await verifyFirebaseToken(token);
  if (!user) return null;

  // Bounded, so a flood of distinct junk tokens cannot grow this without limit.
  if (cache.size >= CACHE_MAX) cache.clear();
  cache.set(token, { user, expiresAt: Date.now() + CACHE_TTL_MS });

  return user;
}

/** Pull a bearer token out of an Authorization header. */
export function bearerFrom(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer (.+)$/i.exec(header.trim());
  return match ? match[1] : null;
}
