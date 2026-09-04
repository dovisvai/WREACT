import React from 'react';
import { Share2 } from 'lucide-react';
import { CountryStanding } from '../types';
import { MatchdayClock, formatRemaining } from '../utils/matchday';
import { getCountryName } from '../utils/countries';
import { Button, Label, cx } from './ui/Primitives';

interface MatchdayBarProps {
  clock: MatchdayClock;
  /** The viewer's nation, for the rival line. */
  userStanding?: CountryStanding;
  /** The nation directly ahead of them in the table. */
  rivalAhead?: CountryStanding;
  onRecruit: () => void;
  recruitSent?: boolean;
}

/**
 * The season clock, and the single most important sentence in the product:
 * how far your nation is behind the one above it, with a deadline attached.
 *
 * A national average with no end date is a statistic. A national average with
 * six hours left and a rival 0.4ms ahead is a reason to go and find people.
 */
export const MatchdayBar: React.FC<MatchdayBarProps> = ({
  clock,
  userStanding,
  rivalAhead,
  onRecruit,
  recruitSent,
}) => {
  const { matchday, msRemaining, isFinalHours, isFinalWhistle } = clock;

  const gapMs =
    userStanding?.qualified && rivalAhead?.qualified
      ? Math.round((userStanding.avgMs - rivalAhead.avgMs) * 100) / 100
      : null;

  return (
    <div
      className={cx(
        'border-b',
        isFinalHours ? 'border-gold/30 bg-gold/[0.06]' : 'border-pitch-700 bg-pitch-850'
      )}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <div className="min-w-0">
          <Label className={isFinalHours ? 'text-gold' : undefined}>
            Matchday {matchday.number}
          </Label>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span
              className={cx(
                'font-display text-2xl font-bold leading-none tabular-nums',
                isFinalWhistle ? 'text-alert' : isFinalHours ? 'text-gold' : 'text-ink'
              )}
            >
              {formatRemaining(msRemaining)}
            </span>
            <span className="text-[11px] text-ink-faint">
              {msRemaining <= 0 ? '' : 'to the whistle'}
            </span>
          </div>
        </div>

        {userStanding && (
          <div className="shrink-0 text-right">
            <Label>Your nation</Label>
            <div className="mt-0.5 font-display text-2xl font-bold leading-none text-ink">
              {userStanding.qualified ? `#${userStanding.rank}` : '—'}
            </div>
          </div>
        )}
      </div>

      {/* The rival line. Only shown when there is a real, closable gap. */}
      {gapMs !== null && gapMs > 0 && rivalAhead && (
        <div className="flex items-center gap-3 border-t border-pitch-700/60 px-4 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] leading-snug text-ink-muted">
              <span className="font-semibold text-ink">
                {getCountryName(userStanding!.code)}
              </span>{' '}
              is{' '}
              <span className="font-bold tabular-nums text-gold">{gapMs.toFixed(2)}ms</span>{' '}
              behind {getCountryName(rivalAhead.code)}
            </p>
          </div>

          <Button variant="quiet" size="sm" onClick={onRecruit} className="shrink-0">
            <Share2 className="h-3.5 w-3.5" />
            {recruitSent ? 'Sent' : 'Rally'}
          </Button>
        </div>
      )}
    </div>
  );
};
