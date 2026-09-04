import React, { useMemo, useState } from 'react';
import { ChevronRight, Edit3, FileText, Lock, LogIn, Trash2, X } from 'lucide-react';
import { CountryStanding, UserProfile } from '../types';
import {
  AVATARS,
  getCountryFlag,
  getCountryName,
  getPercentileRating,
  WORLD_REFERENCE_AVG_MS,
} from '../utils/countries';
import { useHapticSound } from '../hooks/useHapticSound';
import { haptic } from '../services/native';
import { AccountDeletionModal } from './AccountDeletionModal';
import { LegalModal } from './LegalModal';
import { ComparisonRow, RowButton } from './profile/ProfileRows';
import { buildBadges, SOUND_PRESETS } from './profile/profileData';
import {
  Button,
  Divider,
  Flag,
  Label,
  Panel,
  Screen,
  Segmented,
  StatTile,
  cx,
} from './ui/Primitives';

interface ProfileViewProps {
  profile: UserProfile;
  standing: CountryStanding | null;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  openAuthModal: () => void;
  openMonetizationModal: () => void;
  onDeleteAccount?: () => void;
}


export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  standing,
  onUpdateProfile,
  openAuthModal,
  openMonetizationModal,
  onDeleteAccount,
}) => {
  const [tab, setTab] = useState<'STATS' | 'BADGES' | 'SOUND'>('STATS');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.username);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<'PRIVACY' | 'TERMS' | 'EULA' | null>(null);

  const { playHapticSound } = useHapticSound({ enabled: true, volume: 0.3 });

  const history = profile.history || [];
  const best = profile.bestScore || 0;
  const average = useMemo(
    () =>
      history.length
        ? Math.round(history.reduce((sum, run) => sum + run.scoreMs, 0) / history.length)
        : 0,
    [history]
  );
  const tier = best ? getPercentileRating(best) : null;

  const badges = useMemo(() => buildBadges(profile, standing), [profile, standing]);

  const unlockedCount = badges.filter((b) => b.unlocked).length;


  const saveEdits = () => {
    // Nation is deliberately absent: it is immutable after onboarding and the
    // database rejects a change, so sending it would only produce a failed write.
    onUpdateProfile({
      username: name.trim() || 'Athlete',
      avatar,
    });
    setEditing(false);
    haptic.success();
  };

  return (
    <Screen className="bg-pitch-900">
      <div className="space-y-5 px-4 py-5 pb-10">
        {/* Identity ------------------------------------------------------- */}
        <Panel className="p-4">
          {editing ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label as="h2">Edit profile</Label>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  aria-label="Cancel"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-ink-faint hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div>
                <Label as="div" className="mb-1.5">
                  Emblem
                </Label>
                <div className="grid grid-cols-8 gap-1.5">
                  {AVATARS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setAvatar(emoji)}
                      className={cx(
                        'flex aspect-square items-center justify-center rounded-md border text-lg',
                        avatar === emoji
                          ? 'border-signal bg-signal/10'
                          : 'border-pitch-700 bg-pitch-800'
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label as="div" className="mb-1.5">
                  Name
                </Label>
                <input
                  type="text"
                  value={name}
                  maxLength={20}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 w-full rounded-md border border-pitch-700 bg-pitch-800 px-3 text-sm font-semibold text-ink focus:border-signal/50 focus:outline-none"
                />
              </div>

              {/* Nation is fixed once chosen, so the editor states it rather
                  than offering a picker that the database would reject. */}
              <div>
                <Label as="div" className="mb-1.5">
                  Nation
                </Label>
                <div className="flex items-center gap-3 rounded-md border border-pitch-700 bg-pitch-800 px-3 py-2.5">
                  <Flag
                    code={profile.country}
                    emoji={getCountryFlag(profile.country)}
                    className="text-xl"
                  />
                  <span className="flex-1 text-sm font-semibold text-ink">
                    {getCountryName(profile.country)}
                  </span>
                  <Lock className="h-3.5 w-3.5 text-ink-faint" />
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">
                  Your nation is set once and cannot be changed. The world table is
                  one average per country, so athletes moving between them would
                  let anyone choose which nation their time counts for. Deleting
                  your account lets you start again.
                </p>
              </div>

              <Button variant="signal" full onClick={saveEdits}>
                Save
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-4xl leading-none">{profile.avatar}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="font-display text-2xl font-bold uppercase leading-none tracking-tight text-ink">
                        {profile.username}
                      </h1>
                      {profile.proPassActive && (
                        <span className="rounded-xs border border-gold/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-gold">
                          Pro
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-muted">
                      <Flag
                        code={profile.country}
                        emoji={getCountryFlag(profile.country)}
                        className="text-sm"
                      />
                      {getCountryName(profile.country)}
                      {standing?.rank && (
                        <span className="text-ink-faint">· world #{standing.rank}</span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  aria-label="Edit profile"
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-pitch-700 text-ink-muted transition-colors hover:text-ink"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
              </div>

              {!profile.isLoggedIn && (
                <>
                  <Divider className="my-4" />
                  <button
                    type="button"
                    onClick={openAuthModal}
                    className="flex w-full items-center gap-3 text-left"
                  >
                    <LogIn className="h-4 w-4 shrink-0 text-ink-muted" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-ink">
                        Sign in to keep your times
                      </div>
                      <div className="text-[11px] text-ink-faint">
                        Guest scores live on this device only
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" />
                  </button>
                </>
              )}
            </>
          )}
        </Panel>

        {/* Tabs ----------------------------------------------------------- */}
        <Segmented
          options={[
            { value: 'STATS', label: 'Stats' },
            { value: 'BADGES', label: `Badges ${unlockedCount}/${badges.length}` },
            { value: 'SOUND', label: 'Sound' },
          ]}
          value={tab}
          onChange={setTab}
          className="w-full [&>button]:flex-1"
        />

        {tab === 'STATS' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <StatTile
                label="Personal best"
                value={best || '—'}
                unit={best ? 'ms' : undefined}
                accent={best ? 'signal' : 'default'}
                hint={tier ? tier.rating : 'No runs yet'}
              />
              <StatTile
                label="Your average"
                value={average || '—'}
                unit={average ? 'ms' : undefined}
                hint={`${history.length} recorded ${history.length === 1 ? 'run' : 'runs'}`}
              />
              <StatTile label="Runs" value={profile.testsCompleted} />
              <StatTile
                label="Streak"
                value={profile.streakDays}
                unit="d"
                accent={profile.streakDays > 0 ? 'gold' : 'default'}
              />
            </div>

            <Panel className="p-4">
              <Label as="h2">How you compare</Label>
              <div className="mt-3 space-y-3">
                <ComparisonRow label="You" valueMs={best} tone="signal" />
                {standing?.qualified && (
                  <ComparisonRow
                    label={getCountryName(standing.code)}
                    valueMs={standing.avgMs}
                    tone="ink"
                  />
                )}
                <ComparisonRow
                  label="World reference"
                  valueMs={WORLD_REFERENCE_AVG_MS}
                  tone="muted"
                  note="published benchmark"
                />
              </div>
            </Panel>

            {history.length > 0 && (
              <Panel className="p-4">
                <Label as="h2">Recent runs</Label>
                <div className="mt-3 space-y-1.5">
                  {history.slice(0, 8).map((run) => (
                    <div
                      key={run.id}
                      className="flex items-center justify-between border-b border-pitch-700/60 pb-1.5 last:border-0"
                    >
                      <span className="text-[11px] uppercase tracking-wider text-ink-faint">
                        {run.mode.replace(/_/g, ' ')}
                      </span>
                      <span className="font-display text-base font-bold text-ink">
                        {run.scoreMs}
                        <span className="text-[10px] text-ink-faint">ms</span>
                      </span>
                    </div>
                  ))}
                </div>
              </Panel>
            )}
          </div>
        )}

        {tab === 'BADGES' && (
          <div className="grid grid-cols-2 gap-2">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className={cx(
                  'rounded-md border p-3',
                  badge.unlocked
                    ? 'border-gold/30 bg-pitch-850'
                    : 'border-pitch-700 bg-pitch-850/50'
                )}
              >
                <div className={cx('text-2xl', !badge.unlocked && 'opacity-25 grayscale')}>
                  {badge.unlocked ? badge.icon : <Lock className="h-5 w-5 text-ink-faint" />}
                </div>
                <div
                  className={cx(
                    'mt-2 text-[13px] font-semibold',
                    badge.unlocked ? 'text-ink' : 'text-ink-faint'
                  )}
                >
                  {badge.name}
                </div>
                <div className="mt-0.5 text-[11px] leading-snug text-ink-faint">
                  {badge.desc}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'SOUND' && (
          <Panel className="p-4">
            <Label as="h2">Feedback presets</Label>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-faint">
              Tap to preview. On a phone each preset also fires the matching haptic.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {SOUND_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    playHapticSound(preset.id);
                    haptic.light();
                  }}
                  className="rounded-md border border-pitch-700 bg-pitch-800 px-3 py-2.5 text-left text-[13px] font-medium text-ink transition-colors hover:border-pitch-600"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </Panel>
        )}

        {/* Account -------------------------------------------------------- */}
        <div>
          <Label as="h2" className="mb-2 block">
            Account
          </Label>
          <Panel className="divide-y divide-pitch-700">
            {!profile.proPassActive && (
              <RowButton label="WREACT Pro" hint="Unlimited duels, full telemetry" onClick={openMonetizationModal} />
            )}
            {profile.isLoggedIn && <RowButton label="Manage sign-in" onClick={openAuthModal} />}
            <RowButton
              label="Privacy policy"
              icon={<FileText className="h-3.5 w-3.5" />}
              onClick={() => setLegalTab('PRIVACY')}
            />
            <RowButton
              label="Terms of use"
              icon={<FileText className="h-3.5 w-3.5" />}
              onClick={() => setLegalTab('TERMS')}
            />
            {onDeleteAccount && (
              <RowButton
                label="Delete account and data"
                icon={<Trash2 className="h-3.5 w-3.5" />}
                destructive
                onClick={() => setIsDeleteOpen(true)}
              />
            )}
          </Panel>
        </div>
      </div>

      {onDeleteAccount && (
        <AccountDeletionModal
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          onConfirmDelete={onDeleteAccount}
          username={profile.username}
        />
      )}

      <LegalModal
        isOpen={legalTab !== null}
        onClose={() => setLegalTab(null)}
        initialTab={legalTab ?? 'PRIVACY'}
      />
    </Screen>
  );
};
