import React, { useState } from 'react';
import { DollarSign, Zap, Sparkles, TrendingUp, ShieldCheck, Trophy, Award, Gift, Video, BarChart3, Users, X, ArrowRight, Play, CheckCircle2 } from 'lucide-react';

interface MonetizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  proPassActive?: boolean;
  onActivateProPass?: () => void;
}

export const MonetizationModal: React.FC<MonetizationModalProps> = ({
  isOpen,
  onClose,
  proPassActive = false,
  onActivateProPass,
}) => {
  const [viralAudience, setViralAudience] = useState<number>(1000000); // 1 Million Monthly Active Users
  const [selectedTab, setSelectedTab] = useState<'CALCULATOR' | 'ROADMAP' | 'PRO_PASS'>('CALCULATOR');

  if (!isOpen) return null;

  // Revenue Calculations based on MAU
  const subscriptionConversion = 0.025; // 2.5% conversion to $3.99/mo Pro Pass
  const subRevenue = viralAudience * subscriptionConversion * 3.99;

  const sponsoredEventsRevenue = Math.min(Math.floor(viralAudience / 250000) * 12500, 150000); // $12.5k per 250k MAU sponsor deal

  const adEcpm = 18; // $18 eCPM
  const adsPerUserPerMonth = 4;
  const adRevenue = (viralAudience * adsPerUserPerMonth * adEcpm) / 1000;

  const cosmeticConversion = 0.035; // 3.5% buy $0.99 sound/theme pack
  const cosmeticRevenue = viralAudience * cosmeticConversion * 0.99;

  const totalMonthlyRevenue = Math.round(subRevenue + sponsoredEventsRevenue + adRevenue + cosmeticRevenue);
  const totalAnnualRevenue = Math.round(totalMonthlyRevenue * 12);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[90vh]">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-amber-500/10 via-slate-950 to-indigo-500/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-black text-base text-white tracking-tight">Viral Monetization Blueprint</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500 text-slate-950">
                  Business Hub
                </span>
              </div>
              <p className="text-xs text-slate-400">Strategy & projected revenue model for hyper-viral growth</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1.5 gap-1 text-xs font-bold">
          <button
            onClick={() => setSelectedTab('CALCULATOR')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              selectedTab === 'CALCULATOR'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Revenue Simulator
          </button>
          <button
            onClick={() => setSelectedTab('ROADMAP')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              selectedTab === 'ROADMAP'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Zap className="w-4 h-4" /> 5-Pillar Strategy
          </button>
          <button
            onClick={() => setSelectedTab('PRO_PASS')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              selectedTab === 'PRO_PASS'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4" /> VIP Pro Pass UI
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {selectedTab === 'CALCULATOR' && (
            <div className="space-y-5">
              {/* Audience Slider */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-amber-400" /> Projected Viral Scale (MAU)
                  </span>
                  <span className="text-lg font-black font-mono text-amber-400">
                    {(viralAudience / 1000000).toFixed(1)}M Monthly Active Users
                  </span>
                </div>

                <input
                  type="range"
                  min={100000}
                  max={10000000}
                  step={100000}
                  value={viralAudience}
                  onChange={(e) => setViralAudience(Number(e.target.value))}
                  className="w-full accent-amber-500 bg-slate-800 rounded-lg h-2 cursor-pointer"
                />

                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>100K Viral Spark</span>
                  <span>1M Global Trend</span>
                  <span>5M TikTok Phenomenon</span>
                  <span>10M Mega Viral</span>
                </div>
              </div>

              {/* Total Revenue Callout */}
              <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-amber-950/60 border border-emerald-500/40 rounded-2xl p-4 text-center relative overflow-hidden">
                <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider block mb-1">
                  Estimated Gross Monthly Revenue
                </span>
                <div className="text-4xl font-black font-mono text-white tracking-tight">
                  ${totalMonthlyRevenue.toLocaleString()} <span className="text-xs text-slate-400 font-normal">/ month</span>
                </div>
                <div className="text-xs text-emerald-300/80 mt-1 font-mono">
                  ${totalAnnualRevenue.toLocaleString()} projected annual run-rate
                </div>
              </div>

              {/* Revenue Channel Breakdown Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-1">
                    <Sparkles className="w-3.5 h-3.5" /> Pro Athlete Pass ($3.99/mo)
                  </div>
                  <div className="text-lg font-black font-mono text-white">${Math.round(subRevenue).toLocaleString()}</div>
                  <p className="text-[10px] text-slate-400 mt-0.5">2.5% conversion rate for pro telemetry & badges</p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-red-400 mb-1">
                    <Trophy className="w-3.5 h-3.5" /> Brand Sponsor Challenges
                  </div>
                  <div className="text-lg font-black font-mono text-white">${Math.round(sponsoredEventsRevenue).toLocaleString()}</div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Red Bull, Monster & Logitech G sponsored events</p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 mb-1">
                    <Video className="w-3.5 h-3.5" /> Rewarded Streak Repair Ads
                  </div>
                  <div className="text-lg font-black font-mono text-white">${Math.round(adRevenue).toLocaleString()}</div>
                  <p className="text-[10px] text-slate-400 mt-0.5">High eCPM 5s opt-in ads for streak saves & duels</p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400 mb-1">
                    <Gift className="w-3.5 h-3.5" /> Sound & Target Packs ($0.99)
                  </div>
                  <div className="text-lg font-black font-mono text-white">${Math.round(cosmeticRevenue).toLocaleString()}</div>
                  <p className="text-[10px] text-slate-400 mt-0.5">F1 race start audio & neon cyberpunk targets</p>
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'ROADMAP' && (
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                5 Pillars of Viral App Monetization
              </h3>

              <div className="space-y-2.5">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex items-start gap-3">
                  <span className="text-2xl p-2 rounded-xl bg-amber-500/10 text-amber-400 font-mono font-bold shrink-0">1</span>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">VIP "Pro Athlete" Subscription ($3.99/mo)</h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Unlocks millisecond telemetry breakdowns (perception vs motor lag), ad-free gameplay, gold animated avatar rings, and custom private room codes for 1v1 duels.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex items-start gap-3">
                  <span className="text-2xl p-2 rounded-xl bg-red-500/10 text-red-400 font-mono font-bold shrink-0">2</span>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">Brand Takeover Daily Challenges</h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Monetize viral reach by charging brands (Red Bull, Logitech G, Razer, Monster Energy) $10k–$50k to sponsor weekly global daily challenges with real prize pools.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex items-start gap-3">
                  <span className="text-2xl p-2 rounded-xl bg-indigo-500/10 text-indigo-400 font-mono font-bold shrink-0">3</span>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">TikTok / Reels Share Card Viral Loop</h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Generates auto-cropped 9:16 vertical video cards with reaction time comparison graphs, user country flag, and deep link QR codes for instant organic user acquisition.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex items-start gap-3">
                  <span className="text-2xl p-2 rounded-xl bg-cyan-500/10 text-cyan-400 font-mono font-bold shrink-0">4</span>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">Non-Intrusive Rewarded Ads</h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Zero forced interstitial popups. Users voluntarily watch short 5-second video ads only to repair broken daily streaks or unlock instant 1v1 rematch lives.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex items-start gap-3">
                  <span className="text-2xl p-2 rounded-xl bg-purple-500/10 text-purple-400 font-mono font-bold shrink-0">5</span>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">Esports & Athletic Benchmarking B2B API</h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      License the reaction engine & global benchmark dataset to driver academies (F1/F2), FPS esports organizations, and sports performance clinics.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'PRO_PASS' && (
            <div className="space-y-4 text-center">
              <div className="bg-gradient-to-br from-amber-500/20 via-slate-900 to-indigo-500/20 border border-amber-500/40 rounded-3xl p-5 space-y-4 relative overflow-hidden">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" /> Pro Athlete VIP Pass
                </div>

                <div>
                  <h3 className="text-2xl font-black text-white">$3.99 <span className="text-xs text-slate-400 font-normal">/ month</span></h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Upgrade to the ultimate reflex athlete package with full telemetry analysis.
                  </p>
                </div>

                <div className="space-y-2 text-left bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-xs">
                  <div className="flex items-center gap-2 text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Ad-Free Instant Reflex Testing across all modes</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Millisecond Graph Overlay (Perception vs Motor Lag)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Exclusive Golden Glow Profile Frame & Gold Verified Badge</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Private 1v1 Room Creation with Custom Rule Settings</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>All Sound & Theme Cosmetic Packs Unlocked</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (onActivateProPass) onActivateProPass();
                    onClose();
                  }}
                  className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-xl ${
                    proPassActive
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:brightness-110 shadow-orange-500/20'
                  }`}
                >
                  {proPassActive ? '✓ VIP Pro Pass Active' : 'Simulate Pro Pass Upgrade ($3.99/mo)'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-between items-center text-xs">
          <span className="text-slate-400">WREACT Viral Monetization Engine</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl"
          >
            Close Blueprint
          </button>
        </div>

      </div>
    </div>
  );
};
