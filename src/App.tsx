import React, { useState, useEffect, useRef } from 'react';
import { ScoreRecord, GameMode, DeviceOS, UserProfile, DailyChallengeInfo, LiveTickerEvent } from './types';
import { HeaderBar } from './components/HeaderBar';
import { LiveTickerBar } from './components/LiveTickerBar';
import { ReactionGame } from './components/ReactionGame';
import { GlobalLeaderboard } from './components/GlobalLeaderboard';
import { DailyChallengeView } from './components/DailyChallengeView';
import { LiveDuelLobby } from './components/LiveDuelLobby';
import { ProfileView } from './components/ProfileView';
import { FriendsView } from './components/FriendsView';
import { BottomNavBar, TabType } from './components/BottomNavBar';
import { ShareCardModal } from './components/ShareCardModal';
import { DailyNotificationModal } from './components/DailyNotificationModal';
import { AuthModal } from './components/AuthModal';
import { MonetizationModal } from './components/MonetizationModal';
import { OnboardingWizard } from './components/OnboardingWizard';
import { getCountryFlag } from './utils/countries';
import { setGlobalAudioMuted } from './utils/audio';
import { 
  syncUserProfileToFirebase, 
  submitReactionScoreToFirebase, 
  listenToGlobalLeaderboard 
} from './services/firebase';

