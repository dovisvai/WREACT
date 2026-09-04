import OneSignal, { LogLevel } from 'onesignal-cordova-plugin';
import { UserProfile, CountryStanding } from '../types';
import { MatchdayClock } from '../utils/matchday';
import { isNative } from './native';

/**
 * Push notifications via OneSignal.
 *
 * The value here is entirely in the matchday clock. A reaction-time app has no
 * honest reason to interrupt anyone; a national competition with a Sunday
 * deadline and a rival 0.4ms ahead has several. Every message this app is
 * designed to send answers "something is happening to your country, now."
 *
 * The client's job is to stay reachable and keep its tags accurate. The
 * messages themselves are OneSignal campaigns segmented on those tags, so copy
 * and timing can change without an app release.
 *
 * Note on the import: `onesignal-cordova-plugin` only touches `window.cordova`
 * inside its methods, never at module load, so importing it in the web build is
 * safe. Every call below is still gated on `isNative()` because the calls
 * themselves would throw.
 */

/* ---------------------------------------------------------------------------
 * App ID — a public identifier, safe to ship in a client bundle.
 * Overridable per environment via VITE_ONESIGNAL_APP_ID.
 * ------------------------------------------------------------------------- */
export const ONESIGNAL_APP_ID =
  import.meta.env.VITE_ONESIGNAL_APP_ID ?? '5cf52587-48eb-4c33-8131-2dcb5fcb79eb';

/**
 * Tags drive every campaign segment.
 *
 * Keeping them current is what lets a campaign say "athletes in Lithuania whose
 * nation is ranked 2–10 with under 6 hours left" rather than blasting everyone.
 */
export interface PushTags {
  country: string;
  /** National rank, or "unranked". */
  nation_rank: string;
  /** Athletes still needed for the nation to qualify; "0" once ranked. */
  athletes_needed: string;
  streak_days: string;
  best_ms: string;
  matchday: string;
  pro: 'true' | 'false';
}

/** True when push can actually be delivered on this platform. */
export function isPushSupported(): boolean {
  return isNative();
}

let initialized = false;

/**
 * Initialise the SDK. Deliberately does not prompt — permission is requested
 * later, at a moment where the reason for it is on screen.
 */
export function initPush(externalUserId?: string): void {
  if (initialized || !isNative()) return;

  try {
    if (import.meta.env.DEV) {
      OneSignal.Debug.setLogLevel(LogLevel.Verbose);
    }

    OneSignal.initialize(ONESIGNAL_APP_ID);

    // Tie the OneSignal subscription to the Firebase uid so a player keeps one
    // identity across devices, reinstalls, purchases and the standings alike.
    if (externalUserId) OneSignal.login(externalUserId);

    OneSignal.Notifications.addEventListener('click', (event) => {
      console.info('[Push] Notification opened', event.notification?.notificationId);
    });

    initialized = true;
  } catch (err) {
    console.warn('[Push] Initialisation failed:', err);
  }
}

/**
 * Ask for notification permission.
 *
 * Called from the match-alerts prompt rather than at launch: a request that
 * arrives with "we will tell you when your country is about to be overtaken"
 * converts far better than one that interrupts a cold start, and it is the
 * honest place to ask because that is exactly what the permission is for.
 *
 * `fallbackToSettings` sends a player who previously denied straight to the OS
 * settings page instead of silently failing.
 */
export async function requestPushPermission(): Promise<boolean> {
  if (!isNative()) return false;

  try {
    const granted = await OneSignal.Notifications.requestPermission(true);
    if (granted) OneSignal.User.pushSubscription.optIn();
    return granted;
  } catch (err) {
    console.warn('[Push] Permission request failed:', err);
    return false;
  }
}

/** Current OS-level permission state. */
export async function hasPushPermission(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    return await OneSignal.Notifications.getPermissionAsync();
  } catch {
    return false;
  }
}

