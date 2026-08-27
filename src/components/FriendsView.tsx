import React, { useState, useEffect } from 'react';
import { UserProfile, FriendUser, GameMode } from '../types';
import { getCountryFlag, getPercentileRating } from '../utils/countries';
import { useHapticSound } from '../hooks/useHapticSound';
import { 
  Users, 
  UserPlus, 
  Search, 
  Trophy, 
  Zap, 
  Swords, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Sparkles, 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight, 
  Share2, 
  Flame, 
  BarChart3,
  Check,
  X
} from 'lucide-react';

interface FriendsViewProps {
  userProfile: UserProfile;
  onStartDuelWithFriend?: (friendUsername: string) => void;
}

// Initial realistic seed friends if localStorage is empty
const INITIAL_FRIENDS_SEED: FriendUser[] = [
  {
    id: 'f-1',
    username: 'ApexReflex_US',
    country: 'US',
    avatar: '🦅',
    bestScore: 168,
    modeScores: {
      CLASSIC: 168,
      FALSE_ALARM: 182,
      PATTERN_SEQUENCE: 210,
      PRECISION_TARGET: 195,
      REVERSE_COLOR: 189,
      DAILY_CHALLENGE: 172,
    },
    testsCompleted: 342,
    streakDays: 12,
    verifiedAthlete: true,
    status: 'online',
    lastActive: 'Just now',
    addedAt: Date.now() - 86400000 * 10,
  },
  {
    id: 'f-2',
    username: 'KatsuFast_JP',
    country: 'JP',
    avatar: '🥷',
    bestScore: 154,
    modeScores: {
      CLASSIC: 154,
      FALSE_ALARM: 175,
      PATTERN_SEQUENCE: 198,
      PRECISION_TARGET: 180,
      REVERSE_COLOR: 178,
      DAILY_CHALLENGE: 160,
    },
    testsCompleted: 512,
    streakDays: 24,
    verifiedAthlete: true,
    status: 'in_game',
    lastActive: 'In 1v1 Duel',
    addedAt: Date.now() - 86400000 * 7,
  },
  {
    id: 'f-3',
    username: 'VoltNinja_DE',
    country: 'DE',
    avatar: '⚡',
    bestScore: 185,
    modeScores: {
      CLASSIC: 185,
      FALSE_ALARM: 201,
      PATTERN_SEQUENCE: 230,
      PRECISION_TARGET: 210,
      REVERSE_COLOR: 205,
      DAILY_CHALLENGE: 190,
    },
    testsCompleted: 189,
    streakDays: 5,
    verifiedAthlete: false,
    status: 'offline',
    lastActive: '2h ago',
    addedAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'f-4',
    username: 'SeoulStriker_KR',
    country: 'KR',
    avatar: '🐯',
    bestScore: 162,
    modeScores: {
      CLASSIC: 162,
      FALSE_ALARM: 179,
      PATTERN_SEQUENCE: 205,
      PRECISION_TARGET: 188,
      REVERSE_COLOR: 182,
      DAILY_CHALLENGE: 168,
    },
    testsCompleted: 420,
    streakDays: 18,
    verifiedAthlete: true,
    status: 'online',
    lastActive: 'Just now',
    addedAt: Date.now() - 86400000 * 1,
  },
];

// Suggested friends to quickly add
const SUGGESTED_ATHLETES = [
  { username: 'NordicFlash_NO', country: 'NO', avatar: '🐺', bestScore: 161, verified: true },
  { username: 'AussieSniper_AU', country: 'AU', avatar: '🦘', bestScore: 177, verified: false },
  { username: 'RioReflex_BR', country: 'BR', avatar: '🦜', bestScore: 170, verified: true },
  { username: 'LondonNeural_GB', country: 'GB', avatar: '🦁', bestScore: 169, verified: false },
];

const GAME_MODES_LIST: { id: GameMode; label: string }[] = [
  { id: 'CLASSIC', label: 'Classic' },
  { id: 'FALSE_ALARM', label: 'False Alarm' },
  { id: 'PATTERN_SEQUENCE', label: 'Pattern' },
  { id: 'PRECISION_TARGET', label: 'Precision' },
  { id: 'REVERSE_COLOR', label: 'Reverse' },
  { id: 'DAILY_CHALLENGE', label: 'Daily' },
];

