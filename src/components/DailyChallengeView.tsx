import React from 'react';
import { Bell, Flame } from 'lucide-react';
import { DailyChallengeInfo } from '../types';
import { getCountryFlag } from '../utils/countries';
import { MODE_LABELS, msUntilNextDaily, nextDailyMode } from '../utils/dailyChallenge';
import { formatRemaining } from '../utils/matchday';
import { Button, EmptyState, Flag, Label, Panel, Screen, StatTile } from './ui/Primitives';

interface DailyChallengeViewProps {
  dailyInfo: DailyChallengeInfo | null;
  onStartDaily: () => void;
  streakDays: number;
  /** True once today's event has been completed. */
  playedToday: boolean;
  openNotifications: () => void;
}

export const DailyChallengeView: React.FC<DailyChallengeViewProps> = ({
  dailyInfo,
  onStartDaily,
  streakDays,
  playedToday,
  openNotifications,
}) => {
  if (!dailyInfo) {
    return (
      <Screen className="bg-pitch-900">
        <EmptyState
          title="No event today"
          body="The daily event has not been published yet. Check back shortly."
        />
      </Screen>
    );
  }

  const formattedDate = new Date(dailyInfo.date).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <Screen className="bg-pitch-900">
      <div className="space-y-4 px-4 py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Label>{MODE_LABELS[dailyInfo.mode]} · today</Label>
            <h1 className="mt-1 font-display text-4xl font-extrabold uppercase leading-none tracking-tight text-ink">
              {dailyInfo.title.replace(/^[^\w]+/, '')}
            </h1>
            <p className="mt-1 text-[11px] text-ink-faint">{formattedDate}</p>
          </div>

          <button
            type="button"
            onClick={openNotifications}
            aria-label="Reminder settings"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-pitch-700 text-ink-muted transition-colors hover:text-ink"
          >
            <Bell className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm leading-relaxed text-ink-muted">{dailyInfo.description}</p>

        {streakDays > 0 && (
          <Panel className="flex items-center gap-3 p-3">
            <Flame className="h-5 w-5 shrink-0 text-gold" />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-ink">
                {streakDays}-day streak {playedToday ? 'extended' : 'alive'}
              </div>
              <div className="text-[11px] text-ink-faint">
                {playedToday
                  ? 'Come back tomorrow to make it ' + (streakDays + 1)
                  : 'Play today to keep it going'}
              </div>
            </div>
          </Panel>
        )}

        <div className="grid grid-cols-2 gap-2">
          <StatTile
            label="Target"
            value={dailyInfo.targetMs}
            unit="ms"
            accent="signal"
            hint="Beat this to rank"
          />
          <StatTile
            label="Entrants"
            value={dailyInfo.participantsCount.toLocaleString()}
            hint="Today"
          />
        </div>

        <Panel className="p-4">
          <Label as="h2">Today's leader</Label>
          {dailyInfo.topScoreMs > 0 ? (
          <div className="mt-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Flag
                code={dailyInfo.topCountry}
                emoji={getCountryFlag(dailyInfo.topCountry)}
                className="text-2xl"
              />
              <div>
                <div className="text-sm font-semibold text-ink">{dailyInfo.topScorer}</div>
                <div className="text-[11px] text-ink-faint">Fastest today</div>
              </div>
            </div>
            <div className="font-display text-2xl font-bold text-gold">
              {dailyInfo.topScoreMs}
              <span className="ml-0.5 text-xs text-ink-faint">ms</span>
            </div>
          </div>
          ) : (
            <p className="mt-2 text-[12px] text-ink-faint">
              Nobody has posted a time yet. Set the mark.
            </p>
          )}
        </Panel>

        {dailyInfo.specialRule && (
          <Panel className="p-4">
            <Label as="h2">Rule in play</Label>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
              {dailyInfo.specialRule}
            </p>
          </Panel>
        )}

        <Button variant="signal" size="lg" full onClick={onStartDaily}>
          {playedToday ? 'Play again' : "Enter today's event"}
        </Button>

        {/* The rotation is public. Knowing tomorrow is Reverse Stroop is itself
            a reason to come back, and hiding it would gain nothing. */}
        <div className="flex items-center justify-between rounded-md border border-pitch-700 bg-pitch-850 px-4 py-3">
          <div>
            <Label>Tomorrow</Label>
            <div className="mt-0.5 text-[13px] font-semibold text-ink">
              {MODE_LABELS[nextDailyMode()]}
            </div>
          </div>
          <div className="text-right">
            <Label>Rolls over in</Label>
            <div className="mt-0.5 font-display text-lg font-bold tabular-nums text-ink-muted">
              {formatRemaining(msUntilNextDaily())}
            </div>
          </div>
        </div>
      </div>
    </Screen>
  );
};
