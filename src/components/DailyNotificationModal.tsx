import React, { useCallback, useEffect, useState } from 'react';
import { X, Bell, BellOff, Check } from 'lucide-react';
import { MatchdayClock, formatRemaining } from '../utils/matchday';
import {
  getPushDiagnostics,
  isPushSupported,
  requestPushPermission,
  type PushDiagnostics,
} from '../services/push';
import { haptic } from '../services/native';
import { Button, Label, cx } from './ui/Primitives';

interface DailyNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  dailyStreak: number;
  clock: MatchdayClock;
  countryName: string;
}

/**
 * The notification opt-in.
 *
 * Deliberately not shown at launch. The permission is asked for here, against a
 * live countdown and a named nation, because the honest reason to accept it —
 * "tell me when my country is about to be overtaken" — only makes sense once
 * the player knows there is a country and a deadline.
 */
export const DailyNotificationModal: React.FC<DailyNotificationModalProps> = ({
  isOpen,
  onClose,
  dailyStreak,
  clock,
  countryName,
}) => {
  const [diagnostics, setDiagnostics] = useState<PushDiagnostics | null>(null);
  const [asking, setAsking] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const refresh = useCallback(() => {
    getPushDiagnostics().then(setDiagnostics);
  }, []);

  // Permission state is owned by the OS and can change while the app is
  // backgrounded, so it is read when the sheet opens rather than cached.
  useEffect(() => {
    if (isOpen) refresh();
  }, [isOpen, refresh]);

  if (!isOpen) return null;

  const supported = isPushSupported();
  const granted = diagnostics?.permission ?? false;

  const alerts = [
    {
      title: 'Final hours',
      body: `Six hours before the whistle, if ${countryName} is still within reach of the place above.`,
    },
    {
      title: 'Overtaken',
      body: `The moment another nation passes ${countryName}.`,
    },
    {
      title: 'Final whistle',
      body: 'Where your country finished, and medals if you placed.',
    },
    {
      title: 'Streak at risk',
      body: 'Only when a streak you already have is about to end tonight.',
    },
  ];

  const handleEnable = async () => {
    setAsking(true);
    await haptic.medium();
    const ok = await requestPushPermission();
    setAsking(false);
    refresh();
    if (ok) await haptic.success();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-pitch-950/80 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Match alerts"
    >
      <div className="pad-safe-bottom w-full max-w-sm rounded-t-lg border border-pitch-700 bg-pitch-900 sm:rounded-lg">
        <div className="flex items-center justify-between border-b border-pitch-700 px-4 py-3">
          <Label as="h2">Match alerts</Label>
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
          <div className="rounded-md border border-pitch-700 bg-pitch-850 p-4 text-center">
            <Label>Matchday {clock.matchday.number}</Label>
            <div
              className={cx(
                'mt-1 font-display text-4xl font-bold leading-none tabular-nums',
                clock.isFinalHours ? 'text-gold' : 'text-ink'
              )}
            >
              {formatRemaining(clock.msRemaining)}
            </div>
            <p className="mt-1 text-[11px] text-ink-faint">
              until {countryName}'s result is final
            </p>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-ink-muted">
            Four alerts, all about your nation's position. Nothing else.
          </p>

          <ul className="mt-3 space-y-2.5">
            {alerts.map((alert) => (
              <li key={alert.title} className="flex gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-signal" />
                <div>
                  <div className="text-[13px] font-semibold text-ink">{alert.title}</div>
                  <div className="text-[11px] leading-snug text-ink-faint">{alert.body}</div>
                </div>
              </li>
            ))}
          </ul>

          {dailyStreak > 0 && (
            <p className="mt-3 rounded-md border border-pitch-700 bg-pitch-850 px-3 py-2 text-[11px] text-ink-muted">
              You have a {dailyStreak}-day streak to protect.
            </p>
          )}

          <div className="mt-5">
            {granted ? (
              <div className="flex items-center justify-center gap-2 rounded-md border border-signal/30 bg-signal/10 py-3 text-sm font-semibold text-signal">
                <Bell className="h-4 w-4" /> Alerts are on
              </div>
            ) : supported ? (
              <Button variant="signal" size="lg" full onClick={handleEnable} disabled={asking}>
                {asking ? 'Waiting for permission…' : 'Turn on match alerts'}
              </Button>
            ) : (
              <div className="rounded-md border border-pitch-700 bg-pitch-850 p-3">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-ink-muted">
                  <BellOff className="h-4 w-4" /> Not available here
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
                  Match alerts need the iOS or Android app. In a browser there is no
                  reliable way to reach you before the whistle.
                </p>
              </div>
            )}
          </div>

          <p className="mt-3 text-center text-[11px] text-ink-faint">
            You can turn these off any time in your device settings.
          </p>

          {/* Delivery check. Permission granted is not the same as reachable —
              a device only receives anything once it holds a subscription id. */}
          {supported && diagnostics && (
            <div className="mt-4 border-t border-pitch-700 pt-3">
              <button
                type="button"
                onClick={() => setShowDetails((open) => !open)}
                className="text-[11px] font-medium text-ink-muted underline underline-offset-2 hover:text-ink"
              >
                {showDetails ? 'Hide delivery check' : 'Delivery check'}
              </button>

              {showDetails && (
                <dl className="mt-2 space-y-1.5">
                  <DiagnosticRow label="Permission" ok={diagnostics.permission} />
                  <DiagnosticRow label="Subscribed" ok={diagnostics.optedIn} />
                  <DiagnosticRow
                    label="Subscription"
                    ok={Boolean(diagnostics.subscriptionId)}
                    value={
                      diagnostics.subscriptionId
                        ? `${diagnostics.subscriptionId.slice(0, 8)}…`
                        : 'none yet'
                    }
                  />
                  <DiagnosticRow
                    label="App"
                    ok
                    value={`${diagnostics.appId.slice(0, 8)}…`}
                  />
                </dl>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DiagnosticRow: React.FC<{ label: string; ok: boolean; value?: string }> = ({
  label,
  ok,
  value,
}) => (
  <div className="flex items-center justify-between text-[11px]">
    <dt className="text-ink-faint">{label}</dt>
    <dd className={cx('font-medium tabular-nums', ok ? 'text-signal' : 'text-ink-faint')}>
      {value ?? (ok ? 'yes' : 'no')}
    </dd>
  </div>
);
