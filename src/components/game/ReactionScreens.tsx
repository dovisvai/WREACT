import React from 'react';
import { RotateCcw, Share2 } from 'lucide-react';
import { ChallengeInvite, CountryStanding, GameMode, PlayerContribution } from '../../types';
import { getCountryFlag, getCountryName, getPercentileRating } from '../../utils/countries';
import { rankAgainstNations } from '../../utils/standings';
import { RANKED_MODE, isRankedMode } from '../../utils/matchday';
import { Button, Flag, Label, cx } from '../ui/Primitives';

/* -------------------------------------------------------------------------- */

export const IdleScreen: React.FC<{
  title: string;
  brief: string;
  personalBest: number | null;
  /** Present only for the daily event: the time to beat to rank today. */
  dailyTargetMs?: number | null;
  challenge: ChallengeInvite | null;
  onStart: () => void;
  /** True while today's event is still loading and its mode is unknown. */
  disabled?: boolean;
}> = ({ title, brief, personalBest, dailyTargetMs, challenge, onStart, disabled }) => (
  <div className="w-full max-w-sm text-center">
    {challenge && (
      <div className="mb-6 rounded-md border border-signal/30 bg-signal/10 p-4">
        <Label className="text-signal">Head to head</Label>
        <div className="mt-1.5 text-sm font-semibold text-ink">
          {challenge.username}{' '}
          <Flag code={challenge.country} emoji={getCountryFlag(challenge.country)} /> set{' '}
          <span className="font-display text-lg font-bold text-signal">
            {challenge.scoreMs}ms
          </span>
        </div>
      </div>
    )}

    <h2 className="font-display text-4xl font-extrabold uppercase leading-none tracking-tight text-ink">
      {title}
    </h2>
    <p className="mx-auto mt-3 max-w-[17rem] text-sm leading-relaxed text-ink-muted">{brief}</p>

    <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
      {personalBest && (
        <div className="inline-flex items-baseline gap-2 rounded-md border border-pitch-700 bg-pitch-850 px-3 py-1.5">
          <Label>Your best</Label>
          <span className="font-display text-lg font-bold text-ink">
            {personalBest}
            <span className="text-xs text-ink-faint">ms</span>
          </span>
        </div>
      )}

      {dailyTargetMs ? (
        <div className="inline-flex items-baseline gap-2 rounded-md border border-gold/30 bg-gold/10 px-3 py-1.5">
          <Label className="text-gold">Target</Label>
          <span className="font-display text-lg font-bold text-gold">
            {dailyTargetMs}
            <span className="text-xs opacity-70">ms</span>
          </span>
        </div>
      ) : null}
    </div>

    <Button
      variant="signal"
      size="lg"
      full
      className="mt-8"
      onClick={onStart}
      disabled={disabled}
    >
      {disabled ? 'Loading…' : 'Start'}
    </Button>
  </div>
);

/* -------------------------------------------------------------------------- */

export const ResultScreen: React.FC<{
  reactionTime: number;
  mode: GameMode;
  country: string;
  username: string;
  personalBest: number | null;
  contribution: PlayerContribution | null;
  standings: CountryStanding[];
  challenge: ChallengeInvite | null;
  onRetry: () => void;
  onShare: () => void;
}> = ({
  reactionTime,
  mode,
  country,
  personalBest,
  contribution,
  standings,
  challenge,
  onRetry,
  onShare,
}) => {
  const tier = getPercentileRating(reactionTime);
  const nations = rankAgainstNations(standings, reactionTime);
  const isBest = personalBest === reactionTime;
  const beatChallenge = challenge ? reactionTime < challenge.scoreMs : null;

  return (
    <div className="w-full max-w-sm">
      <div className="text-center">
        <Label>Reaction time</Label>
        <div className="animate-count-pop mt-1 font-display text-8xl font-extrabold leading-none tracking-tight text-signal">
          {reactionTime}
          <span className="ml-1 font-display text-2xl font-bold text-ink-faint">ms</span>
        </div>
        <div className={cx('mt-2 text-sm font-semibold', tier.color)}>
          {tier.icon} {tier.rating}
          {isBest && <span className="ml-2 text-gold">· Personal best</span>}
        </div>
      </div>

      {/* Head-to-head verdict, when this run answered a challenge. */}
      {challenge && (
        <div
          className={cx(
            'mt-5 rounded-md border p-3 text-center',
            beatChallenge ? 'border-signal/40 bg-signal/10' : 'border-pitch-700 bg-pitch-850'
          )}
        >
          <div className="font-display text-xl font-bold uppercase tracking-tight text-ink">
            {beatChallenge ? 'You win' : 'They hold'}
          </div>
          <div className="mt-0.5 text-[11px] text-ink-muted">
            {challenge.username}{' '}
            <Flag code={challenge.country} emoji={getCountryFlag(challenge.country)} /> ·{' '}
            {challenge.scoreMs}ms ·{' '}
            {Math.abs(reactionTime - challenge.scoreMs)}ms{' '}
            {beatChallenge ? 'faster' : 'behind'}
          </div>
        </div>
      )}

      {/* The national contribution — why a solo test matters here. */}
      {contribution && (
        <div className="mt-5 rounded-md border border-pitch-700 bg-pitch-850 p-4">
          <div className="flex items-center justify-between">
            <Label>Your nation</Label>
            <Flag code={country} emoji={getCountryFlag(country)} className="text-lg" />
          </div>

          {contribution.msImprovement > 0 ? (
            <>
              <div className="mt-2 font-display text-2xl font-bold leading-none text-signal">
                ▲ {contribution.msImprovement.toFixed(2)}ms faster
              </div>
              <p className="mt-1.5 text-[11px] text-ink-faint">
                {contribution.countryName} now averages {contribution.newCountryAvgMs}ms
                {contribution.isFirstScore && ' — and you are on the board'}
              </p>
            </>
          ) : (
            <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">
              Your personal best still stands at {personalBest}ms, so{' '}
              {contribution.countryName}'s average is unchanged. Beat your own best to move
              it.
            </p>
          )}

          {!contribution.qualified && contribution.athletesNeeded > 0 && (
            <p className="mt-2 border-t border-pitch-700 pt-2 text-[11px] text-ink-faint">
              {contribution.countryName} needs {contribution.athletesNeeded} more{' '}
              {contribution.athletesNeeded === 1 ? 'athlete' : 'athletes'} to enter the world
              standings.
            </p>
          )}
        </div>
      )}

      {/* Practice modes are honest about not counting. */}
      {!isRankedMode(mode) && (
        <div className="mt-5 rounded-md border border-pitch-700 bg-pitch-850 p-3">
          <p className="text-[12px] leading-relaxed text-ink-muted">
            Practice mode — this time is on your athlete record but does not affect{' '}
            {getCountryName(country)}'s average. Only{' '}
            <span className="font-semibold text-ink">{RANKED_MODE.toLowerCase()}</span> runs
            count toward the standings.
          </p>
        </div>
      )}

      {isRankedMode(mode) && nations.total > 0 && (
        <p className="mt-3 text-center text-[11px] text-ink-faint">
          This time beats the national average of{' '}
          <span className="font-semibold text-ink-muted">{nations.beats}</span> of{' '}
          {nations.total} ranked countries
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button variant="quiet" onClick={onRetry}>
          <RotateCcw className="h-4 w-4" /> Again
        </Button>
        <Button variant="signal" onClick={onShare}>
          <Share2 className="h-4 w-4" /> Share
        </Button>
      </div>
    </div>
  );
};
