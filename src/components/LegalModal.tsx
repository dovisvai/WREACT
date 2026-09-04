import React, { useState } from 'react';
import { ShieldCheck, FileText, Lock, X, ExternalLink, Check, AlertCircle } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'PRIVACY' | 'TERMS' | 'EULA';
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'PRIVACY',
}) => {
  const [tab, setTab] = useState<'PRIVACY' | 'TERMS' | 'EULA'>(initialTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pitch-900/90 backdrop-blur-md p-4 animate-fade-in text-ink">
      <div className="relative w-full max-w-2xl bg-pitch-850 border border-pitch-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-pitch-900 border-b border-pitch-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-signal/20 border border-gold/40 text-gold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-ink">Legal &amp; Store Compliance</h2>
              <p className="text-[11px] text-ink-faint">Privacy, subscriptions and your data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-pitch-850 hover:bg-pitch-700 border border-pitch-700 flex items-center justify-center text-ink-faint hover:text-ink transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex border-b border-pitch-700 bg-pitch-800 px-6">
          <button
            onClick={() => setTab('PRIVACY')}
            className={`py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
              tab === 'PRIVACY'
                ? 'border-gold text-gold'
                : 'border-transparent text-ink-faint hover:text-ink'
            }`}
          >
            Privacy Policy
          </button>
          <button
            onClick={() => setTab('TERMS')}
            className={`py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
              tab === 'TERMS'
                ? 'border-gold text-gold'
                : 'border-transparent text-ink-faint hover:text-ink'
            }`}
          >
            Terms of Service
          </button>
          <button
            onClick={() => setTab('EULA')}
            className={`py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
              tab === 'EULA'
                ? 'border-gold text-gold'
                : 'border-transparent text-ink-faint hover:text-ink'
            }`}
          >
            Standard EULA & Billing
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs leading-relaxed text-ink-muted">
          {tab === 'PRIVACY' && (
            <div className="space-y-3">
              <div className="bg-emerald-950/40 border border-signal/30 rounded-2xl p-3 text-emerald-300">
                <strong>Summary:</strong> WREACT does not sell personal data. Reaction timing telemetry and country flags are strictly used for global leaderboards and matchmaking.
              </div>

              <h3 className="text-sm font-bold text-ink">1. Data We Collect</h3>
              <p>
                - <strong>Reaction Performance Data:</strong> Millisecond response times, false starts, touch coordinates, and game mode records.
                <br />
                - <strong>Account &amp; Identity:</strong> A display name and avatar you choose, tied to an anonymous account created automatically on this device. No email address, phone number or real name is collected.
                <br />
                - <strong>Country:</strong> The nation you pick when you first open the app, suggested from your device time zone. No location permission is requested and GPS is never used.
              </p>

              <h3 className="text-sm font-bold text-ink">2. In-App Purchases (RevenueCat)</h3>
              <p>
                We use RevenueCat to validate Google Play purchase receipts. RevenueCat receives an anonymous App User ID and the receipt, which unlocks your entitlement without exposing any payment details to us.
              </p>

              <h3 className="text-sm font-bold text-ink">3. Your Rights &amp; Account Deletion</h3>
              <p className="text-ink-muted">
                Your display name, nation and reaction times are shown on a public
                leaderboard and are readable by anyone using the app.
              </p>
              <p>
                You may permanently delete your profile, scores, and cloud records at any time directly from the <strong>Profile & Settings</strong> tab using the "Delete Athlete Account" action. All data is purged immediately.
              </p>

              <h3 className="text-sm font-bold text-ink">4. Contact & Support</h3>
              <p>
                For privacy inquiries or data export requests, reach our compliance team at <span className="text-gold">privacy@wreact.app</span>.
              </p>
            </div>
          )}

          {tab === 'TERMS' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-ink">1. Agreement to Terms</h3>
              <p>
                By downloading, accessing, or playing WREACT, you agree to these Terms of Service. If you do not agree, do not use the application.
              </p>

              <h3 className="text-sm font-bold text-ink">2. Leaderboard Fair Play & Anti-Cheat</h3>
              <p>
                WREACT employs real-time latency auditing and mechanical touch cadence verification. Any automated macro software, script-injected millisecond timings below biological limits (sub-50ms), or leaderboard tampering will result in immediate permanent athlete account disqualification.
              </p>

              <h3 className="text-sm font-bold text-ink">3. 1v1 Duels & Matchmaking</h3>
              <p>
                Matchmaking latency relies on internet connectivity. In the event of a disconnect, default timeout adjudication rules apply.
              </p>
            </div>
          )}

          {tab === 'EULA' && (
            <div className="space-y-3">
              <div className="bg-yellow-950/40 border border-gold/30 rounded-2xl p-3 text-gold">
                <strong>Subscription terms:</strong> WREACT Pro is an auto-renewing subscription sold through Google Play.
              </div>

              <h3 className="text-sm font-bold text-ink">1. Pro Athlete Subscription Terms</h3>
              <p>
                - <strong>Payment:</strong> Charged to your Google Play account at confirmation of purchase.
                <br />
                - <strong>Renewal:</strong> Subscription automatically renews unless auto-renew is turned off at least 24 hours before the end of the current billing cycle.
                <br />
                - <strong>Renewal:</strong> Your Google Play account is charged for renewal within 24 hours before the end of the current period.
                <br />
                - <strong>Managing subscriptions:</strong> Manage or cancel anytime at play.google.com/store/account/subscriptions, or in the Play Store app under Payments &amp; subscriptions.
              </p>

              <h3 className="text-sm font-bold text-ink">2. Free Trial Details</h3>
              <p>
                Any unused portion of a free trial period, if offered, will be forfeited when the user purchases a subscription to that publication.
              </p>

              <div className="flex items-center gap-2 pt-2">
                <a
                  href="https://play.google.com/store/account/subscriptions"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-gold hover:underline flex items-center gap-1 font-bold"
                >
                  <span>Manage subscriptions in Google Play</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-pitch-900 border-t border-pitch-700 flex items-center justify-between">
          <span className="text-[11px] text-ink-faint font-mono">WREACT Version 1.0.0 (Build 2026.1)</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gold hover:bg-gold text-pitch-950 font-black text-xs rounded-xl transition-all"
          >
            I Understand & Agree
          </button>
        </div>

      </div>
    </div>
  );
};
