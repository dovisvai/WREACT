import React, { useMemo, useRef, useState } from 'react';
import { Search, Share2, Users } from 'lucide-react';
import { CountryStanding } from '../types';
import { COUNTRIES } from '../utils/countries';
import { MIN_ATHLETES_TO_QUALIFY } from '../utils/standings';
import { MatchdayClock, RANKED_MODE } from '../utils/matchday';
import { shareRecruitment } from '../services/share';
import { haptic } from '../services/native';
import { useFlipRows } from '../hooks/useFlipRows';
import { MatchdayBar } from './MatchdayBar';
import {
  Button,
  cx,
  EmptyState,
  Flag,
  Skeleton,
  Label,
  Panel,
  RankBadge,
  RankDelta,
  Screen,
  Segmented,
  SpeedBar,
} from './ui/Primitives';

type ContinentFilter = 'ALL' | 'EU' | 'AS' | 'NA' | 'SA' | 'AF' | 'OC';

const CONTINENT_OPTIONS: { value: ContinentFilter; label: string }[] = [
  { value: 'ALL', label: 'World' },
  { value: 'EU', label: 'Europe' },
  { value: 'AS', label: 'Asia' },
  { value: 'NA', label: 'N. Am' },
  { value: 'SA', label: 'S. Am' },
  { value: 'AF', label: 'Africa' },
  { value: 'OC', label: 'Oceania' },
];

const CONTINENT_BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c.continent]));

interface WorldStandingsProps {
  standings: CountryStanding[];
  isLoading: boolean;
  clock: MatchdayClock;
  userCountry: string;
  /** Change in the user's national average from their own last run, if any. */
  lastContributionMs?: number | null;
  onPlay: () => void;
}

