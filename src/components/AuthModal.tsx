import React, { useState } from 'react';
import { UserProfile } from '../types';
import { X, CheckCircle2, ShieldCheck, Lock, Sparkles, UserCheck } from 'lucide-react';
import { getCountryFlag } from '../utils/countries';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  onLoginSuccess: (authData: {
    username: string;
    email: string;
    authProvider: 'google' | 'apple';
    verifiedAthlete: boolean;
    photoUrl?: string;
  }) => void;
  onSignOut: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onLoginSuccess,
  onSignOut,
}) => {
  const [activeScreen, setActiveScreen] = useState<'CHOICE' | 'GOOGLE' | 'SUCCESS'>('CHOICE');
  const [loading, setLoading] = useState(false);
  const [googleAccount, setGoogleAccount] = useState('alex.reflex@gmail.com');
  const [customName, setCustomName] = useState(userProfile.username || 'ProReflexAthlete');

  if (!isOpen) return null;

  const handleGoogleAuth = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess({
        username: customName || 'Alex Reflex',
        email: googleAccount,
        authProvider: 'google',
        verifiedAthlete: true,
        photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      });
      setActiveScreen('SUCCESS');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pitch-900/85 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-md bg-pitch-850 border border-pitch-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-ink">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-pitch-700 bg-pitch-900">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-signal/20 border border-pitch-700 text-gold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-sm tracking-tight text-ink">WREACT Identity</h2>
              <p className="text-[10px] text-ink-muted">Sync scores & get Verified Athlete badge</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-ink-faint hover:text-ink hover:bg-pitch-700 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {/* Currently Logged In State */}
          {userProfile.isLoggedIn ? (
            <div className="text-center space-y-4 py-2">
              <div className="relative inline-block">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-pitch-950 border-2 border-signal/50 p-1 flex items-center justify-center text-4xl shadow-xl shadow-signal/10">
                  {userProfile.avatar}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-signal text-pitch-950 p-1 rounded-full border-2 border-pitch-850" title="Verified Athlete">
                  <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-center gap-1.5">
                  <h3 className="text-lg font-black text-ink">{userProfile.username}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-signal/10 border border-signal/30 text-signal font-semibold flex items-center gap-1">
                    Verified
                  </span>
                </div>
                <p className="text-xs text-ink-faint mt-0.5 font-mono">{userProfile.email}</p>
                <div className="mt-2 text-[11px] text-ink-faint bg-pitch-950 border border-pitch-600/80 rounded-xl p-2.5 inline-flex items-center gap-2">
                  {userProfile.authProvider === 'google' ? (
                    <span className="flex items-center gap-1.5 font-medium text-ink">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                      Signed in with Google Account
                    </span>
                  ) : (
                    <span className="font-medium text-ink">Signed in</span>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-pitch-600 flex flex-col gap-2">
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-signal hover:bg-signal/90 text-pitch-950 font-bold rounded-2xl text-xs transition-all"
                >
                  Continue to Game
                </button>
                <button
                  onClick={() => {
                    onSignOut();
                    setActiveScreen('CHOICE');
                  }}
                  className="w-full py-2.5 bg-pitch-800 hover:bg-pitch-700 text-alert font-semibold rounded-2xl text-xs transition-all"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : activeScreen === 'CHOICE' ? (
            <>
              {/* Value prop banner */}
              <div className="bg-pitch-850 border border-pitch-700 rounded-2xl p-4 text-center space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-signal/10 border border-signal/25 text-signal text-[11px] font-bold">
                  <Sparkles className="w-3 h-3" /> Global Leaderboard Verification
                </div>
                <h3 className="font-black text-sm text-ink">Unlock Verified Athlete Status</h3>
                <p className="text-xs text-ink-muted">
                  Protect your daily streaks, sync scores across iOS & Android, and display a verified badge next to your country flag.
                </p>
              </div>

              {/* Login Buttons */}
              <div className="space-y-3 pt-2">
                {/* Google Sign In Button */}
                <button
                  onClick={() => setActiveScreen('GOOGLE')}
                  className="w-full py-3.5 px-4 bg-white hover:bg-ink text-pitch-850 font-bold rounded-2xl text-sm transition-all flex items-center justify-center gap-3 shadow-lg shadow-white/10 active:scale-[0.98]"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Continue with Google</span>
                </button>

              </div>

              {/* Guest option */}
              <div className="pt-3 text-center">
                <button
                  onClick={onClose}
                  className="text-xs text-ink-faint hover:text-ink underline underline-offset-4 font-medium"
                >
                  Continue as Guest Athlete
                </button>
              </div>
            </>
          ) : activeScreen === 'GOOGLE' ? (
            /* GOOGLE OAUTH FLOW SIMULATION */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-pitch-600">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span className="font-bold text-sm text-ink">Google Accounts Sign In</span>
                </div>
                <button
                  onClick={() => setActiveScreen('CHOICE')}
                  className="text-xs text-ink-faint hover:text-ink"
                >
                  Back
                </button>
              </div>

              <div className="bg-pitch-950 border border-pitch-600 rounded-2xl p-4 space-y-3">
                <label className="block text-[11px] font-mono text-ink-faint uppercase">Selected Google Account</label>
                <input
                  type="email"
                  value={googleAccount}
                  onChange={(e) => setGoogleAccount(e.target.value)}
                  className="w-full bg-pitch-850 border border-pitch-600 rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:border-blue-500 font-mono"
                  placeholder="name@gmail.com"
                />

                <label className="block text-[11px] font-mono text-ink-faint uppercase pt-1">Gamer Tag Name</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-pitch-850 border border-pitch-600 rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:border-blue-500"
                  placeholder="Athlete Username"
                />

                <div className="p-3 bg-blue-950/40 border border-blue-800/40 rounded-xl text-[11px] text-blue-200 flex items-start gap-2">
                  <Lock className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>
                    WREACT will access your public profile & email to verify global leaderboard scores and sync stats across devices.
                  </span>
                </div>
              </div>

              <button
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-ink font-bold rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Connecting Google OAuth...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Authorize Google Sign-In</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* SUCCESS STATE */
            <div className="text-center py-4 space-y-4 animate-scale-up">
              <div className="w-16 h-16 bg-signal/20 text-signal border border-signal/40 rounded-full flex items-center justify-center mx-auto text-3xl">
                ✓
              </div>
              <div>
                <h3 className="text-lg font-black text-ink">Authentication Successful!</h3>
                <p className="text-xs text-ink-muted mt-1">
                  You are now signed in and verified as a <span className="text-signal font-bold">Verified Athlete</span>.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full py-3 bg-signal hover:bg-signal text-pitch-950 font-extrabold rounded-2xl text-xs shadow-lg shadow-signal/20"
              >
                Start Competing Globally
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
