import React, { useMemo, useState } from 'react';
import { Search, Check, Dices } from 'lucide-react';
import { UserProfile } from '../types';
import { AVATARS, COUNTRIES, getCountryFlag, getCountryName } from '../utils/countries';
import { playClickSound, playFanfareSound } from '../utils/audio';
import { haptic } from '../services/native';
import { Button, Flag, Label, cx } from './ui/Primitives';

interface OnboardingWizardProps {
  isOpen: boolean;
  initialProfile: UserProfile;
  onComplete: (profile: Partial<UserProfile>) => void;
}

const NAME_SUGGESTIONS = [
  'SpeedDemon',
  'ApexReflex',
  'Velocity',
  'Synapse',
  'HyperNova',
  'QuickDraw',
  'Flashpoint',
  'Trigger',
];

/**
 * Guess the player's country without asking for a permission.
 *
 * The browser locale's region subtag (en-GB, lt-LT) is right far more often
 * than it is wrong, resolves instantly, and costs no permission prompt — a GPS
 * dialog before the first run is a conversion tax this product cannot afford.
 * The player can correct it in one tap either way.
 */
function guessCountry(): string {
  const candidates = [
    ...(navigator.languages ?? []),
    navigator.language,
  ].filter(Boolean) as string[];

  for (const tag of candidates) {
    const region = tag.split('-')[1]?.toUpperCase();
    if (region && COUNTRIES.some((c) => c.code === region)) return region;
  }

  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
    const city = zone.split('/')[1]?.replace(/_/g, ' ').toLowerCase();
    const match = COUNTRIES.find((c) => c.name.toLowerCase() === city);
    if (match) return match.code;
  } catch {
    /* Intl unavailable — fall through */
  }

  return 'US';
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  isOpen,
  initialProfile,
  onComplete,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [country, setCountry] = useState<string>(
    () => initialProfile.country || guessCountry()
  );
  const [avatar, setAvatar] = useState<string>(initialProfile.avatar || '⚡');
  const [username, setUsername] = useState<string>(
    initialProfile.username === 'ReflexAthlete' ? '' : initialProfile.username
  );
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return COUNTRIES;
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(query) || c.code.toLowerCase().includes(query)
    );
  }, [search]);

  if (!isOpen) return null;

  const finish = () => {
    playFanfareSound();
    haptic.success();
    onComplete({
      country,
      avatar,
      username: username.trim() || `Athlete${Math.floor(Math.random() * 9000) + 1000}`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-pitch-900">
      {/* Progress rail */}
      <div className="pad-safe-top border-b border-pitch-700 px-5 py-4">
        <div className="flex items-center justify-between">
          <span className="font-display text-xl font-extrabold uppercase tracking-tight text-ink">
            WREACT
          </span>
          <Label>Step {step} of 2</Label>
        </div>
        <div className="mt-3 flex gap-1">
          {[1, 2].map((index) => (
            <div
              key={index}
              className={cx(
                'h-0.5 flex-1 rounded-full transition-colors',
                step >= index ? 'bg-signal' : 'bg-pitch-700'
              )}
            />
          ))}
        </div>
      </div>

      {step === 1 ? (
        <>
          <div className="shrink-0 px-5 pb-4 pt-6">
            <h1 className="font-display text-4xl font-extrabold uppercase leading-none tracking-tight text-ink">
              Pick your nation
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              Every time you post moves your country's average. Choose who you're playing
              for.
            </p>

            <div className="mt-5 flex items-center justify-between rounded-md border border-signal/30 bg-signal/5 px-4 py-3">
              <div className="flex items-center gap-3">
                <Flag code={country} emoji={getCountryFlag(country)} className="text-3xl" />
                <div>
                  <Label className="text-signal">Representing</Label>
                  <div className="font-display text-xl font-bold uppercase leading-none tracking-tight text-ink">
                    {getCountryName(country)}
                  </div>
                </div>
              </div>
              <Check className="h-5 w-5 text-signal" />
            </div>

            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search countries"
                className="h-10 w-full rounded-md border border-pitch-700 bg-pitch-850 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-pitch-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar px-5">
            <div className="grid grid-cols-2 gap-1.5 pb-4">
              {filtered.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    haptic.light();
                    setCountry(c.code);
                  }}
                  className={cx(
                    'flex items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-colors',
                    country === c.code
                      ? 'border-signal/50 bg-signal/10'
                      : 'border-pitch-700 bg-pitch-850 hover:border-pitch-600'
                  )}
                >
                  <Flag code={c.code} emoji={c.flag} className="shrink-0 text-lg" />
                  <span className="truncate text-xs font-semibold text-ink">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pad-safe-bottom shrink-0 border-t border-pitch-700 px-5 py-4">
            <Button
              variant="signal"
              size="lg"
              full
              onClick={() => {
                playClickSound();
                haptic.medium();
                setStep(2);
              }}
            >
              Continue
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-6">
            <h1 className="font-display text-4xl font-extrabold uppercase leading-none tracking-tight text-ink">
              Name on the board
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              This is how {getCountryName(country)} will see you in
              the standings.
            </p>

            <div className="mt-6">
              <Label as="div" className="mb-2">
                Emblem
              </Label>
              <div className="grid grid-cols-8 gap-1.5">
                {AVATARS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      haptic.light();
                      setAvatar(emoji);
                    }}
                    className={cx(
                      'flex aspect-square items-center justify-center rounded-md border text-xl transition-colors',
                      avatar === emoji
                        ? 'border-signal bg-signal/10'
                        : 'border-pitch-700 bg-pitch-850 hover:border-pitch-600'
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <Label>Athlete name</Label>
                <button
                  type="button"
                  onClick={() => {
                    haptic.light();
                    setUsername(
                      `${
                        NAME_SUGGESTIONS[Math.floor(Math.random() * NAME_SUGGESTIONS.length)]
                      }${Math.floor(Math.random() * 900) + 100}`
                    );
                  }}
                  className="flex items-center gap-1 text-[11px] font-semibold text-ink-muted hover:text-ink"
                >
                  <Dices className="h-3.5 w-3.5" /> Surprise me
                </button>
              </div>

              <input
                type="text"
                value={username}
                maxLength={20}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your name"
                className="h-12 w-full rounded-md border border-pitch-700 bg-pitch-850 px-4 text-base font-semibold text-ink placeholder:font-normal placeholder:text-ink-faint focus:border-signal/50 focus:outline-none"
              />

              <div className="mt-2 flex flex-wrap gap-1.5">
                {NAME_SUGGESTIONS.slice(0, 4).map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setUsername(name)}
                    className="rounded-sm border border-pitch-700 px-2 py-1 text-[11px] font-medium text-ink-muted transition-colors hover:border-pitch-600 hover:text-ink"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-md border border-pitch-700 bg-pitch-850 p-4">
              <Label>Preview</Label>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-2xl leading-none">{avatar}</span>
                <Flag code={country} emoji={getCountryFlag(country)} className="text-xl" />
                <span className="font-display text-xl font-bold uppercase tracking-tight text-ink">
                  {username.trim() || 'Your name'}
                </span>
              </div>
            </div>
          </div>

          <div className="pad-safe-bottom shrink-0 space-y-2 border-t border-pitch-700 px-5 py-4">
            <Button variant="signal" size="lg" full onClick={finish}>
              Start competing
            </Button>
            <Button variant="ghost" size="sm" full onClick={() => setStep(1)}>
              Back
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
