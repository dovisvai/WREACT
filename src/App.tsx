import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChallengeInvite,
  DeviceOS,
  GameMode,
  PlayerContribution,
  UserProfile,
} from './types';
import { HeaderBar } from './components/HeaderBar';
import { LiveTickerBar } from './components/LiveTickerBar';
import { ReactionGame } from './components/ReactionGame';
import { WorldStandings } from './components/WorldStandings';
import { GlobalLeaderboard } from './components/GlobalLeaderboard';
import { DailyChallengeView } from './components/DailyChallengeView';
import { LiveDuelLobby } from './components/LiveDuelLobby';
import { ProfileView } from './components/ProfileView';
import { BottomNavBar, TabType } from './components/BottomNavBar';
import { ShareCardModal } from './components/ShareCardModal';
import { DailyNotificationModal } from './components/DailyNotificationModal';
import { AuthModal } from './components/AuthModal';
import { MonetizationModal } from './components/MonetizationModal';
import { OnboardingWizard } from './components/OnboardingWizard';
import { ChallengeBanner } from './components/ChallengeBanner';
import { Segmented } from './components/ui/Primitives';
import { setGlobalAudioMuted } from './utils/audio';
import { getCountryName } from './utils/countries';
import { computeContribution, isPlausibleReaction } from './utils/standings';
import { isRestrictedCountry } from './utils/restrictedCountries';
import { isRankedMode } from './utils/matchday';
import { advanceStreak, hasPlayedToday } from './utils/streak';
import { platform } from './services/native';
import { isBackendUnreachable } from './services/api';
import { buildPushTags, syncPushTags } from './services/push';
import {
  submitReactionScoreToFirebase,
  syncUserProfileToFirebase,
} from './services/firebase';
import { useLiveData } from './hooks/useLiveData';
import { useAppBoot } from './hooks/useAppBoot';

