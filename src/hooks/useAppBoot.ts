import { Dispatch, SetStateAction, useEffect } from 'react';
import { ChallengeInvite, UserProfile } from '../types';
import { TabType } from '../components/BottomNavBar';
import { clearChallengeFromUrl, parseChallengeFromUrl } from '../services/share';
import { initNativeShell, onDeepLink } from '../services/native';
import { revenueCat, isProActive } from '../services/revenuecat';
import { initPush } from '../services/push';
import { currentUserId, fetchAthleteProfile } from '../services/firebase';

interface AppBootOptions {
  setUserProfile: Dispatch<SetStateAction<UserProfile>>;
  setChallenge: Dispatch<SetStateAction<ChallengeInvite | null>>;
  setActiveTab: Dispatch<SetStateAction<TabType>>;
}

/**
 * Everything that has to happen once, at launch: configure the native shell,
 * pick up an incoming challenge link, establish the athlete's identity, and
 * bring purchases and push online behind it.
 *
 * Identity comes first because both RevenueCat and OneSignal are keyed on the
 * same Firebase uid — without that, a player who reinstalls or switches device
 * looks like a new person to every service at once.
 */
export function useAppBoot({
  setUserProfile,
  setChallenge,
  setActiveTab,
}: AppBootOptions): void {
  // Native shell and deep links.
  useEffect(() => {
    initNativeShell();

    const invite = parseChallengeFromUrl();
    if (invite) {
      setChallenge(invite);
      clearChallengeFromUrl();
    }

    const removeDeepLink = onDeepLink((url) => {
      const incoming = parseChallengeFromUrl(url);
      if (incoming) {
        setChallenge(incoming);
        setActiveTab('PLAY');
      }
    });

    return removeDeepLink;
  }, [setChallenge, setActiveTab]);

  // Identity, purchases, push.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const uid = await currentUserId();
      if (cancelled || !uid) return;

      // Adopt the Firebase uid as the canonical athlete id so scores and the
      // profile document agree, and so the standings can dedupe by account.
      setUserProfile((prev) => {
        if (prev.id === uid) return prev;
        const next = { ...prev, id: uid };
        localStorage.setItem('world_reaction_user', JSON.stringify(next));
        return next;
      });

      // Restore a cloud profile onto a device that has none of its own.
      //
      // Only when this install has no history: an active local profile is the
      // newer truth and gets pushed up by the normal sync, so overwriting it
      // from the cloud would silently discard the session in progress.
      const remote = await fetchAthleteProfile();
      if (!cancelled && remote) {
        setUserProfile((prev) => {
          /**
           * Merge rather than choose.
           *
           * The old test was "does this install have any history", evaluated
           * after two network round trips during which the app is fully
           * playable on the default tab. Posting a single time in that window
           * set testsCompleted to 1, the restore then decided this was not a
           * fresh install and discarded the cloud profile -- and the next save
           * pushed the near-empty local one up, destroying the real history in
           * both places. Taking the better of each field cannot lose data
           * whichever way the race falls.
           */
          const merged: UserProfile = { ...prev };

          if (remote.username && !prev.testsCompleted) merged.username = remote.username;
          if (remote.avatar && !prev.testsCompleted) merged.avatar = remote.avatar;
          // The nation is immutable once set, so the stored one is canonical.
          if (remote.country) merged.country = remote.country;

          merged.testsCompleted = Math.max(prev.testsCompleted || 0, remote.testsCompleted || 0);
          merged.streakDays = Math.max(prev.streakDays || 0, remote.streakDays || 0);

          // Best means fastest, so the smaller positive number wins.
          const bests = [prev.bestScore, remote.bestScore].filter(
            (v): v is number => typeof v === 'number' && v > 0
          );
          if (bests.length) merged.bestScore = Math.min(...bests);

          merged.unlockedBadges = Array.from(
            new Set([...(prev.unlockedBadges || []), ...(remote.unlockedBadges || [])])
          );
          merged.proPassActive = Boolean(prev.proPassActive || remote.proPassActive);

          try {
            localStorage.setItem('world_reaction_user', JSON.stringify(merged));
          } catch {
            /* storage may be full or unavailable; state is still correct */
          }
          return merged;
        });
      }

      initPush(uid);
      await revenueCat.initialize(uid);

      const customer = await revenueCat.getCustomerInfo();
      if (!cancelled && isProActive(customer)) {
        setUserProfile((prev) =>
          prev.proPassActive ? prev : { ...prev, proPassActive: true }
        );
      }

      revenueCat.onCustomerInfoChanged((state) => {
        setUserProfile((prev) => {
          const active = isProActive(state);
          if (prev.proPassActive === active) return prev;
          const next = { ...prev, proPassActive: active };
          localStorage.setItem('world_reaction_user', JSON.stringify(next));
          return next;
        });
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [setUserProfile]);
}