export const FriendsView: React.FC<FriendsViewProps> = ({ userProfile, onStartDuelWithFriend }) => {
  const { playTap, playPop, playSuccess, playSnap, playError } = useHapticSound();

  const [friends, setFriends] = useState<FriendUser[]>(() => {
    const saved = localStorage.getItem('world_reaction_friends');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_FRIENDS_SEED;
      }
    }
    return INITIAL_FRIENDS_SEED;
  });

  const [activeSubTab, setActiveSubTab] = useState<'LIST' | 'COMPARE' | 'ADD'>('LIST');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriendForModal, setSelectedFriendForModal] = useState<FriendUser | null>(null);
  const [selectedCompareFriendId, setSelectedCompareFriendId] = useState<string>(() => {
    return friends.length > 0 ? friends[0].id : '';
  });
  const [addNotification, setAddNotification] = useState<string | null>(null);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('world_reaction_friends', JSON.stringify(friends));
  }, [friends]);

  // Keep selected compare friend ID valid
  useEffect(() => {
    if (friends.length > 0 && (!selectedCompareFriendId || !friends.some(f => f.id === selectedCompareFriendId))) {
      setSelectedCompareFriendId(friends[0].id);
    }
  }, [friends, selectedCompareFriendId]);

  const handleAddFriendByUsername = (targetUsername: string, customCountry = 'US', customAvatar = '⚡', customBest = 180) => {
    const cleanName = targetUsername.trim();
    if (!cleanName) return;

    // Check if already friends
    const exists = friends.some(f => f.username.toLowerCase() === cleanName.toLowerCase());
    if (exists) {
      playError();
      showToast(`@${cleanName} is already in your friends list!`);
      return;
    }

    // Check if trying to add oneself
    if (cleanName.toLowerCase() === userProfile.username.toLowerCase()) {
      playError();
      showToast("You can't add yourself as a friend!");
      return;
    }

    // Create new friend object
    const newFriend: FriendUser = {
      id: `f-${Date.now()}`,
      username: cleanName,
      country: customCountry,
      avatar: customAvatar,
      bestScore: customBest,
      modeScores: {
        CLASSIC: customBest,
        FALSE_ALARM: customBest + 18,
        PATTERN_SEQUENCE: customBest + 40,
        PRECISION_TARGET: customBest + 25,
        REVERSE_COLOR: customBest + 22,
        DAILY_CHALLENGE: customBest + 10,
      },
      testsCompleted: Math.floor(Math.random() * 200) + 50,
      streakDays: Math.floor(Math.random() * 15) + 1,
      verifiedAthlete: Math.random() > 0.5,
      status: 'online',
      lastActive: 'Just now',
      addedAt: Date.now(),
    };

    setFriends(prev => [newFriend, ...prev]);
    setSelectedCompareFriendId(newFriend.id);
    playSuccess();
    showToast(`Added @${cleanName} to your Friends list!`);
    setSearchQuery('');
  };

  const handleRemoveFriend = (friendId: string, username: string) => {
    setFriends(prev => prev.filter(f => f.id !== friendId));
    if (selectedFriendForModal?.id === friendId) {
      setSelectedFriendForModal(null);
    }
    playSnap();
    showToast(`Removed @${username} from friends`);
  };

  const showToast = (msg: string) => {
    setAddNotification(msg);
    setTimeout(() => {
      setAddNotification(null);
    }, 3000);
  };

  const filteredFriends = friends.filter(f => 
    f.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const compareFriend = friends.find(f => f.id === selectedCompareFriendId) || friends[0];

  // Helper to calculate user scores vs friend scores
  const getUserModeScore = (mode: GameMode): number => {
    if (mode === 'CLASSIC') return userProfile.bestScore || 220;
    // Look up in history if available or approximate
    const match = userProfile.history.find(h => h.mode === mode);
    return match ? match.scoreMs : (userProfile.bestScore ? userProfile.bestScore + 15 : 230);
  };

  // Head-to-Head win tally
  let userWinsCount = 0;
  let friendWinsCount = 0;

  if (compareFriend) {
    GAME_MODES_LIST.forEach(m => {
      const userVal = getUserModeScore(m.id);
      const friendVal = compareFriend.modeScores?.[m.id] ?? compareFriend.bestScore + 20;
      if (userVal < friendVal) userWinsCount++;
      else if (friendVal < userVal) friendWinsCount++;
    });
  }

  return (
    <div className="flex flex-col h-full bg-[#020b1c] text-white select-none p-3 md:p-4 overflow-y-auto space-y-3 pb-12">
      {/* Toast Notification */}
      {addNotification && (
        <div className="fixed top-20 md:top-24 left-1/2 -translate-x-1/2 z-50 bg-[#00122e] border border-yellow-400 text-yellow-300 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-black animate-bounce max-w-[90vw] text-center">
          <Sparkles className="w-4 h-4 text-yellow-400 shrink-0" />
          <span className="truncate">{addNotification}</span>
        </div>
      )}

      {/* Friends Header Banner */}
      <div className="bg-gradient-to-r from-red-950/80 via-[#00122e] to-[#020b1c] border border-red-500/40 rounded-3xl p-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-600/20 border border-red-500/40 rounded-2xl text-yellow-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-white">Rivals & Friends</h1>
                <span className="text-[10px] font-black bg-red-600 text-white px-2 py-0.5 rounded-full border border-yellow-400/40">
                  {friends.length} Connected
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Add rivals, track stats, and challenge personal bests
              </p>
            </div>
          </div>
        </div>

        {/* Quick Sub-Navigation Pills */}
        <div className="flex items-center gap-1.5 mt-4 bg-[#020b1c] p-1 rounded-2xl border border-[#12284c] text-xs">
          <button
            onClick={() => { playTap(); setActiveSubTab('LIST'); }}
            className={`flex-1 py-1.5 px-3 rounded-xl font-black transition-all flex items-center justify-center gap-1.5 ${
              activeSubTab === 'LIST'
                ? 'bg-red-600 text-white shadow-md border border-yellow-400/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-yellow-400" />
            <span>My Friends ({friends.length})</span>
          </button>

          <button
            onClick={() => { playTap(); setActiveSubTab('COMPARE'); }}
            className={`flex-1 py-1.5 px-3 rounded-xl font-black transition-all flex items-center justify-center gap-1.5 ${
              activeSubTab === 'COMPARE'
                ? 'bg-yellow-400 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-slate-950" />
            <span>Head-to-Head</span>
          </button>

          <button
            onClick={() => { playTap(); setActiveSubTab('ADD'); }}
            className={`flex-1 py-1.5 px-3 rounded-xl font-black transition-all flex items-center justify-center gap-1.5 ${
              activeSubTab === 'ADD'
                ? 'bg-red-600 text-white shadow-md border border-yellow-400/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-yellow-400" />
            <span>Add Friend</span>
          </button>
        </div>
      </div>

      {/* 1. FRIENDS LIST SUB-TAB */}
      {activeSubTab === 'LIST' && (
        <div className="space-y-3">
          {/* Search bar & quick filter */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search friends by username or country code..."
              className="w-full bg-[#00122e] border border-[#12284c] rounded-2xl pl-9 pr-8 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-yellow-400 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {filteredFriends.length === 0 ? (
            <div className="bg-[#00122e]/60 border border-[#12284c] rounded-3xl p-6 text-center space-y-3">
              <Users className="w-10 h-10 text-slate-600 mx-auto" />
              <div>
                <p className="text-sm font-bold text-slate-300">No friends found</p>
                <p className="text-xs text-slate-400 mt-1">
                  {searchQuery ? 'Try searching for a different username.' : 'You haven\'t added any friends yet.'}
                </p>
              </div>
              <button
                onClick={() => { playTap(); setActiveSubTab('ADD'); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-xs transition-all shadow-lg border border-yellow-400/40"
              >
                <UserPlus className="w-4 h-4 text-yellow-400" />
                <span>Find & Add Friends</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFriends.map((friend) => {
                return (
                  <div
                    key={friend.id}
                    className="bg-[#00122e] border border-[#12284c] hover:border-red-500/50 rounded-3xl p-3.5 transition-all flex items-center justify-between gap-3 group"
                  >
                    {/* Left: Avatar + Info */}
                    <div 
                      onClick={() => { playPop(); setSelectedFriendForModal(friend); }}
                      className="flex items-center gap-3 cursor-pointer flex-1 overflow-hidden"
                    >
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-2xl bg-[#020b1c] border border-[#12284c] flex items-center justify-center text-2xl shadow-md">
                          {friend.avatar}
                        </div>
                        <span className="absolute -bottom-1 -right-1 text-xs leading-none">
                          {getCountryFlag(friend.country)}
                        </span>
                        {/* Status dot */}
                        <div 
                          className={`absolute -top-1 -left-1 w-3 h-3 rounded-full border-2 border-[#00122e] ${
                            friend.status === 'online' ? 'bg-emerald-500' :
                            friend.status === 'in_game' ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'
                          }`} 
                        />
                      </div>

                      <div className="overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-sm text-white truncate">
                            {friend.username}
                          </span>
                          {friend.verifiedAthlete && (
                            <ShieldCheck className="w-3.5 h-3.5 text-yellow-400 shrink-0" title="Verified Athlete" />
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-300 mt-0.5 font-mono">
                          <span className="flex items-center gap-0.5 text-yellow-400 font-extrabold">
                            <Zap className="w-3 h-3 fill-yellow-400" />
                            {friend.bestScore} ms
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5 text-red-400 font-bold">
                            <Flame className="w-3 h-3 fill-red-400" />
                            {friend.streakDays}d streak
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Quick Compare / Duel Action Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          playPop();
                          setSelectedCompareFriendId(friend.id);
                          setActiveSubTab('COMPARE');
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-[#020b1c] hover:bg-[#00122e] border border-[#12284c] text-slate-200 text-[11px] font-bold flex items-center gap-1 transition-all"
                        title="Compare Scores"
                      >
                        <BarChart3 className="w-3.5 h-3.5 text-yellow-400" />
                        <span className="hidden sm:inline">Compare</span>
                      </button>

                      <button
                        onClick={() => {
                          playSuccess();
                          if (onStartDuelWithFriend) {
                            onStartDuelWithFriend(friend.username);
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white text-[11px] font-black flex items-center gap-1 shadow-md transition-all active:scale-95 border border-yellow-400/40"
                      >
                        <Swords className="w-3.5 h-3.5" />
                        <span>Duel</span>
                      </button>

                      <button
                        onClick={() => handleRemoveFriend(friend.id, friend.username)}
                        className="p-1.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title="Remove Friend"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. HEAD-TO-HEAD DIRECT COMPARISON SUB-TAB */}
      {activeSubTab === 'COMPARE' && (
        <div className="space-y-3">
          {/* Friend Selector Dropdown / Carousel */}
          <div className="bg-[#00122e] border border-[#12284c] rounded-3xl p-3 space-y-2">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-yellow-400" />
              Select Rival Athlete to Compare
            </label>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {friends.map((f) => {
                const isSelected = f.id === selectedCompareFriendId;
                return (
                  <button
                    key={f.id}
                    onClick={() => { playSnap(); setSelectedCompareFriendId(f.id); }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-2xl border text-xs font-bold transition-all shrink-0 ${
                      isSelected
                        ? 'bg-red-600/30 border-yellow-400 text-yellow-300 shadow-lg font-black'
                        : 'bg-[#020b1c] border-[#12284c] text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <span>{f.avatar}</span>
                    <span>{f.username}</span>
                    <span className="text-[10px] text-yellow-400 font-mono">({f.bestScore}ms)</span>
                  </button>
                );
              })}
            </div>
          </div>

          {compareFriend ? (
            <div className="space-y-3">
              {/* Head-To-Head Scoreboard Header Card */}
              <div className="bg-gradient-to-br from-[#00122e] via-red-950/40 to-[#00122e] border border-red-500/40 rounded-3xl p-4 space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-300 border-b border-[#12284c] pb-2">
                  <span>Direct Matchup</span>
                  <span className="text-yellow-400 font-mono">Overall {userWinsCount} - {friendWinsCount}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 items-center">
                  {/* YOU */}
                  <div className="bg-[#020b1c] border border-yellow-400/40 rounded-2xl p-3 text-center space-y-1">
                    <div className="text-2xl">{userProfile.avatar}</div>
                    <div className="font-extrabold text-xs text-white truncate">{userProfile.username} (You)</div>
                    <div className="text-lg font-black text-yellow-400 font-mono">
                      {userProfile.bestScore ? `${userProfile.bestScore} ms` : 'N/A'}
                    </div>
                    <div className="text-[9px] text-slate-400">Classic Best</div>
                  </div>

                  {/* VS Divider badge */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-xl border border-yellow-400 z-10">
                    VS
                  </div>

                  {/* FRIEND */}
                  <div className="bg-[#020b1c] border border-red-500/40 rounded-2xl p-3 text-center space-y-1">
                    <div className="text-2xl">{compareFriend.avatar}</div>
                    <div className="font-extrabold text-xs text-white truncate">{compareFriend.username}</div>
                    <div className="text-lg font-black text-white font-mono">
                      {compareFriend.bestScore} ms
                    </div>
                    <div className="text-[9px] text-slate-400">Classic Best</div>
                  </div>
                </div>

                {/* Overall Verdict Banner */}
                <div className="bg-[#020b1c] p-2.5 rounded-2xl border border-[#12284c] text-center flex items-center justify-center gap-2">
                  {userWinsCount > friendWinsCount ? (
                    <>
                      <Trophy className="w-4 h-4 text-yellow-400" />
                      <span className="text-xs font-extrabold text-yellow-300">
                        You lead head-to-head by {userWinsCount - friendWinsCount} mode(s)!
                      </span>
                    </>
                  ) : userWinsCount < friendWinsCount ? (
                    <>
                      <TrendingUp className="w-4 h-4 text-red-400" />
                      <span className="text-xs font-extrabold text-red-300">
                        @{compareFriend.username} leads head-to-head by {friendWinsCount - userWinsCount} mode(s)!
                      </span>
                    </>
                  ) : (
                    <span className="text-xs font-extrabold text-slate-300">
                      Dead Heat! You and @{compareFriend.username} are tied!
                    </span>
                  )}
                </div>
              </div>

              {/* Detailed Game Modes Comparison Matrix */}
              <div className="bg-[#00122e] border border-[#12284c] rounded-3xl p-3.5 space-y-2.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center justify-between">
                  <span>Reaction Speed By Mode</span>
                  <span className="text-[10px] font-normal text-slate-400">Lower ms = Faster</span>
                </h3>

                <div className="space-y-2">
                  {GAME_MODES_LIST.map((mode) => {
                    const userVal = getUserModeScore(mode.id);
                    const friendVal = compareFriend.modeScores?.[mode.id] ?? compareFriend.bestScore + 20;

                    const isUserFaster = userVal < friendVal;
                    const isTie = userVal === friendVal;
                    const diffMs = Math.abs(userVal - friendVal);

                    return (
                      <div
                        key={mode.id}
                        className="bg-[#020b1c] border border-[#12284c] rounded-2xl p-2.5 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-200">{mode.label}</span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            isUserFaster ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/30' :
                            isTie ? 'bg-[#00122e] text-slate-300 border border-[#12284c]' :
                            'bg-red-500/20 text-red-300 border border-red-500/30'
                          }`}>
                            {isUserFaster ? `You (+${diffMs}ms faster)` :
                             isTie ? 'Tied' :
                             `@${compareFriend.username} (+${diffMs}ms faster)`}
                          </span>
                        </div>

                        {/* Visual comparison bar */}
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                          <div className={`p-1.5 rounded-xl border text-center ${
                            isUserFaster 
                              ? 'bg-yellow-400/10 border-yellow-400/40 text-yellow-300 font-extrabold'
                              : 'bg-[#00122e] border-[#12284c] text-slate-400'
                          }`}>
                            <span className="text-[9px] block text-slate-400 font-sans">You</span>
                            {userVal} ms
                          </div>

                          <div className={`p-1.5 rounded-xl border text-center ${
                            !isUserFaster && !isTie
                              ? 'bg-red-500/10 border-red-500/40 text-red-300 font-extrabold'
                              : 'bg-[#00122e] border-[#12284c] text-slate-400'
                          }`}>
                            <span className="text-[9px] block text-slate-400 font-sans">{compareFriend.username}</span>
                            {friendVal} ms
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Challenge Button */}
              <button
                onClick={() => {
                  playSuccess();
                  if (onStartDuelWithFriend) {
                    onStartDuelWithFriend(compareFriend.username);
                  }
                }}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl hover:brightness-110 active:scale-98 transition-all border border-yellow-300"
              >
                <Swords className="w-4 h-4 fill-slate-950" />
                <span>Challenge @{compareFriend.username} to 1v1 Duel Now</span>
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* 3. ADD FRIEND SUB-TAB */}
      {activeSubTab === 'ADD' && (
        <div className="space-y-4">
          {/* Custom Username Input Form */}
          <div className="bg-[#00122e] border border-[#12284c] rounded-3xl p-4 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-yellow-400 flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Add Friend by Username
            </h3>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">@</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddFriendByUsername(searchQuery);
                  }}
                  placeholder="enter_exact_username..."
                  className="w-full bg-[#020b1c] border border-[#12284c] rounded-2xl pl-7 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-mono"
                />
              </div>

              <button
                onClick={() => handleAddFriendByUsername(searchQuery)}
                className="px-4 py-2.5 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs transition-all active:scale-95 shadow-md shrink-0 flex items-center gap-1 border border-yellow-300"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Quick Suggested Athletes */}
          <div className="bg-[#00122e] border border-[#12284c] rounded-3xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                Suggested Global Reaction Athletes
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTED_ATHLETES.map((athlete) => {
                const isAlreadyFriend = friends.some(f => f.username === athlete.username);

                return (
                  <div
                    key={athlete.username}
                    className="bg-[#020b1c] border border-[#12284c] rounded-2xl p-3 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className="text-xl leading-none">{athlete.avatar}</span>
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-1">
                          <span className="font-extrabold text-xs text-white truncate">{athlete.username}</span>
                          <span className="text-xs">{getCountryFlag(athlete.country)}</span>
                        </div>
                        <span className="text-[10px] text-yellow-400 font-mono font-bold block">
                          {athlete.bestScore} ms
                        </span>
                      </div>
                    </div>

                    <button
                      disabled={isAlreadyFriend}
                      onClick={() => handleAddFriendByUsername(athlete.username, athlete.country, athlete.avatar, athlete.bestScore)}
                      className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1 transition-all shrink-0 ${
                        isAlreadyFriend
                          ? 'bg-[#00122e] text-slate-500 cursor-not-allowed border border-[#12284c]'
                          : 'bg-red-600 hover:bg-red-500 text-white shadow-md active:scale-95 border border-yellow-400/40'
                      }`}
                    >
                      {isAlreadyFriend ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3 text-yellow-400" />
                          <span>Add</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* FRIEND PROFILE MODAL */}
      {selectedFriendForModal && (
        <div className="fixed inset-0 z-50 bg-[#020b1c]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#00122e] border border-red-500/40 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl relative animate-in fade-in zoom-in duration-150">
            <button
              onClick={() => setSelectedFriendForModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-[#020b1c] border border-[#12284c] text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Friend Header */}
            <div className="text-center space-y-2 pt-2">
              <div className="w-16 h-16 rounded-3xl bg-[#020b1c] border-2 border-yellow-400/50 flex items-center justify-center text-3xl mx-auto shadow-xl relative">
                {selectedFriendForModal.avatar}
                <span className="absolute -bottom-1 -right-1 text-sm">
                  {getCountryFlag(selectedFriendForModal.country)}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-center gap-1.5">
                  <h2 className="text-lg font-black text-white">{selectedFriendForModal.username}</h2>
                  {selectedFriendForModal.verifiedAthlete && (
                    <ShieldCheck className="w-4 h-4 text-yellow-400" title="Verified Athlete" />
                  )}
                </div>
                <p className="text-xs text-slate-300">
                  {getPercentileRating(selectedFriendForModal.bestScore).rating}
                </p>
              </div>
            </div>

            {/* Friend Stats Breakdown */}
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-[#020b1c] p-2.5 rounded-2xl border border-[#12284c]">
                <span className="text-[10px] text-slate-400 block">Classic Best</span>
                <span className="font-extrabold text-yellow-400 font-mono text-base">
                  {selectedFriendForModal.bestScore} ms
                </span>
              </div>

              <div className="bg-[#020b1c] p-2.5 rounded-2xl border border-[#12284c]">
                <span className="text-[10px] text-slate-400 block">Daily Streak</span>
                <span className="font-extrabold text-red-500 font-mono text-base flex items-center justify-center gap-1">
                  <Flame className="w-4 h-4 fill-red-500" />
                  {selectedFriendForModal.streakDays}d
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  setSelectedFriendForModal(null);
                  setSelectedCompareFriendId(selectedFriendForModal.id);
                  setActiveSubTab('COMPARE');
                }}
                className="w-full py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md border border-yellow-400/40"
              >
                <BarChart3 className="w-4 h-4 text-yellow-400" />
                <span>Compare Personal Bests</span>
              </button>

              <button
                onClick={() => {
                  const name = selectedFriendForModal.username;
                  setSelectedFriendForModal(null);
                  if (onStartDuelWithFriend) {
                    onStartDuelWithFriend(name);
                  }
                }}
                className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-yellow-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md border border-yellow-300"
              >
                <Swords className="w-4 h-4 fill-slate-950" />
                <span>Challenge to 1v1 Duel</span>
              </button>

              <button
                onClick={() => handleRemoveFriend(selectedFriendForModal.id, selectedFriendForModal.username)}
                className="w-full py-2 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Friend</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
