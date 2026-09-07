/**
 * localStorage that cannot take the app down.
 *
 * Every accessor here can throw, and not only in exotic setups: a browser set
 * to block site data throws on access rather than returning null, private
 * windows throw on write, and the origin's quota is shared with Firebase,
 * OneSignal and RevenueCat — so filling it is not hypothetical.
 *
 * The write path mattered most. One call sat inside a React state updater, so a
 * QuotaExceededError would have propagated out through the state update on
 * every single score save, taking the render with it. Storage is a convenience
 * here — the durable record is Firestore — so a failed write should cost the
 * player nothing.
 */

/** Write, returning whether it actually persisted. Never throws. */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    // Quota, private mode, or blocked site data. The caller's state is already
    // correct in memory; only persistence across launches is lost.
    return false;
  }
}

/** Read, or null when absent or unreadable. Never throws. */
export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Remove, ignoring failure. Never throws. */
export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* nothing to do — the value is unreachable either way */
  }
}

/**
 * Read and parse JSON, returning null when absent, unreadable or malformed.
 *
 * A malformed value is treated the same as a missing one: a half-written or
 * hand-edited profile should reset the player, not blank the app.
 */
export function safeGetJson<T>(key: string): T | null {
  const raw = safeGetItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