export default function App() {
  // Navigation & Platform Frame
  const [activeTab, setActiveTab] = useState<TabType>('PLAY');
  const [activeGameMode, setActiveGameMode] = useState<GameMode>('CLASSIC');
  const [deviceOS, setDeviceOS] = useState<DeviceOS>('iOS');
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


  // First-time Onboarding State
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    return localStorage.getItem('wreact_onboarded') !== 'true';
  });

  // User Profile State
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('world_reaction_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      id: `u-${Math.random().toString(36).substr(2, 6)}`,
      username: 'ReflexAthlete',
      country: 'US',
      avatar: '⚡',
      bestScore: 0,
      testsCompleted: 0,
      streakDays: 4,
      lastDailyDate: '',
      history: [],
      unlockedBadges: [],
      isLoggedIn: false,
      authProvider: 'guest',
      verifiedAthlete: false,
      proPassActive: false,
    };
  });

  // Global Real-Time State
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [onlineCount, setOnlineCount] = useState<number>(1420);
  const [liveTicker, setLiveTicker] = useState<LiveTickerEvent[]>([]);
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallengeInfo>({
    id: 'daily-today',
    date: new Date().toISOString().split('T')[0],
    title: '⚡ Lightning 3-Tap Surge',
    description: 'Tap 3 unpredictable flashing targets in under 200ms average! Avoid red decoys!',
    mode: 'DAILY_CHALLENGE',
    targetMs: 180,
    specialRule: 'Double reaction speed test + fake red signals.',
    participantsCount: 4280,
    topScoreMs: 154,
    topScorer: 'ApexPredator',
    topCountry: 'CA',
  });

  // Modals
  const [shareModalData, setShareModalData] = useState<{ isOpen: boolean; scoreMs: number; mode: GameMode }>({
    isOpen: false,
    scoreMs: 0,
    mode: 'CLASSIC',
  });
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMonetizationModalOpen, setIsMonetizationModalOpen] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);

  // Fetch Initial Data & WebSocket Connection
  useEffect(() => {
    fetch('/api/leaderboard')
      .then((res) => res.json())
      .then((data) => {
        if (data.scores) setScores(data.scores);
      })
      .catch(() => {});

    fetch('/api/daily-challenge')
      .then((res) => res.json())
      .then((data) => {
        if (data.id) setDailyChallenge(data);
      })
      .catch(() => {});

    // WebSocket Sync
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'INIT_STATE') {
          if (msg.onlinePlayers) setOnlineCount(msg.onlinePlayers);
          if (msg.scores) setScores(msg.scores);
          if (msg.ticker) setLiveTicker(msg.ticker);
          if (msg.dailyChallenge) setDailyChallenge(msg.dailyChallenge);
        }
        if (msg.type === 'ONLINE_COUNT') {
          setOnlineCount(msg.count);
        }
        if (msg.type === 'NEW_SCORE_ADDED') {
          setScores((prev) => [msg.score, ...prev].sort((a, b) => a.scoreMs - b.scoreMs));
          if (msg.ticker) setLiveTicker((prev) => [msg.ticker, ...prev.slice(0, 19)]);
          if (msg.dailyChallenge) setDailyChallenge(msg.dailyChallenge);
        }
      } catch (err) {
        console.error('WS parse error', err);
      }
    };

    // Firestore Real-time Leaderboard Listener
    const unsubscribeFirestore = listenToGlobalLeaderboard((liveScores) => {
      if (liveScores && liveScores.length > 0) {
        setScores((prev) => {
          const combined = [...liveScores, ...prev];
          const unique = Array.from(new Map(combined.map(s => [s.id || `${s.username}_${s.scoreMs}`, s])).values());
          return unique.sort((a, b) => a.scoreMs - b.scoreMs);
        });
      }
    });

    return () => {
      ws.close();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  const saveUserProfile = (updated: Partial<UserProfile>) => {
    setUserProfile((prev) => {
      const next = { ...prev, ...updated };
      localStorage.setItem('world_reaction_user', JSON.stringify(next));
      syncUserProfileToFirebase(next);
      return next;
    });
  };

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
    const freshUser: UserProfile = {
      id: `wreact_${Math.random().toString(36).substring(2, 9)}`,
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
    };
    setUserProfile(freshUser);
    localStorage.setItem('world_reaction_user', JSON.stringify(freshUser));
    setIsOnboardingOpen(true);
  };

  const handleOnboardingComplete = (updatedProfile: Partial<UserProfile>) => {
    saveUserProfile(updatedProfile);
    localStorage.setItem('wreact_onboarded', 'true');
    setIsOnboardingOpen(false);
  };

  const handleScoreSubmitted = (scoreMs: number, mode: GameMode) => {
    // Local profile update
    const isBest = !userProfile.bestScore || scoreMs < userProfile.bestScore;
    saveUserProfile({
      bestScore: isBest ? scoreMs : userProfile.bestScore,
      testsCompleted: userProfile.testsCompleted + 1,
    });

    // Send score to server via WebSocket or REST
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'SUBMIT_SCORE',
          payload: {
            username: userProfile.username,
            country: userProfile.country,
            scoreMs,
            mode,
            device: deviceOS,
            isDaily: mode === 'DAILY_CHALLENGE',
          },
        })
      );
    } else {
      fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: userProfile.username,
          country: userProfile.country,
          scoreMs,
          mode,
          device: deviceOS,
          isDaily: mode === 'DAILY_CHALLENGE',
        }),
      }).catch(() => {});
    }

    // Submit to Firestore Global Leaderboard
    submitReactionScoreToFirebase({
      userId: userProfile.id,
      username: userProfile.username,
      country: userProfile.country,
      avatar: userProfile.avatar,
      scoreMs,
      mode,
      tier: scoreMs < 150 ? 'F1 GOD' : scoreMs < 200 ? 'ESPORTS PRO' : scoreMs < 250 ? 'TOP ATHLETE' : 'AVERAGE HUMAN',
    });
  };

  const openShareModal = (scoreMs: number, mode: GameMode) => {
    setShareModalData({ isOpen: true, scoreMs, mode });
  };

  return (
    <div className="min-h-screen bg-[#020b1c] text-slate-100 font-sans flex items-center justify-center p-0 md:p-6 overflow-x-hidden">
      {/* Mobile Device Frame Container (Emulating iOS / Android Native App Frame on Desktop) */}
      <div
        className={`w-full transition-all duration-300 ${
          deviceOS === 'Web'
            ? 'max-w-4xl h-screen md:h-[90vh] rounded-none md:rounded-3xl border-0 md:border border-[#12284c]'
            : 'max-w-md h-screen md:h-[840px] rounded-none md:rounded-[44px] border-0 md:border-8 border-[#12284c] shadow-[0_0_50px_rgba(230,0,43,0.15)]'
        } bg-[#020b1c] flex flex-col relative overflow-hidden`}
      >
        {/* Header Bar */}
        <HeaderBar
          deviceOS={deviceOS}
          setDeviceOS={setDeviceOS}
          audioEnabled={audioEnabled}
          setAudioEnabled={handleSetAudioEnabled}
          onlineCount={onlineCount}
          openProfile={() => setActiveTab('PROFILE')}
          openNotifications={() => setIsNotificationModalOpen(true)}
          userAvatar={userProfile.avatar}
          userCountryFlag={getCountryFlag(userProfile.country)}
        />

        {/* Live Worldwide Ticker */}
        <LiveTickerBar tickerEvents={liveTicker} />

        {/* Dynamic Screen Body */}
        <div className="flex-1 overflow-hidden relative">
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
              openShareModal={openShareModal}
            />
          )}

          {activeTab === 'LEADERBOARD' && (
            <GlobalLeaderboard
              scores={scores}
              currentMode={activeGameMode}
              setCurrentMode={(m) => setActiveGameMode(m === 'ALL' ? 'CLASSIC' : m)}
              userCountry={userProfile.country}
            />
          )}

          {activeTab === 'FRIENDS' && (
            <FriendsView
              userProfile={userProfile}
              onStartDuelWithFriend={(_friendUsername) => {
                setActiveTab('DUEL');
              }}
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
              openNotifications={() => setIsNotificationModalOpen(true)}
            />
          )}

          {activeTab === 'DUEL' && (
            <LiveDuelLobby
              username={userProfile.username}
              country={userProfile.country}
              avatar={userProfile.avatar}
              audioEnabled={audioEnabled}
            />
          )}

          {activeTab === 'PROFILE' && (
            <ProfileView
              profile={userProfile}
              onUpdateProfile={saveUserProfile}
              openAuthModal={() => setIsAuthModalOpen(true)}
              openMonetizationModal={() => setIsMonetizationModalOpen(true)}
              openOnboarding={() => setIsOnboardingOpen(true)}
              onDeleteAccount={handleDeleteAccount}
            />
          )}
        </div>

        {/* Bottom Tab Bar */}
        <BottomNavBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          streakDays={userProfile.streakDays}
        />
      </div>

      {/* First-Time Installation Onboarding Flow Wizard */}
      <OnboardingWizard
        isOpen={isOnboardingOpen}
        initialProfile={userProfile}
        onComplete={handleOnboardingComplete}
      />

      {/* Share Card Modal */}
      <ShareCardModal
        scoreMs={shareModalData.scoreMs}
        mode={shareModalData.mode}
        username={userProfile.username}
        country={userProfile.country}
        avatar={userProfile.avatar}
        isOpen={shareModalData.isOpen}
        onClose={() => setShareModalData({ ...shareModalData, isOpen: false })}
      />

      {/* Daily Challenge Notification Settings Modal */}
      <DailyNotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        dailyStreak={userProfile.streakDays}
      />

      {/* Google and Apple Authentication Screen Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        userProfile={userProfile}
        onLoginSuccess={handleLoginSuccess}
        onSignOut={handleSignOut}
      />

      {/* Viral Monetization Strategy Hub & Revenue Calculator Modal */}
      <MonetizationModal
        isOpen={isMonetizationModalOpen}
        onClose={() => setIsMonetizationModalOpen(false)}
        proPassActive={userProfile.proPassActive}
        onActivateProPass={() => saveUserProfile({ proPassActive: true })}
      />
    </div>
  );
}

