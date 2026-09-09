import React, { useEffect, useState } from 'react';
import { Check, Loader2, X, Zap } from 'lucide-react';
import {
  revenueCat,
  PREVIEW_OFFERING,
  type RevenueCatOfferingData,
  type RevenueCatPackageInfo,
} from '../services/revenuecat';
import { playClickSound, playFanfareSound } from '../utils/audio';
import { haptic } from '../services/native';
import { LegalModal } from './LegalModal';
import { Button, Label, cx } from './ui/Primitives';

interface MonetizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  proPassActive: boolean;
  onActivateProPass?: () => void;
}

/**
 * What Pro actually delivers. Every line here is backed by code.
 *
 * This list used to promise unlimited duels, full telemetry, a verified mark
 * in the standings and no ads. Nothing gated on the entitlement at all — duels
 * are rate-limited identically for everyone, history was eight rows for
 * everyone, no leaderboard renders a Pro marker, and there are no ads to be
 * spared. Four paid claims, zero implementations.
 *
 * Two were dropped rather than built. "Unlimited duels" would have meant
 * inventing a free-tier cap purely so Pro could lift it, which makes the free
 * game worse to sell the fix. A "verified mark in the standings" would have to
 * be asserted by the client, since the server has no idea who subscribes — a
 * badge the app cannot justify, in a product whose rule is that it never shows
 * a number or a claim it cannot stand behind.
 */
const PRO_BENEFITS = [
  'Your complete run history, not just the last eight',
  'A supporter mark on your profile',
  'No ads — in the free game either, and that is a promise not a feature',
  'You directly fund an independent developer',
];

type Status = { text: string; tone: 'success' | 'info' | 'error' } | null;

/** Below this, the annual plan is not meaningfully cheaper and no badge shows. */
const MIN_SAVING_TO_ADVERTISE = 5;

