/**
 * Countries the app does not accept entries from.
 *
 * Two separate reasons are collapsed into one list here, because the effect in
 * the product is identical, but they are worth keeping straight:
 *
 *   - Comprehensive US sanctions programmes (OFAC). Cuba, Iran, North Korea and
 *     Syria are subject to broad embargoes that cover software distribution and
 *     payment processing.
 *   - Commercial withdrawal. Apple and Google both suspended app sales and
 *     payments in Russia and Belarus, so a paid app cannot operate there
 *     regardless of what this code says.
 *
 * This list is a starting point, not legal advice. Sanctions programmes change,
 * and the authoritative source is the current OFAC sanctions list together with
 * the App Store and Play Console availability rules. Review it before launch
 * and again if the app ever takes payments in a new market.
 */

export interface RestrictedCountry {
  code: string;
  reason: 'sanctions' | 'store-unavailable';
}

export const RESTRICTED_COUNTRIES: RestrictedCountry[] = [
  // Comprehensive OFAC sanctions programmes.
  { code: 'CU', reason: 'sanctions' }, // Cuba
  { code: 'IR', reason: 'sanctions' }, // Iran
  { code: 'KP', reason: 'sanctions' }, // North Korea
  { code: 'SY', reason: 'sanctions' }, // Syria

  // App stores and payment processors have withdrawn from these markets.
  { code: 'RU', reason: 'store-unavailable' }, // Russia
  { code: 'BY', reason: 'store-unavailable' }, // Belarus
];

const RESTRICTED_CODES = new Set(RESTRICTED_COUNTRIES.map((c) => c.code));

/** True when this country cannot be represented or scored for. */
export function isRestrictedCountry(code: string): boolean {
  return RESTRICTED_CODES.has((code || '').toUpperCase());
}

/**
 * Note on what this does and does not do.
 *
 * This prevents a restricted country from being *represented* — it cannot be
 * picked, it never enters the standings, and scores claiming it are rejected at
 * the server and in the database rules.
 *
 * It is not geographic access control. Someone physically in a restricted
 * country can still open the app and select another nation. Actual availability
 * is set per-territory in Play Console and App Store Connect, and that is the
 * control that carries legal weight; this list keeps the leaderboard consistent
 * with it.
 */
export const RESTRICTION_NOTE =
  'Store availability is configured per-territory in Play Console and App Store ' +
  'Connect. This list keeps the standings consistent with that configuration.';
