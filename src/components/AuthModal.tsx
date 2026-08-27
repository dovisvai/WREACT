import React, { useState } from 'react';
import { UserProfile } from '../types';
import { X, CheckCircle2, ShieldCheck, Zap, Lock, Sparkles, ArrowRight, UserCheck, AlertCircle, Mail } from 'lucide-react';
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
  const [activeScreen, setActiveScreen] = useState<'CHOICE' | 'GOOGLE' | 'APPLE' | 'EMAIL' | 'SUCCESS'>('CHOICE');
  const [loading, setLoading] = useState(false);
  const [googleAccount, setGoogleAccount] = useState('alex.reflex@gmail.com');
  const [emailInput, setEmailInput] = useState('athlete@fastreflex.com');
  const [emailCode, setEmailCode] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [usePrivateRelay, setUsePrivateRelay] = useState(true);
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

  const handleAppleAuth = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const email = usePrivateRelay ? 'k9x2m4p8z@privaterelay.appleid.com' : 'athlete@icloud.com';
      onLoginSuccess({
        username: customName || 'SwiftReflex_Pro',
        email,
        authProvider: 'apple',
        verifiedAthlete: true,
      });
      setActiveScreen('SUCCESS');
    }, 1200);
  };

  const handleEmailAuth = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess({
        username: customName || emailInput.split('@')[0],
        email: emailInput,
        authProvider: 'google',
        verifiedAthlete: true,
      });
      setActiveScreen('SUCCESS');
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020b1c]/85 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-md bg-[#00122e] border border-red-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#12284c] bg-[#020b1c]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-red-600/20 border border-red-500/40 text-yellow-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-sm tracking-tight text-white">WREACT Identity</h2>
              <p className="text-[10px] text-slate-300">Sync scores & get Verified Athlete badge</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#12284c] transition-all"
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
                <div className="w-20 h-20 mx-auto rounded-3xl bg-slate-950 border-2 border-emerald-500/50 p-1 flex items-center justify-center text-4xl shadow-xl shadow-emerald-500/10">
                  {userProfile.avatar}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 p-1 rounded-full border-2 border-slate-900" title="Verified Athlete">
                  <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-center gap-1.5">
                  <h3 className="text-lg font-black text-white">{userProfile.username}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold flex items-center gap-1">
                    Verified
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">{userProfile.email}</p>
                <div className="mt-2 text-[11px] text-slate-400 bg-slate-950 border border-slate-800/80 rounded-xl p-2.5 inline-flex items-center gap-2">
                  {userProfile.authProvider === 'google' ? (
                    <span className="flex items-center gap-1.5 font-medium text-slate-200">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                      Signed in with Google Account
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 font-medium text-slate-200">
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 170 170">
                        <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-5.01.12-9.87-1.95-14.58-6.23-3.08-2.63-6.94-7.23-11.59-13.82-5.74-8.17-10.36-17.15-13.88-26.96-3.51-9.81-5.27-19.32-5.27-28.53 0-12.28 3.09-22.65 9.27-31.11 6.18-8.46 14.15-12.83 23.91-13.12 4.13 0 8.89 1.12 14.28 3.35 5.39 2.23 9.38 3.35 11.97 3.35 2.35 0 6.39-1.12 12.13-3.35 5.73-2.23 10.33-3.26 13.79-3.09 10.37.59 18.59 4.39 24.66 11.41-9.2 5.56-13.68 13.39-13.44 23.48.24 7.94 3.22 14.59 8.94 19.95 5.72 5.36 12.65 8.35 20.79 8.97-.83 4.88-2.22 9.87-4.17 14.97zM119.22 31.02c0-6.12 2.23-11.88 6.69-17.28 4.46-5.4 10.11-8.77 16.95-10.11.47 1.18.7 2.36.7 3.53 0 6.01-2.29 11.83-6.87 17.47-4.58 5.64-10.23 8.94-16.95 9.9-.12-.83-.24-1.67-.24-2.51z"/>
                      </svg>
                      Signed in with Apple ID
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex flex-col gap-2">
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-xs transition-all shadow-lg shadow-indigo-600/20"
                >
                  Continue to Game
                </button>
                <button
                  onClick={() => {
                    onSignOut();
                    setActiveScreen('CHOICE');
                  }}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-rose-400 font-semibold rounded-2xl text-xs transition-all"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : activeScreen === 'CHOICE' ? (
            <>
              {/* Value prop banner */}
              <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900 border border-indigo-500/30 rounded-2xl p-4 text-center space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[11px] font-bold">
                  <Sparkles className="w-3 h-3" /> Global Leaderboard Verification
                </div>
                <h3 className="font-black text-sm text-white">Unlock Verified Athlete Status</h3>
                <p className="text-xs text-slate-300">
                  Protect your daily streaks, sync scores across iOS & Android, and display a verified badge next to your country flag.
                </p>
              </div>

              {/* Login Buttons */}
              <div className="space-y-3 pt-2">
                {/* Google Sign In Button */}
                <button
                  onClick={() => setActiveScreen('GOOGLE')}
                  className="w-full py-3.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-2xl text-sm transition-all flex items-center justify-center gap-3 shadow-lg shadow-white/10 active:scale-[0.98]"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Continue with Google</span>
                </button>

                {/* Apple Sign In Button */}
                <button
                  onClick={() => setActiveScreen('APPLE')}
                  className="w-full py-3.5 px-4 bg-slate-950 hover:bg-black border border-slate-700 text-white font-bold rounded-2xl text-sm transition-all flex items-center justify-center gap-3 shadow-lg active:scale-[0.98]"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 170 170">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-5.01.12-9.87-1.95-14.58-6.23-3.08-2.63-6.94-7.23-11.59-13.82-5.74-8.17-10.36-17.15-13.88-26.96-3.51-9.81-5.27-19.32-5.27-28.53 0-12.28 3.09-22.65 9.27-31.11 6.18-8.46 14.15-12.83 23.91-13.12 4.13 0 8.89 1.12 14.28 3.35 5.39 2.23 9.38 3.35 11.97 3.35 2.35 0 6.39-1.12 12.13-3.35 5.73-2.23 10.33-3.26 13.79-3.09 10.37.59 18.59 4.39 24.66 11.41-9.2 5.56-13.68 13.39-13.44 23.48.24 7.94 3.22 14.59 8.94 19.95 5.72 5.36 12.65 8.35 20.79 8.97-.83 4.88-2.22 9.87-4.17 14.97zM119.22 31.02c0-6.12 2.23-11.88 6.69-17.28 4.46-5.4 10.11-8.77 16.95-10.11.47 1.18.7 2.36.7 3.53 0 6.01-2.29 11.83-6.87 17.47-4.58 5.64-10.23 8.94-16.95 9.9-.12-.83-.24-1.67-.24-2.51z"/>
                  </svg>
                  <span>Sign in with Apple</span>
                </button>

                {/* Email Sign In Button */}
                <button
                  onClick={() => setActiveScreen('EMAIL')}
                  className="w-full py-3.5 px-4 bg-[#020b1c] hover:bg-[#12284c] border border-red-500/40 text-white font-bold rounded-2xl text-sm transition-all flex items-center justify-center gap-3 shadow-lg active:scale-[0.98]"
                >
                  <Mail className="w-5 h-5 text-yellow-400" />
                  <span>Continue with Email</span>
                </button>
              </div>

              {/* Guest option */}
              <div className="pt-3 text-center">
                <button
                  onClick={onClose}
                  className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-4 font-medium"
                >
                  Continue as Guest Athlete
                </button>
              </div>
            </>
          ) : activeScreen === 'EMAIL' ? (
            /* EMAIL FLOW */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-yellow-400" />
                  <span className="font-bold text-sm text-white">Email Authentication</span>
                </div>
                <button
                  onClick={() => setActiveScreen('CHOICE')}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Back
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <label className="block text-[11px] font-mono text-slate-400 uppercase">Email Address</label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                  placeholder="athlete@fastreflex.com"
                />

                <label className="block text-[11px] font-mono text-slate-400 uppercase pt-1">Athlete Handle</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                  placeholder="Athlete Username"
                />

                {emailSent && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-800">
                    <label className="block text-[11px] font-mono text-slate-400 uppercase">Verification Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={emailCode}
                      onChange={(e) => setEmailCode(e.target.value)}
                      className="w-full bg-slate-900 border border-yellow-400/50 rounded-xl px-3 py-2 text-xs text-center font-mono tracking-widest text-white focus:outline-none"
                      placeholder="Enter 4-digit code"
                    />
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  if (!emailSent) {
                    setEmailSent(true);
                  } else {
                    handleEmailAuth();
                  }
                }}
                disabled={loading || !emailInput}
                className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:bg-slate-800 text-white font-bold rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Verifying Athlete Pass...</span>
                  </>
                ) : emailSent ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-yellow-400" />
                    <span>Complete Email Verification</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>Send Verification Code</span>
                  </>
                )}
              </button>
            </div>
          ) : activeScreen === 'GOOGLE' ? (
            /* GOOGLE OAUTH FLOW SIMULATION */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span className="font-bold text-sm text-white">Google Accounts Sign In</span>
                </div>
                <button
                  onClick={() => setActiveScreen('CHOICE')}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Back
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <label className="block text-[11px] font-mono text-slate-400 uppercase">Selected Google Account</label>
                <input
                  type="email"
                  value={googleAccount}
                  onChange={(e) => setGoogleAccount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  placeholder="name@gmail.com"
                />

                <label className="block text-[11px] font-mono text-slate-400 uppercase pt-1">Gamer Tag Name</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
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
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
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
          ) : activeScreen === 'APPLE' ? (
            /* APPLE ID OAUTH FLOW SIMULATION */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 170 170">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-5.01.12-9.87-1.95-14.58-6.23-3.08-2.63-6.94-7.23-11.59-13.82-5.74-8.17-10.36-17.15-13.88-26.96-3.51-9.81-5.27-19.32-5.27-28.53 0-12.28 3.09-22.65 9.27-31.11 6.18-8.46 14.15-12.83 23.91-13.12 4.13 0 8.89 1.12 14.28 3.35 5.39 2.23 9.38 3.35 11.97 3.35 2.35 0 6.39-1.12 12.13-3.35 5.73-2.23 10.33-3.26 13.79-3.09 10.37.59 18.59 4.39 24.66 11.41-9.2 5.56-13.68 13.39-13.44 23.48.24 7.94 3.22 14.59 8.94 19.95 5.72 5.36 12.65 8.35 20.79 8.97-.83 4.88-2.22 9.87-4.17 14.97zM119.22 31.02c0-6.12 2.23-11.88 6.69-17.28 4.46-5.4 10.11-8.77 16.95-10.11.47 1.18.7 2.36.7 3.53 0 6.01-2.29 11.83-6.87 17.47-4.58 5.64-10.23 8.94-16.95 9.9-.12-.83-.24-1.67-.24-2.51z"/>
                  </svg>
                  <span className="font-bold text-sm text-white">Apple ID Authentication</span>
                </div>
                <button
                  onClick={() => setActiveScreen('CHOICE')}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Back
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <label className="block text-[11px] font-mono text-slate-400 uppercase">Gamer Tag Name</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white"
                  placeholder="SwiftReflex_Pro"
                />

                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <span className="block text-[11px] font-mono text-slate-400 uppercase">Apple Privacy Settings</span>
                  
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="appleEmail"
                      checked={usePrivateRelay}
                      onChange={() => setUsePrivateRelay(true)}
                      className="accent-white"
                    />
                    <span>Hide My Email (Private Relay)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="appleEmail"
                      checked={!usePrivateRelay}
                      onChange={() => setUsePrivateRelay(false)}
                      className="accent-white"
                    />
                    <span>Share My Email (athlete@icloud.com)</span>
                  </label>
                </div>
              </div>

              <button
                onClick={handleAppleAuth}
                disabled={loading}
                className="w-full py-3 bg-white hover:bg-slate-100 disabled:bg-slate-400 text-slate-950 font-bold rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
                    <span>Verifying Face ID / Touch ID...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Confirm with Apple ID</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* SUCCESS STATE */
            <div className="text-center py-4 space-y-4 animate-scale-up">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-3xl">
                ✓
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Authentication Successful!</h3>
                <p className="text-xs text-slate-300 mt-1">
                  You are now signed in and verified as a <span className="text-emerald-400 font-bold">Verified Athlete</span>.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-2xl text-xs shadow-lg shadow-emerald-500/20"
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
