import React, { useMemo, useState } from 'react';
import { X, Share2, Link2, Check, Loader2, Download } from 'lucide-react';
import { CountryStanding, GameMode } from '../types';
import { getCountryName, getPercentileRating } from '../utils/countries';
import { rankAgainstNations } from '../utils/standings';
import {
  buildChallengeLink,
  shareResult,
  type ShareCardData,
  type ShareOutcome,
} from '../services/share';
import { haptic } from '../services/native';
import { Button, Label, cx } from './ui/Primitives';

interface ShareCardModalProps {
  scoreMs: number;
  mode: GameMode;
  username: string;
  country: string;
  avatar: string;
  standing: CountryStanding | null;
  standings: CountryStanding[];
  isOpen: boolean;
  onClose: () => void;
}

export const ShareCardModal: React.FC<ShareCardModalProps> = ({
  scoreMs,
  mode,
  username,
  country,
  avatar,
  standing,
  standings,
  isOpen,
  onClose,
}) => {
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<ShareOutcome | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const code = country.toUpperCase();
  const nations = useMemo(() => rankAgainstNations(standings, scoreMs), [standings, scoreMs]);
  const tier = getPercentileRating(scoreMs);
  const isNationalBest = Boolean(standing && scoreMs < standing.bestMs);

  const cardData: ShareCardData = {
    username,
    country: code,
    avatar,
    scoreMs,
    mode,
    countryRank: standing?.rank ?? null,
    countryAvgMs: standing?.qualified ? standing.avgMs : null,
    beatsNations: nations.beats,
    totalNations: nations.total,
    isNationalBest,
  };

  const invite = { username, country: code, avatar, scoreMs, mode };

  if (!isOpen) return null;

  const handleShare = async () => {
    setBusy(true);
    setOutcome(null);
    await haptic.medium();

    const result = await shareResult(cardData, invite);

    setBusy(false);
    setOutcome(result);
    if (result === 'shared' || result === 'downloaded' || result === 'copied') {
      await haptic.success();
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(buildChallengeLink(invite));
      setLinkCopied(true);
      await haptic.light();
      setTimeout(() => setLinkCopied(false), 2400);
    } catch {
      /* clipboard unavailable — the share sheet remains the primary path */
    }
  };

  const outcomeMessage: Partial<Record<ShareOutcome, string>> = {
    shared: 'Sent.',
    downloaded: 'Card saved and challenge text copied.',
    copied: 'Challenge copied to clipboard.',
    failed: 'Sharing is unavailable on this device.',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-pitch-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Share your result"
    >
      <div className="pad-safe-bottom w-full max-w-sm rounded-t-lg border border-pitch-700 bg-pitch-900 sm:rounded-lg">
        <div className="flex items-center justify-between border-b border-pitch-700 px-4 py-3">
          <Label as="h2">Share result</Label>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-pitch-800 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          {/* Preview mirrors the rendered PNG so what they see is what posts. */}
          <div className="relative overflow-hidden rounded-md border border-pitch-700 bg-pitch-850 px-5 py-6">
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal/10 blur-3xl"
            />

            <div className="relative">
              <div className="flex items-baseline justify-between">
                <span className="font-display text-base font-extrabold uppercase tracking-tight text-ink">
                  WREACT
                </span>
                <Label>World standings</Label>
              </div>

              <div className="mt-5 text-center">
                <div className="font-display text-5xl font-extrabold leading-none tracking-tight text-ink">
                  {code}
                </div>
                <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                  {getCountryName(code)}
                </div>
                {standing?.rank && (
                  <div className="mt-1 text-[11px] font-bold text-gold">
                    WORLD #{standing.rank}
                  </div>
                )}
              </div>

              <div className="mt-4 text-center">
                <div className="font-display text-7xl font-extrabold leading-none text-signal">
                  {scoreMs}
                </div>
                <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-ink-muted">
                  Milliseconds
                </div>
              </div>

              <div className="mt-5 text-center">
                {isNationalBest ? (
                  <div className="font-display text-xl font-bold uppercase tracking-tight text-gold">
                    Fastest in {code}
                  </div>
                ) : nations.total > 0 ? (
                  <div className="font-display text-lg font-bold uppercase tracking-tight text-ink">
                    Beats {nations.beats} of {nations.total} nations
                  </div>
                ) : (
                  <div className={cx('text-sm font-semibold', tier.color)}>
                    {tier.icon} {tier.rating}
                  </div>
                )}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-pitch-700 pt-3">
                <span className="text-xs font-semibold text-ink">
                  {avatar} @{username}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-signal">
                  Can you beat it?
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <Button variant="signal" size="lg" full onClick={handleShare} disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Building card
                </>
              ) : outcome === 'shared' ? (
                <>
                  <Check className="h-4 w-4" /> Shared
                </>
              ) : outcome === 'downloaded' ? (
                <>
                  <Download className="h-4 w-4" /> Saved
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" /> Share the card
                </>
              )}
            </Button>

            <Button variant="quiet" full onClick={handleCopyLink}>
              {linkCopied ? (
                <>
                  <Check className="h-4 w-4" /> Challenge link copied
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4" /> Copy challenge link
                </>
              )}
            </Button>
          </div>

          {outcome && outcomeMessage[outcome] && (
            <p
              className={cx(
                'mt-3 text-center text-[11px]',
                outcome === 'failed' ? 'text-alert' : 'text-ink-faint'
              )}
            >
              {outcomeMessage[outcome]}
            </p>
          )}

          <p className="mt-3 text-center text-[11px] leading-relaxed text-ink-faint">
            Anyone who opens your link starts a head-to-head against this time, and{' '}
            {getCountryName(code)} takes the credit when you win.
          </p>
        </div>
      </div>
    </div>
  );
};
