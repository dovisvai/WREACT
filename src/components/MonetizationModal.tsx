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

const PRO_BENEFITS = [
  'Unlimited 1v1 duels',
  'Full reaction telemetry and trend history',
  'Verified mark beside your name in the standings',
  'No ads, ever',
];

type Status = { text: string; tone: 'success' | 'info' | 'error' } | null;

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

    const result = await revenueCat.purchasePackage(selected);
    setPurchasing(false);

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
    } else {
      await haptic.error();
      setStatus({ text: 'The purchase could not be completed.', tone: 'error' });
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    setStatus(null);
    playClickSound();

    const result = await revenueCat.restorePurchases();
    setRestoring(false);

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
  };

  const priceLine = (pkg: RevenueCatPackageInfo): string => {
    if (pkg.packageType === 'LIFETIME') return 'one time';
    if (pkg.packageType === 'ANNUAL') return 'per year';
    return 'per month';
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
                Everything is unlocked. Manage or cancel any time in your store account
                settings.
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
                  const isBestValue = pkg.packageType === 'ANNUAL';

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
                          {isBestValue && (
                            <span className="rounded-xs bg-gold/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold">
                              Best value
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
              Preview mode — no store is connected on this platform, so nothing here can be
              charged. Purchases work in the iOS and Android builds.
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
