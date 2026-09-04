import React from 'react';
import { X } from 'lucide-react';
import { ChallengeInvite } from '../types';
import { getCountryFlag } from '../utils/countries';
import { Button, Flag } from './ui/Primitives';

interface ChallengeBannerProps {
  invite: ChallengeInvite;
  onAccept: () => void;
  onDismiss: () => void;
}

/**
 * Shown when the app is opened from a shared "beat my time" link.
 *
 * This is the receiving half of the viral loop: a cold visitor arrives already
 * inside a contest, with a specific number to beat and a named opponent, before
 * they have an account or have seen a menu.
 */
export const ChallengeBanner: React.FC<ChallengeBannerProps> = ({
  invite,
  onAccept,
  onDismiss,
}) => (
  <div className="shrink-0 border-b border-signal/30 bg-signal/10">
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="text-xl leading-none">{invite.avatar}</span>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-ink">
          {invite.username} <Flag code={invite.country} emoji={getCountryFlag(invite.country)} /> challenged you
        </div>
        <div className="text-[11px] text-ink-muted">
          Beat{' '}
          <span className="font-bold tabular-nums text-signal">{invite.scoreMs}ms</span> in{' '}
          {invite.mode.replace(/_/g, ' ').toLowerCase()}
        </div>
      </div>

      <Button variant="signal" size="sm" onClick={onAccept}>
        Accept
      </Button>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss challenge"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-pitch-800 hover:text-ink"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
);
