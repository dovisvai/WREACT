import { CountryStanding, UserProfile } from '../../types';
import { getCountryName } from '../../utils/countries';
import { HapticSoundPreset } from '../../hooks/useHapticSound';

export const SOUND_PRESETS: { id: HapticSoundPreset; label: string }[] = [
  { id: 'tap', label: 'Light tap' },
  { id: 'pop', label: 'Pop' },
  { id: 'snap', label: 'Snap' },
  { id: 'tick', label: 'Tick' },
  { id: 'heavy', label: 'Thump' },
  { id: 'success', label: 'Chime' },
  { id: 'error', label: 'Buzz' },
];

export interface Badge {
  id: string;
  name: string;
  icon: string;
  desc: string;
  unlocked: boolean;
}

/**
 * Achievement set, derived from the profile and the player's national standing.
 *
 * "National best" is deliberately tied to live standings rather than a stored
 * flag, so it is lost the moment a countryman goes faster — which is the point.
 */
export function buildBadges(
  profile: UserProfile,
  standing: CountryStanding | null
): Badge[] {
  const best = profile.bestScore || 0;

  return [
    {
      id: 'sub150',
      name: 'Sub-150',
      icon: '⚡',
      desc: 'React in under 150ms',
      unlocked: best > 0 && best <= 150,
    },
    {
      id: 'sub200',
      name: 'F1 reflexes',
      icon: '🏎️',
      desc: 'Reach Formula 1 driver speed',
      unlocked: best > 0 && best <= 200,
    },
    {
      id: 'streak3',
      name: '3-day streak',
      icon: '🔥',
      desc: 'Three daily challenges in a row',
      unlocked: profile.streakDays >= 3,
    },
    {
      id: 'tests10',
      name: 'Ten runs',
      icon: '🎯',
      desc: 'Complete ten reaction tests',
      unlocked: profile.testsCompleted >= 10,
    },
    {
      id: 'national',
      name: 'National best',
      icon: '👑',
      desc: `Hold the fastest time in ${getCountryName(profile.country)}`,
      unlocked: Boolean(standing && best > 0 && best <= standing.bestMs),
    },
    {
      id: 'verified',
      name: 'Verified',
      icon: '🛡️',
      desc: 'Sign in to sync across devices',
      unlocked: Boolean(profile.isLoggedIn),
    },
  ];
}
