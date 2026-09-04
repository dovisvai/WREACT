import React from 'react';
import { Zap, Globe2, Swords, CalendarDays, User } from 'lucide-react';
import { haptic } from '../services/native';
import { cx } from './ui/Primitives';

export type TabType = 'PLAY' | 'WORLD' | 'DUEL' | 'DAILY' | 'PROFILE';

const TABS: { id: TabType; label: string; Icon: React.ElementType }[] = [
  { id: 'PLAY', label: 'Test', Icon: Zap },
  { id: 'WORLD', label: 'World', Icon: Globe2 },
  { id: 'DUEL', label: 'Duel', Icon: Swords },
  { id: 'DAILY', label: 'Daily', Icon: CalendarDays },
  { id: 'PROFILE', label: 'You', Icon: User },
];

interface BottomNavBarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  streakDays: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  setActiveTab,
  streakDays,
}) => (
  <nav className="pad-safe-bottom shrink-0 border-t border-pitch-700 bg-pitch-850">
    <div className="flex items-stretch">
      {TABS.map(({ id, label, Icon }) => {
        const isActive = activeTab === id;

        return (
          <button
            key={id}
            type="button"
            onClick={() => {
              haptic.light();
              setActiveTab(id);
            }}
            aria-current={isActive ? 'page' : undefined}
            className={cx(
              'relative flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors',
              isActive ? 'text-ink' : 'text-ink-faint hover:text-ink-muted'
            )}
          >
            {/* Active indicator sits on the top edge, like a broadcast tab rail */}
            <span
              className={cx(
                'absolute inset-x-4 top-0 h-0.5 rounded-b transition-opacity',
                isActive ? 'bg-signal opacity-100' : 'opacity-0'
              )}
            />

            <span className="relative">
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 2} />
              {id === 'DAILY' && streakDays > 0 && (
                <span className="absolute -right-2 -top-1.5 min-w-[15px] rounded-full bg-signal px-1 text-[9px] font-bold leading-[15px] text-pitch-950">
                  {streakDays}
                </span>
              )}
            </span>

            <span className="text-[10px] font-semibold uppercase tracking-wider">
              {label}
            </span>
          </button>
        );
      })}
    </div>
  </nav>
);