function detectDevice(): DeviceOS {
  const p = platform();
  if (p === 'ios') return 'iOS';
  if (p === 'android') return 'Android';
  return 'Web';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('PLAY');
  const [activeGameMode, setActiveGameMode] = useState<GameMode>('CLASSIC');
  const [worldPane, setWorldPane] = useState<'NATIONS' | 'ATHLETES'>('NATIONS');
  const deviceOS = useMemo(detectDevice, []);

  const [audioEnabled, setAudioEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('wreact_audio_enabled');
    const isEnabled = saved !== null ? saved === 'true' : true;
    setGlobalAudioMuted(!isEnabled);
    return isEnabled;
  });

  const handleSetAudioEnabled = (val: boolean) => {
    setAudioEnabled(val);
    setGlobalAudioMuted(!val);
    localStorage.setItem('wreact_audio_enabled', String(val));
  };

  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    if (localStorage.getItem('wreact_onboarded') !== 'true') return true;
    // Re-run onboarding if the stored nation is no longer selectable.
    try {
      const saved = JSON.parse(localStorage.getItem('world_reaction_user') || '{}');
      return !saved.country || isRestrictedCountry(saved.country);
    } catch {
      return true;
    }
  });

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('world_reaction_user');
    if (saved) {
      try {
        const parsed: UserProfile = JSON.parse(saved);
        // Profiles written before score validation existed may carry an
        // impossible best. Drop it rather than displaying it as a record.
        if (parsed.bestScore && !isPlausibleReaction(parsed.bestScore)) {
          parsed.bestScore = 0;
        }
        parsed.history = (parsed.history || []).filter((run) =>
          isPlausibleReaction(run.scoreMs)
        );
        // A country that has since become restricted would leave the profile
        // failing every server and database write. Clear it and let them pick
        // again rather than stranding them in a silently broken state.
        if (isRestrictedCountry(parsed.country)) {
          parsed.country = '';
        }
        return parsed;
      } catch {
        /* fall through to a fresh profile */
      }
    }
    return {
      id: `u-${Math.random().toString(36).slice(2, 8)}`,
      username: 'ReflexAthlete',
      country: 'US',
      avatar: '⚡',
      bestScore: 0,
      testsCompleted: 0,
      streakDays: 0,
      lastDailyDate: '',
      history: [],
      unlockedBadges: [],
      isLoggedIn: false,
      authProvider: 'guest',
      verifiedAthlete: false,
      proPassActive: false,
    };
  });

  const {
    scores,
    standings,
    clock,
    lastMatchdayResults,
    liveTicker,
    onlineCount,
    dailyChallenge,
    sendScore,
  } = useLiveData();
  const [lastContribution, setLastContribution] = useState<PlayerContribution | null>(null);

  const [challenge, setChallenge] = useState<ChallengeInvite | null>(null);

  useAppBoot({ setUserProfile, setChallenge, setActiveTab });

  const [shareModalData, setShareModalData] = useState<{
    isOpen: boolean;
    scoreMs: number;
    mode: GameMode;
  }>({ isOpen: false, scoreMs: 0, mode: 'CLASSIC' });
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMonetizationModalOpen, setIsMonetizationModalOpen] = useState(false);

  /* ---------------------------------------------------------------------- */
  /* Profile                                                                */
  /* ---------------------------------------------------------------------- */
  const saveUserProfile = useCallback((updated: Partial<UserProfile>) => {
    setUserProfile((prev) => {
      const next = { ...prev, ...updated };
      localStorage.setItem('world_reaction_user', JSON.stringify(next));
      syncUserProfileToFirebase(next);
      return next;
    });
  }, []);

  const handleLoginSuccess = (authData: {
    username: string;
    email: string;
    authProvider: 'google' | 'apple';
    verifiedAthlete: boolean;
    photoUrl?: string;
  }) => {
    saveUserProfile({
      username: authData.username,
      email: authData.email,
      authProvider: authData.authProvider,
      verifiedAthlete: authData.verifiedAthlete,
      isLoggedIn: true,
      photoUrl: authData.photoUrl,
    });
  };

  const handleSignOut = () => {
    saveUserProfile({
      isLoggedIn: false,
      authProvider: 'guest',
      verifiedAthlete: false,
      email: undefined,
    });
  };

  const handleDeleteAccount = () => {
    localStorage.clear();
    setUserProfile({
      id: `u-${Math.random().toString(36).slice(2, 8)}`,
      username: 'ReflexAthlete',
      country: 'US',
      avatar: '⚡',
      streakDays: 0,
      lastDailyDate: '',
      testsCompleted: 0,
      bestScore: 0,
      unlockedBadges: [],
      history: [],
      isLoggedIn: false,
      authProvider: 'guest',
      verifiedAthlete: false,
      proPassActive: false,
    });
    setIsOnboardingOpen(true);
  };

  const handleOnboardingComplete = (updatedProfile: Partial<UserProfile>) => {
    saveUserProfile(updatedProfile);
    localStorage.setItem('wreact_onboarded', 'true');
    setIsOnboardingOpen(false);
  };

  /* ---------------------------------------------------------------------- */
  /* Scoring                                                                */
  /* ---------------------------------------------------------------------- */
  const handleScoreSubmitted = useCallback(
    (scoreMs: number, mode: GameMode, isDaily = false) => {
      // A 45-second "reaction" is inattention, not a result. It must never
      // become a personal best, and must never reach a national average.
      if (!isPlausibleReaction(scoreMs)) return;

      const previousBest = userProfile.bestScore > 0 ? userProfile.bestScore : null;

      // Only the ranked mode moves a national average, so only the ranked mode
      // gets a contribution line. Showing one for a Stroop run would promise an
      // effect on the standings that never happens.
      setLastContribution(
        isRankedMode(mode)
          ? computeContribution(standings, userProfile.country, previousBest, scoreMs)
          : null
      );

      const isBest = previousBest === null || scoreMs < previousBest;

      // A daily entry advances the streak, but only the first one of the day —
      // playing the event five times is practice, not five days of consistency.
      const streak = isDaily
        ? advanceStreak(userProfile)
        : { streakDays: userProfile.streakDays, lastDailyDate: userProfile.lastDailyDate };

      saveUserProfile({
        bestScore: isBest ? scoreMs : userProfile.bestScore,
        testsCompleted: userProfile.testsCompleted + 1,
        streakDays: streak.streakDays,
        lastDailyDate: streak.lastDailyDate,
        history: [
          { id: `h-${Date.now()}`, scoreMs, mode, timestamp: Date.now() },
          ...(userProfile.history || []).slice(0, 99),
        ],
      });

      const payload = {
        userId: userProfile.id,
        username: userProfile.username,
        country: userProfile.country,
        scoreMs,
        mode,
        device: deviceOS,
        isDaily,
      };

      sendScore(payload);

      submitReactionScoreToFirebase({
        username: userProfile.username,
        country: userProfile.country,
        avatar: userProfile.avatar,
        scoreMs,
        mode,
        tier:
          scoreMs < 150
            ? 'ELITE'
            : scoreMs < 200
            ? 'PROFESSIONAL'
            : scoreMs < 250
            ? 'ADVANCED'
            : 'AVERAGE',
      });
    },
    [userProfile, standings, deviceOS, saveUserProfile, sendScore]
  );

  const openShareModal = (scoreMs: number, mode: GameMode) =>
    setShareModalData({ isOpen: true, scoreMs, mode });

  const userStanding = useMemo(
    () => standings.find((s) => s.code === userProfile.country.toUpperCase()) ?? null,
    [standings, userProfile.country]
  );

  /**
   * Keep OneSignal segmentation tags current.
   *
   * Campaigns target on these, so a stale rank means the wrong player gets the
   * "you are about to be overtaken" message — worse than sending nothing.
   */
  useEffect(() => {
    syncPushTags(buildPushTags(userProfile, userStanding, clock));
  }, [userProfile, userStanding, clock]);

  const goPlay = useCallback(() => setActiveTab('PLAY'), []);

  return (
    <div className="flex h-[100dvh] flex-col bg-pitch-900 text-ink">
      <HeaderBar
        audioEnabled={audioEnabled}
        setAudioEnabled={handleSetAudioEnabled}
        onlineCount={onlineCount}
        openProfile={() => setActiveTab('PROFILE')}
        openNotifications={() => setIsNotificationModalOpen(true)}
        userAvatar={userProfile.avatar}
        userCountry={userProfile.country}
        countryRank={userStanding?.rank ?? null}
        isPro={Boolean(userProfile.proPassActive)}
      />

      {/* A packaged build with no API origin cannot reach anything. Say so,
          rather than presenting an app that silently has no data in it. */}
      {isBackendUnreachable() && (
        <div className="shrink-0 border-b border-alert/40 bg-alert/10 px-4 py-2">
          <p className="text-[12px] font-semibold text-alert">
            No server configured
          </p>
          <p className="text-[11px] leading-snug text-ink-muted">
            This build has no VITE_API_ORIGIN, so standings, duels and score submission
            cannot work. Rebuild pointing at the deployed server.
          </p>
        </div>
      )}

      <LiveTickerBar tickerEvents={liveTicker} />

      {challenge && (
        <ChallengeBanner
          invite={challenge}
          onAccept={() => {
            setActiveGameMode(challenge.mode);
            setActiveTab('PLAY');
          }}
          onDismiss={() => setChallenge(null)}
        />
      )}

      <main className="relative flex-1 overflow-hidden">
        {activeTab === 'PLAY' && (
          <ReactionGame
            mode={activeGameMode}
            setMode={setActiveGameMode}
            username={userProfile.username}
            country={userProfile.country}
            avatar={userProfile.avatar}
            deviceOS={deviceOS}
            audioEnabled={audioEnabled}
            onScoreSubmitted={handleScoreSubmitted}
            dailyMode={dailyChallenge?.mode ?? null}
            dailyTargetMs={dailyChallenge?.targetMs ?? null}
            openShareModal={openShareModal}
            contribution={lastContribution}
            standings={standings}
            challenge={challenge}
            onChallengeSettled={() => setChallenge(null)}
          />
        )}

        {activeTab === 'WORLD' && (
          <div className="flex h-full flex-col">
            <div className="border-b border-pitch-700 px-4 py-3">
              <Segmented
                options={[
                  { value: 'NATIONS', label: 'Nations' },
                  { value: 'ATHLETES', label: 'Athletes' },
                ]}
                value={worldPane}
                onChange={setWorldPane}
              />
            </div>
            <div className="flex-1 overflow-hidden">
              {worldPane === 'NATIONS' ? (
                <WorldStandings
                  standings={standings}
                  clock={clock}
                  userCountry={userProfile.country}
                  lastContributionMs={lastContribution?.msImprovement ?? null}
                  onPlay={goPlay}
                />
              ) : (
                <GlobalLeaderboard
                  scores={scores}
                  currentMode={activeGameMode}
                  setCurrentMode={(m) => setActiveGameMode(m === 'ALL' ? 'CLASSIC' : m)}
                  userCountry={userProfile.country}
                  username={userProfile.username}
                />
              )}
            </div>
          </div>
        )}

        {activeTab === 'DUEL' && (
          <LiveDuelLobby
            username={userProfile.username}
            country={userProfile.country}
            avatar={userProfile.avatar}
            audioEnabled={audioEnabled}
          />
        )}

        {activeTab === 'DAILY' && (
          <DailyChallengeView
            dailyInfo={dailyChallenge}
            onStartDaily={() => {
              setActiveGameMode('DAILY_CHALLENGE');
              setActiveTab('PLAY');
            }}
            streakDays={userProfile.streakDays}
            playedToday={hasPlayedToday(userProfile)}
            openNotifications={() => setIsNotificationModalOpen(true)}
          />
        )}

        {activeTab === 'PROFILE' && (
          <ProfileView
            profile={userProfile}
            standing={userStanding}
            onUpdateProfile={saveUserProfile}
            openAuthModal={() => setIsAuthModalOpen(true)}
            openMonetizationModal={() => setIsMonetizationModalOpen(true)}
            openOnboarding={() => setIsOnboardingOpen(true)}
            onDeleteAccount={handleDeleteAccount}
          />
        )}
      </main>

      <BottomNavBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        streakDays={userProfile.streakDays}
      />

      <OnboardingWizard
        isOpen={isOnboardingOpen}
        initialProfile={userProfile}
        onComplete={handleOnboardingComplete}
      />

      <ShareCardModal
        isOpen={shareModalData.isOpen}
        scoreMs={shareModalData.scoreMs}
        mode={shareModalData.mode}
        username={userProfile.username}
        country={userProfile.country}
        avatar={userProfile.avatar}
        standing={userStanding}
        standings={standings}
        onClose={() => setShareModalData((prev) => ({ ...prev, isOpen: false }))}
      />

      <DailyNotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        dailyStreak={userProfile.streakDays}
        clock={clock}
        countryName={getCountryName(userProfile.country)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        userProfile={userProfile}
        onLoginSuccess={handleLoginSuccess}
        onSignOut={handleSignOut}
      />

      <MonetizationModal
        isOpen={isMonetizationModalOpen}
        onClose={() => setIsMonetizationModalOpen(false)}
        proPassActive={Boolean(userProfile.proPassActive)}
        onActivateProPass={() => saveUserProfile({ proPassActive: true })}
      />
    </div>
  );
}