export const MonetizationModal: React.FC<MonetizationModalProps> = ({
  isOpen,
  onClose,
  proPassActive,
  onActivateProPass,
}) => {
  const [offering, setOffering] = useState<RevenueCatOfferingData>(PREVIEW_OFFERING);
  const [selectedId, setSelectedId] = useState('$rc_annual');
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [legalTab, setLegalTab] = useState<'PRIVACY' | 'TERMS' | 'EULA' | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStatus(null);
    revenueCat.getOfferings().then(setOffering);
  }, [isOpen]);

  if (!isOpen) return null;

  const selected =
    offering.availablePackages.find((p) => p.identifier === selectedId) ??
    offering.availablePackages[0];

  const handlePurchase = async () => {
    if (!selected) return;

    setPurchasing(true);
    setStatus(null);
    playClickSound();
    await haptic.medium();

    // try/finally: setPurchasing(false) used to sit on the happy path only, so
    // any rejection left the button reading "Contacting store" until the app
    // was restarted.
    try {
      const result = await revenueCat.purchasePackage(selected);

      if (result.cancelled) return;

      if (result.success) {
        playFanfareSound();
        await haptic.success();
        setStatus({
          text: offering.isSimulated
            ? 'Preview unlock applied on this device. No real purchase was made.'
            : 'Pro is active. Thanks for backing WREACT.',
          tone: offering.isSimulated ? 'info' : 'success',
        });
        onActivateProPass?.();
      } else if (result.chargedWithoutEntitlement) {
        // The one case the player must not be told is a plain failure: the
        // store may already have their money.
        await haptic.error();
        setStatus({
          text:
            'The store completed the purchase but Pro has not activated yet. ' +
            'Tap Restore in a moment — if it stays locked, email dovis.vai@gmail.com ' +
            'and you will not be charged twice.',
          tone: 'error',
        });
      } else {
        await haptic.error();
        setStatus({
          text: offering.isSimulated
            ? 'This build has no store connected, so nothing can be purchased yet.'
            : 'The purchase could not be completed. Nothing was charged.',
          tone: 'error',
        });
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    setStatus(null);
    playClickSound();

    // Same guard as the purchase path: a rejection here left the Restore
    // button stuck reading "Checking" for the rest of the session.
    try {
      const result = await revenueCat.restorePurchases();

      if (result.restored) {
        playFanfareSound();
        await haptic.success();
        setStatus({ text: 'Purchases restored.', tone: 'success' });
        onActivateProPass?.();
      } else {
        setStatus({
          text: result.success
            ? 'No active subscription found for this account.'
            : 'Restore failed. Check your connection and try again.',
          tone: result.success ? 'info' : 'error',
        });
      }
    } finally {
      setRestoring(false);
    }
  };

  /**
   * What the annual plan actually saves against paying monthly for a year.
   *
   * Computed from the offering rather than written into the copy, because
   * RevenueCat returns store-localised prices: Play sets its own rounded price
   * points per currency, so a figure that is right in USD is wrong almost
   * everywhere else. Returns null when there is nothing honest to claim — no
   * monthly plan to compare against, a missing price, or a saving that rounds
   * to nothing.
   */
  const annualSavingPercent = (pkg: RevenueCatPackageInfo): number | null => {
    if (pkg.packageType !== 'ANNUAL') return null;

    // The cheapest monthly, not the first one found. `find` took whichever the
    // dashboard happened to list first, so adding a decoy tier there silently
    // doubled the advertised saving with no code change.
    const monthlyCandidates = offering?.availablePackages.filter(
      (p) => p.packageType === 'MONTHLY' && p.product.price > 0
    );
    const monthly = monthlyCandidates?.reduce(
      (cheapest: RevenueCatPackageInfo | null, p) =>
        !cheapest || p.product.price < cheapest.product.price ? p : cheapest,
      null
    );

    const monthlyPrice = monthly?.product.price;
    const annualPrice = pkg.product.price;
    if (!monthlyPrice || !annualPrice) return null;

    // Never compare across currencies. Play sets its own price points per
    // market, so a ¥600 monthly against a $29.99 annual computed "SAVE 99%".
    if (monthly && monthly.product.currencyCode !== pkg.product.currencyCode) return null;

    // Finite and positive, so an absent or malformed price cannot produce a
    // 100% or 162% badge.
    if (!Number.isFinite(monthlyPrice) || !Number.isFinite(annualPrice)) return null;
    if (monthlyPrice <= 0 || annualPrice <= 0) return null;

    // Compare like with like: a year of the monthly plan against the annual one.
    const yearAtMonthlyRate = monthlyPrice * 12;
    if (annualPrice >= yearAtMonthlyRate) return null;

    // Floor, never round: this is a price claim, so it must never overstate.
    // Rounding turned a 0.6% difference into a gold "SAVE 1%" badge.
    const percent = Math.floor((1 - annualPrice / yearAtMonthlyRate) * 100);

    // And below a few points there is nothing worth shouting about — a badge
    // promising a 3% saving reads as a worse deal than no badge at all.
    return percent >= MIN_SAVING_TO_ADVERTISE ? percent : null;
  };

  const priceLine = (pkg: RevenueCatPackageInfo): string => {
    // WREACT sells no lifetime product, but the SDK's package type union
    // includes one and the offering comes from a dashboard we do not control at
    // runtime -- so label it correctly rather than calling it "per month".
    // Every non-annual type fell through to "per month", so a weekly tier added
    // in the dashboard would have rendered "$2.99 / per month" on a live store
    // listing — a false price, with no code change required to trigger it.
    switch (pkg.packageType) {
      case 'LIFETIME':
        return 'one time';
      case 'ANNUAL':
        return 'per year';
      case 'MONTHLY':
        return 'per month';
      default:
        // An unknown cadence: say nothing about the period rather than guess.
        return '';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-pitch-950/85 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="WREACT Pro"
    >
      <div className="pad-safe-bottom flex max-h-[92vh] w-full max-w-sm flex-col rounded-t-lg border border-pitch-700 bg-pitch-900 sm:rounded-lg">
        <div className="flex shrink-0 items-center justify-between border-b border-pitch-700 px-4 py-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-gold" />
            <Label as="h2">WREACT Pro</Label>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-pitch-800 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-4 py-5">
          {proPassActive ? (
            <div className="py-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-gold/40">
                <Check className="h-6 w-6 text-gold" />
              </div>
              <h3 className="mt-4 font-display text-2xl font-bold uppercase tracking-tight text-ink">
                Pro is active
              </h3>
              <p className="mt-2 text-sm text-ink-muted">
                Your full run history is unlocked and your profile carries a supporter
                mark. Manage or cancel any time in your store account settings.
              </p>
            </div>
          ) : (
            <>
              <h3 className="font-display text-3xl font-extrabold uppercase leading-none tracking-tight text-ink">
                Go faster, see further
              </h3>

              <ul className="mt-4 space-y-2">
                {PRO_BENEFITS.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-signal" />
                    <span className="text-[13px] leading-snug text-ink-muted">{benefit}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 space-y-2">
                {offering.availablePackages.map((pkg) => {
                  const isSelected = pkg.identifier === selected?.identifier;
                  const saving = annualSavingPercent(pkg);

                  return (
                    <button
                      key={pkg.identifier}
                      type="button"
                      onClick={() => {
                        haptic.light();
                        setSelectedId(pkg.identifier);
                      }}
                      className={cx(
                        'flex w-full items-center justify-between rounded-md border px-4 py-3 text-left transition-colors',
                        isSelected
                          ? 'border-signal bg-signal/10'
                          : 'border-pitch-700 bg-pitch-850 hover:border-pitch-600'
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-ink">
                            {pkg.product.title}
                          </span>
                          {saving !== null && (
                            <span className="rounded-xs bg-gold/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold">
                              Save {saving}%
                            </span>
                          )}
                        </div>
                        {pkg.product.introductoryPrice && (
                          <div className="mt-0.5 text-[11px] text-signal">
                            {pkg.product.introductoryPrice.priceString}
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="font-display text-lg font-bold leading-none text-ink">
                          {pkg.product.priceString}
                        </div>
                        <div className="text-[10px] text-ink-faint">{priceLine(pkg)}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <Button
                variant="signal"
                size="lg"
                full
                className="mt-4"
                onClick={handlePurchase}
                disabled={purchasing || !selected}
              >
                {purchasing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Contacting store
                  </>
                ) : (
                  'Continue'
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                full
                className="mt-2"
                onClick={handleRestore}
                disabled={restoring}
              >
                {restoring ? 'Restoring…' : 'Restore purchases'}
              </Button>
            </>
          )}

          {status && (
            <p
              className={cx(
                'mt-3 text-center text-[12px] leading-relaxed',
                status.tone === 'error'
                  ? 'text-alert'
                  : status.tone === 'success'
                  ? 'text-signal'
                  : 'text-ink-muted'
              )}
            >
              {status.text}
            </p>
          )}

          {/* Preview-mode disclosure. A user must never believe a browser click
              bought them something. */}
          {offering.isSimulated && !proPassActive && (
            <p className="mt-4 rounded-md border border-pitch-700 bg-pitch-850 p-3 text-[11px] leading-relaxed text-ink-faint">
              {/*
                The old copy read "Purchases work in the iOS and Android builds"
                — and this notice renders on Android, under a catalogue of
                invented prices, whenever the store cannot be reached. It said
                the opposite of what was true where it was shown.
              */}
              Example pricing — this build cannot reach the store, so these figures are
              placeholders rather than real prices, and nothing here can be charged. The
              price you would actually pay is set by Google Play in your own currency.
            </p>
          )}

          {/* Apple Guideline 3.1.2 requires length, price, renewal terms and
              links to Terms and Privacy on the paywall itself. */}
          <div className="mt-5 border-t border-pitch-700 pt-4">
            <p className="text-[10px] leading-relaxed text-ink-faint">
              Subscriptions renew automatically unless cancelled at least 24 hours before the
              end of the current period. Your account is charged for renewal within 24 hours
              of the end of the period. Manage or cancel in your store account settings after
              purchase. Any unused portion of a free trial is forfeited when a subscription is
              purchased.
            </p>
            <div className="mt-2 flex gap-4">
              <button
                type="button"
                onClick={() => setLegalTab('TERMS')}
                className="text-[11px] font-medium text-ink-muted underline underline-offset-2 hover:text-ink"
              >
                Terms of use
              </button>
              <button
                type="button"
                onClick={() => setLegalTab('PRIVACY')}
                className="text-[11px] font-medium text-ink-muted underline underline-offset-2 hover:text-ink"
              >
                Privacy policy
              </button>
            </div>
          </div>
        </div>
      </div>

      <LegalModal
        isOpen={legalTab !== null}
        onClose={() => setLegalTab(null)}
        initialTab={legalTab ?? 'PRIVACY'}
      />
    </div>
  );
};
