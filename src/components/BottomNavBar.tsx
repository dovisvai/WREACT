import React from 'react';
import { Zap, Trophy, Users, Flame, Swords, User } from 'lucide-react';
import { useHapticSound } from '../hooks/useHapticSound';

export type TabType = 'PLAY' | 'LEADERBOARD' | 'FRIENDS' | 'DAILY' | 'DUEL' | 'PROFILE';

interface BottomNavBarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  streakDays: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  setActiveTab,
  streakDays,
}) => {
  const { playTap } = useHapticSound({ volume: 0.2 });

  const tabs = [
    { id: 'PLAY' as TabType, label: 'Test', icon: Zap, activeColor: 'text-yellow-400 bg-yellow-400/15 border border-yellow-400/30' },
    { id: 'LEADERBOARD' as TabType, label: 'Ranks', icon: Trophy, activeColor: 'text-red-500 bg-red-600/15 border border-red-500/30' },
    { id: 'FRIENDS' as TabType, label: 'Friends', icon: Users, activeColor: 'text-yellow-400 bg-yellow-400/15 border border-yellow-400/30' },
    { id: 'DAILY' as TabType, label: 'Daily', icon: Flame, badge: `${streakDays}d`, activeColor: 'text-red-500 bg-red-600/15 border border-red-500/30' },
    { id: 'DUEL' as TabType, label: '1v1', icon: Swords, activeColor: 'text-yellow-400 bg-yellow-400/15 border border-yellow-400/30' },
    { id: 'PROFILE' as TabType, label: 'Profile', icon: User, activeColor: 'text-red-500 bg-red-600/15 border border-red-500/30' },
  ];

  return (
    <div className="bg-[#00122e]/95 backdrop-blur-xl border-t border-[#12284c] px-2 py-2 select-none sticky bottom-0 z-30">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                playTap();
                setActiveTab(tab.id);
              }}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all duration-200 relative group active:scale-95 ${
                isActive ? 'text-white font-extrabold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${isActive ? tab.activeColor : ''}`}>
                <div className="relative">
                  <Icon className={`w-4 h-4 ${isActive ? 'scale-110 transition-transform text-current' : 'text-current'}`} />
                  {tab.badge && (
                    <span className="absolute -top-2 -right-3 text-[9px] font-black bg-red-600 text-white border border-yellow-400/50 px-1 py-0.2 rounded-full shadow-sm">
                      {tab.badge}
                    </span>
                  )}
                </div>
              </div>
              <span className={`text-[10px] tracking-tight mt-0.5 ${isActive ? 'text-white font-black' : 'text-slate-400 font-semibold'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
