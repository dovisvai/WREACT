import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { COUNTRIES, AVATARS, getCountryFlag, getCountryName, INITIAL_COUNTRY_STATS } from '../utils/countries';
import { playClickSound, playFanfareSound, playSignalSound, triggerHaptic } from '../utils/audio';
import { 
  Zap, 
  MapPin, 
  Sparkles, 
  ArrowRight, 
  Check, 
  CheckCircle2, 
  ShieldCheck, 
  RotateCw, 
  Mail, 
  Lock, 
  Globe, 
  Search, 
  User, 
  Dices,
  ChevronRight
} from 'lucide-react';

interface OnboardingWizardProps {
  isOpen: boolean;
  initialProfile: UserProfile;
  onComplete: (updatedProfile: Partial<UserProfile>) => void;
}

const NICKNAME_PRESETS = [
  'SpeedDemon',
  'ApexReflex',
  'VeloceF1',
  'SynapseGod',
  'HyperNova',
  'FlashRunner',
  'VoltStriker',
  'SonicReflex',
  'NeuralGhost',
  'QuantumPulse'
];

// Comprehensive TimeZone to ISO 2-letter Country Mapping for instant fallback auto-detection
function detectCountryFromTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return 'US';
    
    if (tz.startsWith('America/New_York') || tz.startsWith('America/Chicago') || tz.startsWith('America/Los_Angeles') || tz.startsWith('America/Denver')) return 'US';
    if (tz.startsWith('America/Toronto') || tz.startsWith('America/Vancouver') || tz.startsWith('America/Montreal')) return 'CA';
    if (tz.startsWith('America/Sao_Paulo')) return 'BR';
    if (tz.startsWith('America/Mexico_City')) return 'MX';
    if (tz.startsWith('America/Bogota')) return 'CO';
    if (tz.startsWith('America/Argentina')) return 'AR';
    
    if (tz.startsWith('Europe/London')) return 'GB';
    if (tz.startsWith('Europe/Berlin') || tz.startsWith('Europe/Busingen')) return 'DE';
    if (tz.startsWith('Europe/Paris')) return 'FR';
    if (tz.startsWith('Europe/Rome')) return 'IT';
    if (tz.startsWith('Europe/Madrid')) return 'ES';
    if (tz.startsWith('Europe/Vilnius')) return 'LT';
    if (tz.startsWith('Europe/Riga')) return 'LV';
    if (tz.startsWith('Europe/Tallinn')) return 'EE';
    if (tz.startsWith('Europe/Warsaw')) return 'PL';
    if (tz.startsWith('Europe/Amsterdam')) return 'NL';
    if (tz.startsWith('Europe/Brussels')) return 'BE';
    if (tz.startsWith('Europe/Stockholm')) return 'SE';
    if (tz.startsWith('Europe/Oslo')) return 'NO';
    if (tz.startsWith('Europe/Helsinki')) return 'FI';
    if (tz.startsWith('Europe/Copenhagen')) return 'DK';
    if (tz.startsWith('Europe/Vienna')) return 'AT';
    if (tz.startsWith('Europe/Zurich')) return 'CH';
    if (tz.startsWith('Europe/Dublin')) return 'IE';
    if (tz.startsWith('Europe/Lisbon')) return 'PT';
    if (tz.startsWith('Europe/Athens')) return 'GR';
    if (tz.startsWith('Europe/Prague')) return 'CZ';
    if (tz.startsWith('Europe/Budapest')) return 'HU';
    if (tz.startsWith('Europe/Bucharest')) return 'RO';
    if (tz.startsWith('Europe/Kyiv')) return 'UA';
    
    if (tz.startsWith('Asia/Tokyo')) return 'JP';
    if (tz.startsWith('Asia/Seoul')) return 'KR';
    if (tz.startsWith('Asia/Shanghai') || tz.startsWith('Asia/Chongqing')) return 'CN';
    if (tz.startsWith('Asia/Hong_Kong')) return 'HK';
    if (tz.startsWith('Asia/Taipei')) return 'TW';
    if (tz.startsWith('Asia/Singapore')) return 'SG';
    if (tz.startsWith('Asia/Kolkata')) return 'IN';
    if (tz.startsWith('Asia/Jakarta')) return 'ID';
    if (tz.startsWith('Asia/Bangkok')) return 'TH';
    if (tz.startsWith('Asia/Dubai')) return 'AE';
    if (tz.startsWith('Asia/Riyadh')) return 'SA';
    if (tz.startsWith('Asia/Manila')) return 'PH';
    if (tz.startsWith('Asia/Kuala_Lumpur')) return 'MY';
    
    if (tz.startsWith('Australia/Sydney') || tz.startsWith('Australia/Melbourne') || tz.startsWith('Australia/Brisbane') || tz.startsWith('Australia/Perth')) return 'AU';
    if (tz.startsWith('Pacific/Auckland')) return 'NZ';
    if (tz.startsWith('Africa/Johannesburg')) return 'ZA';
    if (tz.startsWith('Africa/Cairo')) return 'EG';
    if (tz.startsWith('Africa/Lagos')) return 'NG';
    if (tz.startsWith('Africa/Nairobi')) return 'KE';

    return 'US';
  } catch {
    return 'US';
  }
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  isOpen,
  initialProfile,
  onComplete,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [nickname, setNickname] = useState(initialProfile.username || 'SpeedReflex');
  const [avatar, setAvatar] = useState(initialProfile.avatar || '⚡');
  const [country, setCountry] = useState(initialProfile.country || detectCountryFromTimezone());
  const [countrySearch, setCountrySearch] = useState('');
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationDetectedMessage, setLocationDetectedMessage] = useState<string | null>(null);

  // Auth Choice State
  const [authProvider, setAuthProvider] = useState<'guest' | 'google' | 'apple' | 'email'>('guest');
  const [emailInput, setEmailInput] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailStep, setEmailStep] = useState<'INPUT' | 'VERIFY'>('INPUT');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authSuccessData, setAuthSuccessData] = useState<{
    email?: string;
    authProvider: 'guest' | 'google' | 'apple' | 'email';
    verifiedAthlete: boolean;
    photoUrl?: string;
  }>({
    authProvider: 'guest',
    verifiedAthlete: false,
  });

  if (!isOpen) return null;

  const handleNextFromStep1 = () => {
    if (!nickname.trim()) return;
    playClickSound();
    triggerHaptic(30);
    setStep(2);
  };

  const handleRandomizeNickname = () => {
    playClickSound();
    const randomName = NICKNAME_PRESETS[Math.floor(Math.random() * NICKNAME_PRESETS.length)];
    const randomNum = Math.floor(Math.random() * 900) + 100;
    setNickname(`${randomName}_${randomNum}`);
  };

  const handleGeoLocate = () => {
    setIsDetectingLocation(true);
    setLocationDetectedMessage(null);
    playSignalSound();
    triggerHaptic(40);

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // Attempt reverse geocoding via OpenStreetMap Nominatim with fast timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);

            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&zoom=3`,
              { signal: controller.signal, headers: { 'User-Agent': 'WREACT-App' } }
            );
            clearTimeout(timeoutId);

            if (res.ok) {
              const data = await res.json();
              const detectedCode = data.address?.country_code?.toUpperCase();
              if (detectedCode && COUNTRIES.some((c) => c.code === detectedCode)) {
                setCountry(detectedCode);
                setLocationDetectedMessage(`📍 GPS Located: ${getCountryName(detectedCode)} (${getCountryFlag(detectedCode)})`);
                setIsDetectingLocation(false);
                return;
              }
            }
          } catch {
            // fallback to timezone
          }

          const fallbackCode = detectCountryFromTimezone();
          setCountry(fallbackCode);
          setLocationDetectedMessage(`📍 Located via Timezone: ${getCountryName(fallbackCode)} (${getCountryFlag(fallbackCode)})`);
          setIsDetectingLocation(false);
        },
        () => {
          // Denied or error -> fallback to timezone
          const fallbackCode = detectCountryFromTimezone();
          setCountry(fallbackCode);
          setLocationDetectedMessage(`📍 Timezone Localized: ${getCountryName(fallbackCode)} (${getCountryFlag(fallbackCode)})`);
          setIsDetectingLocation(false);
        },
        { timeout: 3500 }
      );
    } else {
      const fallbackCode = detectCountryFromTimezone();
      setCountry(fallbackCode);
      setLocationDetectedMessage(`📍 Timezone Localized: ${getCountryName(fallbackCode)} (${getCountryFlag(fallbackCode)})`);
      setIsDetectingLocation(false);
    }
  };

  const handleNextFromStep2 = () => {
    playClickSound();
    triggerHaptic(30);
    setStep(3);
  };

  // Auth Handlers
  const handleAppleLogin = () => {
    setIsAuthenticating(true);
    triggerHaptic(50);
    setTimeout(() => {
      setIsAuthenticating(false);
      setAuthProvider('apple');
      setAuthSuccessData({
        email: `${nickname.toLowerCase().replace(/[^a-z0-9]/g, '')}@privaterelay.appleid.com`,
        authProvider: 'apple',
        verifiedAthlete: true,
      });
      playFanfareSound();
      setStep(4);
    }, 1000);
  };

  const handleGoogleLogin = () => {
    setIsAuthenticating(true);
    triggerHaptic(50);
    setTimeout(() => {
      setIsAuthenticating(false);
      setAuthProvider('google');
      setAuthSuccessData({
        email: `${nickname.toLowerCase().replace(/[^a-z0-9]/g, '')}.athlete@gmail.com`,
        authProvider: 'google',
        verifiedAthlete: true,
        photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      });
      playFanfareSound();
      setStep(4);
    }, 1000);
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) return;
    setIsAuthenticating(true);
    triggerHaptic(40);
    setTimeout(() => {
      setIsAuthenticating(false);
      setEmailStep('VERIFY');
      playSignalSound();
    }, 800);
  };

  const handleVerifyEmailCode = () => {
    setIsAuthenticating(true);
    triggerHaptic(50);
    setTimeout(() => {
      setIsAuthenticating(false);
      setAuthProvider('email');
      setAuthSuccessData({
        email: emailInput,
        authProvider: 'email',
        verifiedAthlete: true,
      });
      playFanfareSound();
      setStep(4);
    }, 900);
  };

  const handleContinueAsGuest = () => {
    playClickSound();
    triggerHaptic(30);
    setAuthProvider('guest');
    setAuthSuccessData({
      authProvider: 'guest',
      verifiedAthlete: false,
    });
    setStep(4);
  };

  const handleFinishOnboarding = () => {
    playFanfareSound();
    triggerHaptic([50, 50, 100]);

    const updated: Partial<UserProfile> = {
      username: nickname.trim() || 'ReflexAthlete',
      avatar,
      country,
      isLoggedIn: authSuccessData.authProvider !== 'guest',
      authProvider: authSuccessData.authProvider === 'email' ? 'google' : authSuccessData.authProvider,
      email: authSuccessData.email || '',
      verifiedAthlete: authSuccessData.verifiedAthlete,
    };

    onComplete(updated);
  };

  // Filtered country list for Step 2
  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const countryStat = INITIAL_COUNTRY_STATS.find((cs) => cs.country === country);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020b1c]/95 backdrop-blur-xl p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#00122e] border-2 border-red-500/50 rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.25)] overflow-hidden flex flex-col text-slate-100 my-auto">
        
        {/* Top Branding & Progress Stepper */}
        <div className="px-6 pt-5 pb-3 bg-[#020b1c] border-b border-[#12284c] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center shadow-lg border border-yellow-400/50">
                <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400 animate-pulse" />
              </div>
              <h1 className="font-extrabold text-base tracking-wider text-white">
                <span className="text-red-500 font-black">W</span>
                <span className="text-yellow-400 font-black">REACT</span>
                <span className="text-slate-400 text-xs font-mono ml-1.5 uppercase font-normal">Setup</span>
              </h1>
            </div>

            <div className="text-[11px] font-mono font-bold text-yellow-400 bg-[#00122e] px-2.5 py-1 rounded-full border border-yellow-400/30">
              Step {step} of 4
            </div>
          </div>

          {/* Stepper Bar */}
          <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
            <div className={`h-full transition-all duration-300 ${step >= 1 ? 'bg-red-500' : 'bg-transparent'}`} />
            <div className={`h-full transition-all duration-300 ${step >= 2 ? 'bg-red-500' : 'bg-transparent'}`} />
            <div className={`h-full transition-all duration-300 ${step >= 3 ? 'bg-red-500' : 'bg-transparent'}`} />
            <div className={`h-full transition-all duration-300 ${step >= 4 ? 'bg-yellow-400' : 'bg-transparent'}`} />
          </div>
        </div>

        {/* STEP 1: NICKNAME & AVATAR */}
        {step === 1 && (
          <div className="p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-1">
              <span className="text-[10px] font-mono uppercase font-black tracking-widest text-red-400 bg-red-950/60 px-2.5 py-0.5 rounded-full border border-red-800/50">
                Athlete Registration
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white">Choose Your Identity</h2>
              <p className="text-xs text-slate-300">
                Pick your reflex badge avatar and leaderboard athlete nickname.
              </p>
            </div>

            {/* Avatar Selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center justify-between">
                <span>Select Emblem</span>
                <span className="text-yellow-400 font-mono text-xs">Current: {avatar}</span>
              </label>
              <div className="grid grid-cols-8 gap-2 bg-[#020b1c] p-2.5 rounded-2xl border border-[#12284c]">
                {AVATARS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => {
                      setAvatar(av);
                      playClickSound();
                      triggerHaptic(20);
                    }}
                    className={`h-10 rounded-xl flex items-center justify-center text-xl transition-all ${
                      avatar === av
                        ? 'bg-red-600 text-white scale-110 border-2 border-yellow-400 shadow-lg'
                        : 'bg-[#00122e] hover:bg-[#12284c] text-slate-300'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            {/* Nickname Input & Randomize */}
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center justify-between">
                <span>Athlete Nickname</span>
                <button
                  type="button"
                  onClick={handleRandomizeNickname}
                  className="text-yellow-400 hover:text-yellow-300 text-[11px] font-bold flex items-center gap-1 transition-colors"
                >
                  <Dices className="w-3.5 h-3.5" />
                  Randomize
                </button>
              </label>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">@</span>
                <input
                  type="text"
                  maxLength={18}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Enter your nickname..."
                  className="w-full bg-[#020b1c] border-2 border-[#12284c] focus:border-yellow-400 rounded-2xl pl-8 pr-4 py-3 text-sm text-white font-extrabold placeholder-slate-500 focus:outline-none transition-all"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                {NICKNAME_PRESETS.slice(0, 5).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setNickname(preset);
                      playClickSound();
                    }}
                    className="px-2.5 py-1 rounded-xl bg-[#020b1c] hover:bg-[#12284c] border border-[#12284c] text-[10px] font-bold text-slate-300 whitespace-nowrap transition-all"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Next Button */}
            <button
              disabled={!nickname.trim()}
              onClick={handleNextFromStep1}
              className={`w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all ${
                nickname.trim()
                  ? 'bg-gradient-to-r from-red-600 via-red-500 to-yellow-400 text-slate-950 hover:brightness-110 active:scale-98 border border-yellow-300'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>Continue to Country Selection</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        )}

        {/* STEP 2: COUNTRY & GEO-LOCATE */}
        {step === 2 && (
          <div className="p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[75vh] overflow-y-auto">
            <div className="text-center space-y-1">
              <span className="text-[10px] font-mono uppercase font-black tracking-widest text-yellow-400 bg-yellow-950/60 px-2.5 py-0.5 rounded-full border border-yellow-800/50">
                Country World Cup
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white">Represent Your Nation</h2>
              <p className="text-xs text-slate-300">
                Auto-detect your location or choose your flag for global country rankings.
              </p>
            </div>

            {/* Geo-Locate Action Banner */}
            <div className="bg-gradient-to-r from-red-950/60 via-[#00122e] to-yellow-950/40 border border-red-500/40 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600/30 border border-yellow-400/40 flex items-center justify-center text-yellow-400 shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-xs text-white">Instant GPS Auto-Detect</h4>
                  <p className="text-[10px] text-slate-300">Fast geo-locate with timezone fallback</p>
                </div>
              </div>

              <button
                type="button"
                disabled={isDetectingLocation}
                onClick={handleGeoLocate}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 shrink-0"
              >
                {isDetectingLocation ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Locating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                    <span>Auto-Detect Country</span>
                  </>
                )}
              </button>
            </div>

            {locationDetectedMessage && (
              <div className="bg-emerald-950/60 border border-emerald-500/50 rounded-xl p-2.5 text-center text-xs text-emerald-300 font-bold animate-fade-in">
                {locationDetectedMessage}
              </div>
            )}

            {/* Selected Nation Highlight Card */}
            <div className="bg-[#020b1c] border-2 border-yellow-400/60 rounded-2xl p-3.5 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <span className="text-3xl leading-none">{getCountryFlag(country)}</span>
                <div>
                  <span className="text-[10px] font-mono uppercase text-yellow-400 font-bold block">Selected Flag</span>
                  <h3 className="text-sm font-black text-white">{getCountryName(country)}</h3>
                </div>
              </div>

              {countryStat && (
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-mono">National Avg</span>
                  <span className="text-sm font-black text-yellow-400 font-mono">{countryStat.avgMs} ms</span>
                </div>
              )}
            </div>

            {/* Searchable Country Selector */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  placeholder="Search countries (e.g. Lithuania, Germany, USA)..."
                  className="w-full bg-[#020b1c] border border-[#12284c] rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {filteredCountries.slice(0, 36).map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      setCountry(c.code);
                      playClickSound();
                      triggerHaptic(20);
                    }}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all text-left ${
                      country === c.code
                        ? 'bg-red-600/40 border-yellow-400 text-yellow-300 font-black'
                        : 'bg-[#020b1c] border-[#12284c] text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-base leading-none shrink-0">{c.flag}</span>
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Next Button */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-3 rounded-2xl bg-[#020b1c] hover:bg-[#12284c] border border-[#12284c] text-slate-300 font-bold text-xs"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNextFromStep2}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-yellow-400 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl hover:brightness-110 active:scale-98 border border-yellow-300"
              >
                <span>Continue to Cloud Sync</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: LOGIN / SYNC (Apple, Google, Email, Guest) */}
        {step === 3 && (
          <div className="p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-1">
              <span className="text-[10px] font-mono uppercase font-black tracking-widest text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800/50">
                Secure Reflex ID
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white">Sign In & Sync Stats</h2>
              <p className="text-xs text-slate-300">
                Save your reaction speed scores across devices and unlock the Verified Athlete mark.
              </p>
            </div>

            {/* Apple & Google One-Tap Buttons */}
            <div className="space-y-2.5">
              {/* Apple Sign-In */}
              <button
                type="button"
                disabled={isAuthenticating}
                onClick={handleAppleLogin}
                className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 font-black text-xs flex items-center justify-center gap-2.5 shadow-lg transition-all active:scale-98 disabled:opacity-50"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.84c.62-.75 1.04-1.8 1.01-2.84-.96.04-2.13.64-2.79 1.41-.58.68-1.1 1.74-1.02 2.78 1.08.08 2.18-.6 2.8-1.35z"/>
                </svg>
                <span>{isAuthenticating ? 'Connecting to Apple ID...' : 'Continue with Apple'}</span>
              </button>

              {/* Google Sign-In */}
              <button
                type="button"
                disabled={isAuthenticating}
                onClick={handleGoogleLogin}
                className="w-full py-3 px-4 rounded-2xl bg-[#020b1c] hover:bg-[#12284c] border border-slate-700 text-white font-extrabold text-xs flex items-center justify-center gap-2.5 shadow-lg transition-all active:scale-98 disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>{isAuthenticating ? 'Connecting to Google...' : 'Continue with Google'}</span>
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-[#12284c]" />
              <span className="text-[10px] font-bold text-slate-500 uppercase">or via Email</span>
              <div className="h-px flex-1 bg-[#12284c]" />
            </div>

            {/* Email Form */}
            {emailStep === 'INPUT' ? (
              <form onSubmit={handleEmailSubmit} className="space-y-2">
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="name@athlete.com"
                    className="w-full bg-[#020b1c] border border-[#12284c] focus:border-yellow-400 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!emailInput || isAuthenticating}
                  className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Send Magic Login Code</span>
                </button>
              </form>
            ) : (
              <div className="space-y-2 bg-[#020b1c] p-3 rounded-2xl border border-yellow-400/40 animate-fade-in">
                <div className="text-xs text-slate-200">
                  Enter 4-digit code sent to <span className="text-yellow-400 font-mono">{emailInput}</span>:
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value)}
                    placeholder="Enter code (e.g. 7749)"
                    className="flex-1 bg-[#00122e] border border-[#12284c] rounded-xl px-3 py-2 text-xs font-mono text-center tracking-widest text-white focus:outline-none focus:border-yellow-400"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyEmailCode}
                    className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs rounded-xl shadow-md"
                  >
                    Verify
                  </button>
                </div>
              </div>
            )}

            {/* Skip as Guest */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleContinueAsGuest}
                className="text-xs text-slate-400 hover:text-white font-bold inline-flex items-center gap-1 transition-colors"
              >
                <span>Play as Guest for now</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: PASSPORT READY CELEBRATION */}
        {step === 4 && (
          <div className="p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-full bg-yellow-400/20 border border-yellow-400 text-yellow-400 flex items-center justify-center mx-auto shadow-xl animate-bounce">
                <Sparkles className="w-6 h-6 fill-current" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">Reflex Passport Activated!</h2>
              <p className="text-xs text-slate-300">
                Your athlete profile is primed for world competition.
              </p>
            </div>

            {/* Holographic Athlete ID Card */}
            <div className="bg-gradient-to-br from-[#001433] via-[#020b1c] to-[#1c0000] border-2 border-yellow-400 rounded-3xl p-4 shadow-2xl relative overflow-hidden space-y-3">
              {/* Watermark */}
              <div className="absolute right-2 -bottom-4 text-7xl font-black text-white/5 select-none pointer-events-none font-mono">
                WREACT
              </div>

              <div className="flex items-center justify-between border-b border-[#12284c] pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  <span className="text-[10px] font-black uppercase text-yellow-400 font-mono">
                    GLOBAL ATHLETE PASSPORT
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 font-bold">
                  ID: #{Math.random().toString(36).substring(2, 8).toUpperCase()}
                </span>
              </div>

              <div className="flex items-center gap-3.5 pt-1">
                <div className="w-14 h-14 rounded-2xl bg-[#020b1c] border-2 border-yellow-400/60 flex items-center justify-center text-3xl shadow-lg relative shrink-0">
                  {avatar}
                  <span className="absolute -bottom-1 -right-1 text-sm leading-none">
                    {getCountryFlag(country)}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-black text-white truncate">{nickname}</h3>
                    {authSuccessData.verifiedAthlete && (
                      <ShieldCheck className="w-4 h-4 text-yellow-400 shrink-0" title="Verified Athlete" />
                    )}
                  </div>
                  <p className="text-xs text-slate-300 font-bold flex items-center gap-1">
                    <span>{getCountryName(country)}</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-mono">
                      {authSuccessData.verifiedAthlete ? 'Verified ID' : 'Guest Pass'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Badges / Highlights */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                <div className="bg-[#020b1c] p-2 rounded-xl border border-[#12284c]">
                  <span className="text-[9px] text-slate-400 block font-mono">RANK TIER</span>
                  <span className="font-extrabold text-yellow-400 text-xs">Contender</span>
                </div>
                <div className="bg-[#020b1c] p-2 rounded-xl border border-[#12284c]">
                  <span className="text-[9px] text-slate-400 block font-mono">STREAK</span>
                  <span className="font-extrabold text-red-400 text-xs">Day 1</span>
                </div>
                <div className="bg-[#020b1c] p-2 rounded-xl border border-[#12284c]">
                  <span className="text-[9px] text-slate-400 block font-mono">WORLD CUP</span>
                  <span className="font-extrabold text-white text-xs">{country} Team</span>
                </div>
              </div>
            </div>

            {/* Launch CTA */}
            <button
              type="button"
              onClick={handleFinishOnboarding}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-yellow-400 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-2xl hover:brightness-110 active:scale-98 transition-all border-2 border-yellow-300"
            >
              <Zap className="w-5 h-5 fill-slate-950 text-slate-950" />
              <span>Enter WREACT Arena Now</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