export const WorldStandings: React.FC<WorldStandingsProps> = ({
  standings,
  isLoading,
  clock,
  userCountry,
  lastContributionMs,
  onPlay,
}) => {
  const [continent, setContinent] = useState<ContinentFilter>('ALL');
  const [search, setSearch] = useState('');
  const [recruitState, setRecruitState] = useState<'idle' | 'sent'>('idle');

  const userStanding = useMemo(
    () => standings.find((s) => s.code === userCountry.toUpperCase()),
    [standings, userCountry]
  );

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();

    return standings.filter((standing) => {
      if (continent !== 'ALL' && CONTINENT_BY_CODE.get(standing.code) !== continent) {
        return false;
      }
      if (!query) return true;
      return (
        standing.name.toLowerCase().includes(query) ||
        standing.code.toLowerCase().includes(query)
      );
    });
  }, [standings, continent, search]);

  const ranked = visible.filter((s) => s.qualified);
  const contenders = visible.filter((s) => !s.qualified);

  // Bar scale is fixed to the ranked field so bars stay comparable while
  // filtering — a country's bar must not change length when you switch tabs.
  const { fastest, slowest } = useMemo(() => {
    const qualified = standings.filter((s) => s.qualified);
    if (qualified.length === 0) return { fastest: 150, slowest: 350 };
    return {
      fastest: Math.min(...qualified.map((s) => s.avgMs)),
      slowest: Math.max(...qualified.map((s) => s.avgMs)),
    };
  }, [standings]);

  /** The nation directly above the viewer's — the one worth chasing. */
  const rivalAhead = useMemo(() => {
    if (!userStanding?.qualified || !userStanding.rank || userStanding.rank <= 1) {
      return undefined;
    }
    return standings.find((s) => s.rank === (userStanding.rank as number) - 1);
  }, [standings, userStanding]);

  const tableRef = useRef<HTMLDivElement>(null);
  // Re-measure whenever the ordering could have changed.
  useFlipRows(tableRef, standings.map((s) => s.code).join(','));

  const handleRecruit = async () => {
    await haptic.light();
    const outcome = await shareRecruitment(
      userCountry,
      userStanding?.athletesNeeded ?? MIN_ATHLETES_TO_QUALIFY
    );
    if (outcome === 'shared' || outcome === 'copied') {
      setRecruitState('sent');
      setTimeout(() => setRecruitState('idle'), 2400);
    }
  };

  return (
    <Screen className="bg-pitch-900">
      <MatchdayBar
        clock={clock}
        userStanding={userStanding}
        rivalAhead={rivalAhead}
        onRecruit={handleRecruit}
        recruitSent={recruitState === 'sent'}
      />

      {/* Filters ---------------------------------------------------------- */}
      <div className="sticky top-0 z-10 border-b border-pitch-700 bg-pitch-900/95 backdrop-blur">
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-3">
          <Segmented
            options={CONTINENT_OPTIONS}
            value={continent}
            onChange={setContinent}
            className="shrink-0"
          />
        </div>

        <div className="relative px-4 pb-3">
          <Search className="pointer-events-none absolute left-7 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a nation"
            className="h-9 w-full rounded-md border border-pitch-700 bg-pitch-850 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-pitch-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-6 px-4 py-5">
        {/* Your nation --------------------------------------------------- */}
        {userStanding && (
          <section>
            <Label as="h2" className="mb-2 block">
              Your nation
            </Label>

            <Panel className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Flag code={userStanding.code} emoji={userStanding.flag} className="text-3xl" />
                  <div>
                    <div className="font-display text-2xl font-bold uppercase leading-none tracking-tight text-ink">
                      {userStanding.name}
                    </div>
                    <div className="mt-1 text-[11px] text-ink-faint">
                      {userStanding.athleteCount.toLocaleString()}{' '}
                      {userStanding.athleteCount === 1 ? 'athlete' : 'athletes'}
                      {userStanding.qualified && ` · best ${userStanding.bestMs}ms`}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  {userStanding.qualified ? (
                    <>
                      <div className="font-display text-3xl font-bold leading-none text-ink">
                        #{userStanding.rank}
                      </div>
                      <RankDelta delta={userStanding.rankDelta} className="mt-1 block" />
                    </>
                  ) : (
                    <Label className="text-ink-muted">Unranked</Label>
                  )}
                </div>
              </div>

              {userStanding.qualified ? (
                <>
                  <div className="mt-4 flex items-baseline justify-between">
                    <Label>National average</Label>
                    <span className="font-display text-xl font-bold text-ink">
                      {userStanding.avgMs}
                      <span className="ml-0.5 text-xs text-ink-faint">ms</span>
                    </span>
                  </div>
                  <SpeedBar
                    valueMs={userStanding.avgMs}
                    fastestMs={fastest}
                    slowestMs={slowest}
                    tone="signal"
                    className="mt-2"
                  />
                </>
              ) : (
                <div className="mt-4 rounded-md border border-pitch-700 bg-pitch-800 p-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-ink-muted" />
                    <span className="text-sm font-semibold text-ink">
                      {userStanding.athletesNeeded} more{' '}
                      {userStanding.athletesNeeded === 1 ? 'athlete' : 'athletes'} to qualify
                    </span>
                  </div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-ink-faint">
                    {userStanding.name} enters the world standings at{' '}
                    {MIN_ATHLETES_TO_QUALIFY} athletes. Bring people in.
                  </p>
                </div>
              )}

              {/* The contribution line: the reason a solo test matters. */}
              {lastContributionMs != null && lastContributionMs > 0 && (
                <div className="mt-3 flex items-center gap-2 rounded-md border border-signal/25 bg-signal/10 px-3 py-2">
                  <span className="text-sm font-semibold text-signal">
                    ▲ You pulled {userStanding.code} {lastContributionMs.toFixed(2)}ms faster
                  </span>
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <Button variant="signal" size="sm" onClick={onPlay} className="flex-1">
                  Improve your time
                </Button>
                <Button variant="quiet" size="sm" onClick={handleRecruit}>
                  <Share2 className="h-3.5 w-3.5" />
                  {recruitState === 'sent' ? 'Sent' : 'Recruit'}
                </Button>
              </div>
            </Panel>
          </section>
        )}

        {/* Ranked table --------------------------------------------------- */}
        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <Label as="h2">
              {continent === 'ALL' ? 'World standings' : 'Regional standings'}
            </Label>
            <Label>{ranked.length} ranked</Label>
          </div>

          <p className="mb-2 text-[11px] leading-relaxed text-ink-faint">
            {RANKED_MODE.toLowerCase()} times only, from this matchday. Other modes are
            practice and never affect a national average.
          </p>

          {isLoading && ranked.length === 0 ? (
            <Skeleton rows={7} />
          ) : ranked.length === 0 ? (
            <EmptyState
              title="No nation has qualified yet"
              body={`A country enters the standings once ${MIN_ATHLETES_TO_QUALIFY} of its athletes have posted a time. Be the first.`}
              action={
                <Button variant="signal" onClick={onPlay}>
                  Post a time
                </Button>
              }
            />
          ) : (
            <div className="space-y-1.5" ref={tableRef}>
              {ranked.map((standing) => (
                <NationRow
                  key={standing.code}
                  standing={standing}
                  fastest={fastest}
                  slowest={slowest}
                  isUser={standing.code === userCountry.toUpperCase()}
                />
              ))}
            </div>
          )}
        </section>

        {/* Contenders ----------------------------------------------------- */}
        {contenders.length > 0 && (
          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <Label as="h2">Contenders</Label>
              <Label>Need {MIN_ATHLETES_TO_QUALIFY}+ athletes</Label>
            </div>

            <div className="space-y-1.5">
              {contenders.slice(0, 30).map((standing) => (
                <div
                  key={standing.code}
                  className="flex items-center gap-3 rounded-md border border-pitch-700/60 bg-pitch-850/50 px-3 py-2.5"
                >
                  <Flag code={standing.code} emoji={standing.flag} className="text-xl opacity-70" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-ink-muted">
                      {standing.name}
                    </div>
                    <div className="text-[11px] text-ink-faint">
                      {standing.athleteCount} of {MIN_ATHLETES_TO_QUALIFY} athletes
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: MIN_ATHLETES_TO_QUALIFY }).map((_, i) => (
                      <span
                        key={i}
                        className={cx(
                          'h-1.5 w-1.5 rounded-full',
                          i < standing.athleteCount ? 'bg-ink-muted' : 'bg-pitch-700'
                        )}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </Screen>
  );
};

/* -------------------------------------------------------------------------- */

const NationRow: React.FC<{
  standing: CountryStanding;
  fastest: number;
  slowest: number;
  isUser: boolean;
}> = ({ standing, fastest, slowest, isUser }) => {
  const isLeader = standing.rank === 1;

  return (
    <div
      data-flip-key={standing.code}
      className={cx(
        'rounded-md border px-3 py-2.5 transition-colors',
        isUser
          ? 'border-signal/40 bg-signal/5'
          : isLeader
          ? 'border-gold/35 bg-pitch-850'
          : 'border-pitch-700 bg-pitch-850'
      )}
    >
      <div className="flex items-center gap-3">
        <RankBadge rank={standing.rank} className="w-7 shrink-0" />
        <Flag code={standing.code} emoji={standing.flag} className="shrink-0 text-2xl" />

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span
              className={cx(
                'truncate font-display text-lg font-bold uppercase leading-none tracking-tight',
                isLeader ? 'text-gold' : 'text-ink'
              )}
            >
              {standing.name}
            </span>
            {isUser && <Label className="shrink-0 text-signal">You</Label>}
          </div>
          <div className="mt-0.5 text-[11px] text-ink-faint">
            {standing.athleteCount.toLocaleString()} athletes · best {standing.bestMs}ms
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div
            className={cx(
              'font-display text-xl font-bold leading-none',
              isLeader ? 'text-gold' : 'text-ink'
            )}
          >
            {standing.avgMs}
            <span className="ml-0.5 text-[11px] font-semibold text-ink-faint">ms</span>
          </div>
          <RankDelta delta={standing.rankDelta} className="mt-0.5 block" />
        </div>
      </div>

      <SpeedBar
        valueMs={standing.avgMs}
        fastestMs={fastest}
        slowestMs={slowest}
        tone={isLeader ? 'gold' : isUser ? 'signal' : 'muted'}
        className="mt-2"
      />
    </div>
  );
};