/** Diagnostics for the verification panel: is this device actually reachable? */
export interface PushDiagnostics {
  supported: boolean;
  permission: boolean;
  optedIn: boolean;
  subscriptionId: string | null;
  appId: string;
}

export async function getPushDiagnostics(): Promise<PushDiagnostics> {
  const base: PushDiagnostics = {
    supported: isNative(),
    permission: false,
    optedIn: false,
    subscriptionId: null,
    appId: ONESIGNAL_APP_ID,
  };

  if (!isNative()) return base;

  try {
    const [permission, optedIn, subscriptionId] = await Promise.all([
      OneSignal.Notifications.getPermissionAsync(),
      OneSignal.User.pushSubscription.getOptedInAsync(),
      OneSignal.User.pushSubscription.getIdAsync(),
    ]);

    return { ...base, permission, optedIn, subscriptionId };
  } catch (err) {
    console.warn('[Push] Diagnostics unavailable:', err);
    return base;
  }
}

/** Push the current segmentation tags. Safe to call often; cheap and idempotent. */
export function syncPushTags(tags: Partial<PushTags>): void {
  if (!isNative() || !initialized) return;

  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(tags)) {
    if (value !== undefined && value !== null) clean[key] = String(value);
  }

  if (Object.keys(clean).length === 0) return;

  try {
    OneSignal.User.addTags(clean);
  } catch (err) {
    console.warn('[Push] Tag sync failed:', err);
  }
}

/** Build the tag set from current app state. */
export function buildPushTags(
  profile: UserProfile,
  standing: CountryStanding | null,
  clock: MatchdayClock
): PushTags {
  return {
    country: (profile.country || 'US').toUpperCase(),
    nation_rank: standing?.qualified && standing.rank ? String(standing.rank) : 'unranked',
    athletes_needed: String(standing?.athletesNeeded ?? 0),
    streak_days: String(profile.streakDays ?? 0),
    best_ms: profile.bestScore ? String(profile.bestScore) : '0',
    matchday: String(clock.matchday.number),
    pro: profile.proPassActive ? 'true' : 'false',
  };
}

/* ---------------------------------------------------------------------------
 * Campaign reference
 *
 * These are the campaigns the tags above are designed to serve. They are built
 * in the OneSignal dashboard, not in this file — listed here so the segments
 * and the copy stay in one place with the code that feeds them.
 * ------------------------------------------------------------------------- */
export const CAMPAIGNS = [
  {
    id: 'final-hours',
    name: 'Final hours',
    segment: 'nation_rank is set AND matchday equals current',
    schedule: 'Sunday 18:00 in each subscriber’s timezone',
    copy: 'Six hours to the whistle. {{country}} is {{gap}}ms off the place above.',
    why: 'The single highest-intent moment of the week — the table is still movable.',
  },
  {
    id: 'overtaken',
    name: 'Overtaken',
    segment: 'Triggered when a nation loses a place',
    schedule: 'Event-driven',
    copy: '{{rival}} just passed {{country}}. One good run takes it back.',
    why: 'Loss aversion, and it is genuinely news about something the player affects.',
  },
  {
    id: 'qualify-push',
    name: 'Almost qualified',
    segment: 'athletes_needed between 1 and 2',
    schedule: 'Once per matchday',
    copy: '{{country}} is {{athletes_needed}} athletes from entering the standings.',
    why: 'Converts a stranded player into a recruiter at the exact moment it pays off.',
  },
  {
    id: 'result',
    name: 'Final whistle',
    segment: 'nation_rank is set',
    schedule: 'Monday 00:05 UTC, after rollover',
    copy: 'Matchday {{matchday}} final: {{country}} finished {{rank}}.',
    why: 'Closes the loop and opens the next week.',
  },
  {
    id: 'streak-save',
    name: 'Streak at risk',
    segment: 'streak_days greater than 2',
    schedule: 'Daily, 3 hours before local midnight',
    copy: 'Your {{streak_days}}-day streak ends tonight.',
    why: 'The only message here that is about the player rather than the nation.',
  },
] as const;
