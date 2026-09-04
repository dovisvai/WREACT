import React from 'react';
import { Volume2, VolumeX, Bell } from 'lucide-react';
import { getCountryFlag } from '../utils/countries';
import { haptic } from '../services/native';
import { cx, Flag, Label } from './ui/Primitives';

interface HeaderBarProps {
  audioEnabled: boolean;
  setAudioEnabled: (value: boolean) => void;
  onlineCount: number;
  openProfile: () => void;
  openNotifications: () => void;
  userAvatar: string;
  userCountry: string;
  countryRank: number | null;
  isPro: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  audioEnabled,
  setAudioEnabled,
  onlineCount,
  openProfile,
  openNotifications,
  userAvatar,
  userCountry,
  countryRank,
  isPro,
}) => (
  <header className="pad-safe-top shrink-0 border-b border-pitch-700 bg-pitch-900">
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      {/* Wordmark + the one number that frames the whole product */}
      <div className="flex items-baseline gap-2.5">
        <span className="font-display text-2xl font-extrabold uppercase leading-none tracking-tight text-ink">
          WREACT
        </span>
        {isPro && (
          <span className="rounded-xs border border-gold/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-gold">
            Pro
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {onlineCount > 0 && (
          <div className="mr-1 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-signal" />
            <span className="text-[11px] font-semibold tabular-nums text-ink-muted">
              {onlineCount.toLocaleString()}
            </span>
          </div>
        )}

        <IconButton
          label={audioEnabled ? 'Mute audio' : 'Unmute audio'}
          onClick={() => {
            haptic.light();
            setAudioEnabled(!audioEnabled);
          }}
        >
          {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </IconButton>

        <IconButton label="Notifications" onClick={openNotifications}>
          <Bell className="h-4 w-4" />
        </IconButton>

        <button
          type="button"
          onClick={openProfile}
          aria-label="Open your profile"
          className="ml-1 flex items-center gap-1.5 rounded-md border border-pitch-700 bg-pitch-850 py-1 pl-1.5 pr-2 transition-colors hover:border-pitch-600"
        >
          <span className="text-base leading-none">{userAvatar}</span>
          <Flag code={userCountry} emoji={getCountryFlag(userCountry)} className="text-base" />
          {countryRank !== null && (
            <Label className="text-ink-muted">#{countryRank}</Label>
          )}
        </button>
      </div>
    </div>
  </header>
);

const IconButton: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  className?: string;
}> = ({ children, onClick, label, className }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className={cx(
      'flex h-8 w-8 items-center justify-center rounded-md text-ink-muted',
      'transition-colors hover:bg-pitch-800 hover:text-ink active:bg-pitch-700',
      className
    )}
  >
    {children}
  </button>
);
