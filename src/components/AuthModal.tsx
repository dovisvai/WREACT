import React, { useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { X, ShieldCheck, Cloud, Pencil } from 'lucide-react';
import { getCountryFlag, getCountryName } from '../utils/countries';
import { Button, Label } from './ui/Primitives';

/**
 * Athlete identity.
 *
 * This screen used to present a Google sign-in that signed nobody in: a 1.2s
 * timer that fabricated a session, defaulted to a hardcoded address, awarded
 * the Verified badge for nothing, and used a stock photograph of a real person
 * as the avatar — all behind Google's branding. Beyond being a Play policy
 * violation, it misrepresented what the app does with the player's data.
 *
 * What actually happens is simpler and worth saying plainly: every device signs
 * in anonymously at boot, and scores are already saved to the cloud under that
 * identity. There is no account to create. The one thing a player genuinely
 * controls here is the name that appears beside their times.
 *
 * Real Google sign-in needs a native credential plugin and Firebase console
 * configuration; when that lands it belongs here, alongside this.
 */

const MAX_NAME = 30;

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  onSaveName: (username: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onSaveName,
}) => {
  const [name, setName] = useState(userProfile.username || '');

  // The modal stays mounted and returns null when closed, so the initial state
  // would otherwise be whatever the username was at app boot — silently
  // reverting a rename made during onboarding or in the profile.
  useEffect(() => {
    if (isOpen) setName(userProfile.username || '');
  }, [isOpen, userProfile.username]);

  if (!isOpen) return null;

  const trimmed = name.trim().slice(0, MAX_NAME);
  const canSave = trimmed.length > 0 && trimmed !== userProfile.username;

  const save = () => {
    if (!canSave) return;
    onSaveName(trimmed);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pitch-900/85 p-4 backdrop-blur-md">
      <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-3xl border border-pitch-700 bg-pitch-850 text-ink shadow-2xl">
        <div className="flex items-center justify-between border-b border-pitch-700 bg-pitch-900 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-pitch-700 bg-signal/20 p-1.5 text-signal">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h2 className="font-display text-sm font-black tracking-tight text-ink">
              Athlete identity
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-pitch-800 hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="flex items-center gap-3 rounded-xl border border-pitch-700 bg-pitch-800 p-3.5">
            <Cloud className="h-5 w-5 shrink-0 text-signal" />
            <p className="text-[12px] leading-relaxed text-ink-muted">
              Your times are already saved to the cloud on this device&apos;s anonymous
              account — there is nothing to sign up for. Reinstalling or switching
              phone starts a new account, so your history stays with this device.
            </p>
          </div>

          <div>
            <Label>Display name</Label>
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-pitch-700 bg-pitch-800 px-3">
              <Pencil className="h-4 w-4 shrink-0 text-ink-faint" />
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, MAX_NAME))}
                onKeyDown={(e) => e.key === 'Enter' && save()}
                maxLength={MAX_NAME}
                placeholder="Your name on the leaderboard"
                aria-label="Display name"
                className="min-w-0 flex-1 bg-transparent py-3 text-sm font-semibold text-ink outline-none placeholder:text-ink-faint"
              />
              <span className="shrink-0 text-[11px] tabular-nums text-ink-faint">
                {trimmed.length}/{MAX_NAME}
              </span>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-faint">
              <span aria-hidden>{getCountryFlag(userProfile.country)}</span>
              Competing for {getCountryName(userProfile.country)}. Your nation is fixed
              once chosen.
            </p>
          </div>

          <Button variant="signal" full onClick={save} disabled={!canSave}>
            Save name
          </Button>
        </div>
      </div>
    </div>
  );
};
