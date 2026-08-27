import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Zap, 
  Sparkles, 
  TrendingUp, 
  ShieldCheck, 
  Trophy, 
  Award, 
  Gift, 
  Video, 
  BarChart3, 
  Users, 
  X, 
  ArrowRight, 
  CheckCircle2, 
  RotateCw, 
  Check, 
  FileText, 
  Lock 
} from 'lucide-react';
import { revenueCat, RevenueCatPackageInfo, RevenueCatOfferingData, DEFAULT_OFFERING } from '../services/revenuecat';
import { LegalModal } from './LegalModal';
import { playClickSound, playFanfareSound, triggerHaptic } from '../utils/audio';

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
  const [viralAudience, setViralAudience] = useState<number>(1000000); // 1M MAU
  const [selectedTab, setSelectedTab] = useState<'PRO_PASS' | 'CALCULATOR' | 'ROADMAP'>('PRO_PASS');
  
  // RevenueCat Paywall States
  const [offerings, setOfferings] = useState<RevenueCatOfferingData>(DEFAULT_OFFERING);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('$rc_monthly');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Legal Modal
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'PRIVACY' | 'TERMS' | 'EULA'>('PRIVACY');

  useEffect(() => {
    if (isOpen) {
      revenueCat.getOfferings().then((data) => {
        setOfferings(data);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Revenue Calculations based on MAU
  const subscriptionConversion = 0.025; // 2.5% conversion to $3.99/mo Pro Pass
  const subRevenue = viralAudience * subscriptionConversion * 3.99;
  const sponsoredEventsRevenue = Math.min(Math.floor(viralAudience / 250000) * 12500, 150000);
  const adEcpm = 18;
  const adsPerUserPerMonth = 4;
  const adRevenue = (viralAudience * adsPerUserPerMonth * adEcpm) / 1000;
  const cosmeticConversion = 0.035;
  const cosmeticRevenue = viralAudience * cosmeticConversion * 0.99;
  const totalMonthlyRevenue = Math.round(subRevenue + sponsoredEventsRevenue + adRevenue + cosmeticRevenue);
  const totalAnnualRevenue = Math.round(totalMonthlyRevenue * 12);

  const selectedPkg = offerings.availablePackages.find((p) => p.identifier === selectedPackageId) || offerings.availablePackages[0];

  const handlePurchase = async () => {
    if (!selectedPkg) return;
    setIsPurchasing(true);
    setStatusMessage(null);
    playClickSound();
    triggerHaptic(40);

    try {
      const result = await revenueCat.purchasePackage(selectedPkg);
      if (result.success) {
        playFanfareSound();
        triggerHaptic([50, 50, 100]);
        setStatusMessage({
          text: `🎉 Pro Athlete Unlocked via RevenueCat (${selectedPkg.product.title})!`,
          type: 'success',
        });
        if (onActivateProPass) onActivateProPass();
      }
    } catch (e) {
      setStatusMessage({
        text: 'Purchase could not be completed. Please try again.',
        type: 'error',
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    setStatusMessage(null);
    playClickSound();
    triggerHaptic(30);

    try {
      const result = await revenueCat.restorePurchases();
      if (result.restored) {
        playFanfareSound();
        setStatusMessage({
          text: '✓ Apple App Store purchases successfully restored!',
          type: 'success',
        });
        if (onActivateProPass) onActivateProPass();
      } else {
        setStatusMessage({
          text: 'No active StoreKit subscriptions found for this Apple ID.',
          type: 'info',
        });
      }
    } catch (e) {
      setStatusMessage({
        text: 'Failed to restore purchases. Please check your App Store connection.',
        type: 'error',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020b1c]/90 backdrop-blur-md p-4 animate-fade-in select-none">
        <div className="relative w-full max-w-xl bg-[#00122e] border-2 border-red-500/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[90vh]">
          
          {/* Top Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#12284c] bg-gradient-to-r from-red-600/20 via-[#020b1c] to-yellow-500/20">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-2xl bg-yellow-400/20 border border-yellow-400/40 text-yellow-400 shadow-md">
                <Sparkles className="w-5 h-5 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="font-black text-base text-white tracking-tight">WREACT StoreKit & Monetization</h2>
                  <span className="text-[9px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-yellow-400 text-slate-950">
                    RevenueCat Powered
                  </span>
                </div>
                <p className="text-xs text-slate-400">App Store In-App Purchases & Shipathon Pro Tier</p>
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
          <div className="flex border-b border-[#12284c] bg-[#001433] p-1.5 gap-1 text-xs font-bold">
            <button
              onClick={() => setSelectedTab('PRO_PASS')}
              className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                selectedTab === 'PRO_PASS'
                  ? 'bg-yellow-400 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className="w-4 h-4" /> App Store Paywall
            </button>
            <button
              onClick={() => setSelectedTab('CALCULATOR')}
              className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                selectedTab === 'CALCULATOR'
                  ? 'bg-yellow-400 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-4 h-4" /> Revenue Simulator
            </button>
            <button
              onClick={() => setSelectedTab('ROADMAP')}
              className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                selectedTab === 'ROADMAP'
                  ? 'bg-yellow-400 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Zap className="w-4 h-4" /> 5-Pillar Strategy
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            
            {/* PRO PASS (REVENUECAT STOREKIT PAYWALL) */}
            {selectedTab === 'PRO_PASS' && (
              <div className="space-y-4">
                
                {/* Status Message Notification */}
                {statusMessage && (
                  <div
                    className={`p-3 rounded-2xl text-xs font-bold flex items-center justify-between animate-fade-in ${
                      statusMessage.type === 'success'
                        ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300'
                        : statusMessage.type === 'info'
                        ? 'bg-sky-950/80 border border-sky-500/50 text-sky-300'
                        : 'bg-red-950/80 border border-red-500/50 text-red-300'
                    }`}
                  >
                    <span>{statusMessage.text}</span>
                    <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white ml-2">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Hero Plan Banner */}
                <div className="bg-gradient-to-br from-red-600/30 via-[#001433] to-yellow-500/20 border-2 border-yellow-400/70 rounded-3xl p-5 space-y-4 relative overflow-hidden shadow-2xl">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md">
                      <Sparkles className="w-3.5 h-3.5 fill-current" /> Pro Athlete VIP Pass
                    </div>

                    <span className="text-[10px] font-mono font-bold text-yellow-300 bg-black/40 px-2.5 py-0.5 rounded-full border border-yellow-400/30">
                      StoreKit Ready
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-white">Dominate Reaction Speed</h3>
                    <p className="text-xs text-slate-300 mt-1">
                      Unlock millisecond perception telemetry, unlimited 1v1 duels, and golden athlete aura.
                    </p>
                  </div>

                  {/* RevenueCat Offering Packages Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    {offerings.availablePackages.map((pkg) => {
                      const isSelected = selectedPackageId === pkg.identifier;
                      return (
                        <button
                          key={pkg.identifier}
                          type="button"
                          onClick={() => {
                            setSelectedPackageId(pkg.identifier);
                            playClickSound();
                          }}
                          className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                            isSelected
                              ? 'bg-yellow-400/15 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.25)] ring-1 ring-yellow-400'
                              : 'bg-[#020b1c] border-[#12284c] hover:border-slate-600 opacity-80'
                          }`}
                        >
                          {pkg.packageType === 'ANNUAL' && (
                            <span className="absolute -top-2 right-2 text-[9px] font-black uppercase px-2 py-0.2 bg-red-600 text-white rounded-full border border-yellow-400 shadow-sm">
                              Save 37%
                            </span>
                          )}
                          <div>
                            <div className="text-[10px] font-mono font-extrabold uppercase text-yellow-400">
                              {pkg.packageType}
                            </div>
                            <div className="text-lg font-black text-white font-mono mt-0.5">
                              {pkg.product.priceString}
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                            {pkg.packageType === 'MONTHLY' ? 'Billed monthly' : pkg.packageType === 'ANNUAL' ? 'Billed annually' : 'One-time unlock'}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Perks Checklist */}
                  <div className="space-y-2 text-left bg-[#020b1c]/90 border border-[#12284c] rounded-2xl p-3.5 text-xs">
                    <div className="flex items-center gap-2 text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-yellow-400 shrink-0" />
                      <span><strong>Zero Ads:</strong> Uninterrupted reflex testing & instant restarts</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-yellow-400 shrink-0" />
                      <span><strong>Telemetry Lab:</strong> Perception vs Motor lag reaction graphs</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-yellow-400 shrink-0" />
                      <span><strong>Golden Halo:</strong> Animated golden athlete badge on world leaderboards</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-yellow-400 shrink-0" />
                      <span><strong>Unlimited 1v1 Duels:</strong> Create private invite rooms with custom stakes</span>
                    </div>
                  </div>

                  {/* Purchase CTA via RevenueCat */}
                  <button
                    type="button"
                    disabled={isPurchasing}
                    onClick={handlePurchase}
                    className={`w-full py-4 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-2xl flex items-center justify-center gap-2 ${
                      proPassActive
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-gradient-to-r from-red-600 via-red-500 to-yellow-400 text-slate-950 hover:brightness-110 active:scale-98 border border-yellow-300'
                    }`}
                  >
                    {isPurchasing ? (
                      <>
                        <RotateCw className="w-4 h-4 animate-spin" />
                        <span>Connecting with Apple StoreKit...</span>
                      </>
                    ) : proPassActive ? (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>VIP Pro Pass Active</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 fill-slate-950" />
                        <span>Unlock with RevenueCat ({selectedPkg?.product.priceString})</span>
                      </>
                    )}
                  </button>

                  {/* Restore Purchases & Legal Disclosures (Mandatory for Apple Guideline 3.1.2) */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#12284c] text-[11px] text-slate-400">
                    <button
                      type="button"
                      disabled={isRestoring}
                      onClick={handleRestore}
                      className="hover:text-yellow-400 font-bold underline flex items-center gap-1 transition-colors"
                    >
                      {isRestoring ? (
                        <>
                          <RotateCw className="w-3 h-3 animate-spin" />
                          <span>Restoring...</span>
                        </>
                      ) : (
                        <span>Restore Purchases</span>
                      )}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setLegalModalTab('PRIVACY');
                          setLegalModalOpen(true);
                        }}
                        className="hover:text-slate-200 underline"
                      >
                        Privacy Policy
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => {
                          setLegalModalTab('EULA');
                          setLegalModalOpen(true);
                        }}
                        className="hover:text-slate-200 underline"
                      >
                        Terms & EULA
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VIRAL REVENUE CALCULATOR */}
            {selectedTab === 'CALCULATOR' && (
              <div className="space-y-5">
                <div className="bg-[#020b1c] border border-[#12284c] rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-yellow-400" /> Projected Viral Scale (MAU)
                    </span>
                    <span className="text-lg font-black font-mono text-yellow-400">
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
                    className="w-full accent-yellow-400 bg-slate-800 rounded-lg h-2 cursor-pointer"
                  />

                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>100K Viral Spark</span>
                    <span>1M Global Trend</span>
                    <span>5M TikTok Phenomenon</span>
                    <span>10M Mega Viral</span>
                  </div>
                </div>

                {/* Total Revenue Callout */}
                <div className="bg-gradient-to-r from-emerald-950/60 via-[#001433] to-yellow-950/60 border border-emerald-500/40 rounded-2xl p-4 text-center relative overflow-hidden">
                  <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider block mb-1">
                    Estimated Gross Monthly Revenue
                  </span>
                  <div className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight">
                    ${totalMonthlyRevenue.toLocaleString()} <span className="text-xs text-slate-400 font-normal">/ month</span>
                  </div>
                  <div className="text-xs text-emerald-300/80 mt-1 font-mono">
                    ${totalAnnualRevenue.toLocaleString()} projected annual run-rate
                  </div>
                </div>

                {/* Revenue Channel Breakdown Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-[#020b1c] border border-[#12284c] rounded-2xl p-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-yellow-400 mb-1">
                      <Sparkles className="w-3.5 h-3.5" /> RevenueCat Subscriptions
                    </div>
                    <div className="text-lg font-black font-mono text-white">${Math.round(subRevenue).toLocaleString()}</div>
                    <p className="text-[10px] text-slate-400 mt-0.5">2.5% conversion rate for pro telemetry & badges</p>
                  </div>

                  <div className="bg-[#020b1c] border border-[#12284c] rounded-2xl p-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-red-400 mb-1">
                      <Trophy className="w-3.5 h-3.5" /> Brand Sponsor Challenges
                    </div>
                    <div className="text-lg font-black font-mono text-white">${Math.round(sponsoredEventsRevenue).toLocaleString()}</div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Red Bull, Monster & Logitech G sponsored events</p>
                  </div>

                  <div className="bg-[#020b1c] border border-[#12284c] rounded-2xl p-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 mb-1">
                      <Video className="w-3.5 h-3.5" /> Rewarded Streak Ads
                    </div>
                    <div className="text-lg font-black font-mono text-white">${Math.round(adRevenue).toLocaleString()}</div>
                    <p className="text-[10px] text-slate-400 mt-0.5">High eCPM 5s opt-in ads for streak saves & duels</p>
                  </div>

                  <div className="bg-[#020b1c] border border-[#12284c] rounded-2xl p-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400 mb-1">
                      <Gift className="w-3.5 h-3.5" /> Sound & Target Packs ($0.99)
                    </div>
                    <div className="text-lg font-black font-mono text-white">${Math.round(cosmeticRevenue).toLocaleString()}</div>
                    <p className="text-[10px] text-slate-400 mt-0.5">F1 race start audio & neon cyberpunk targets</p>
                  </div>
                </div>
              </div>
            )}

            {/* STRATEGY ROADMAP */}
            {selectedTab === 'ROADMAP' && (
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-yellow-400">
                  5 Pillars of Viral App Monetization (Shipathon Edition)
                </h3>

                <div className="space-y-2.5">
                  <div className="bg-[#020b1c] border border-[#12284c] rounded-2xl p-3.5 flex items-start gap-3">
                    <span className="text-2xl p-2 rounded-xl bg-yellow-500/10 text-yellow-400 font-mono font-bold shrink-0">1</span>
                    <div>
                      <h4 className="font-extrabold text-sm text-white">RevenueCat Pro Athlete Subscription ($3.99/mo)</h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Native StoreKit integration with real-time receipt validation, offline entitlement caching, and cross-platform restore support.
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#020b1c] border border-[#12284c] rounded-2xl p-3.5 flex items-start gap-3">
                    <span className="text-2xl p-2 rounded-xl bg-red-500/10 text-red-400 font-mono font-bold shrink-0">2</span>
                    <div>
                      <h4 className="font-extrabold text-sm text-white">Brand Takeover Daily Challenges</h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Monetize viral reach by charging brands (Red Bull, Logitech G, Razer) $10k–$50k to sponsor weekly global daily challenges with real prize pools.
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#020b1c] border border-[#12284c] rounded-2xl p-3.5 flex items-start gap-3">
                    <span className="text-2xl p-2 rounded-xl bg-indigo-500/10 text-indigo-400 font-mono font-bold shrink-0">3</span>
                    <div>
                      <h4 className="font-extrabold text-sm text-white">TikTok / Reels Share Card Viral Loop</h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Auto-generates 9:16 vertical share cards with reaction time comparison graphs, user country flag, and deep link QR codes.
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#020b1c] border border-[#12284c] rounded-2xl p-3.5 flex items-start gap-3">
                    <span className="text-2xl p-2 rounded-xl bg-cyan-500/10 text-cyan-400 font-mono font-bold shrink-0">4</span>
                    <div>
                      <h4 className="font-extrabold text-sm text-white">Non-Intrusive Rewarded Ads</h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Zero forced interstitial popups. Users voluntarily watch short 5-second video ads only to repair broken daily streaks or unlock rematch lives.
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#020b1c] border border-[#12284c] rounded-2xl p-3.5 flex items-start gap-3">
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
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[#12284c] bg-[#020b1c] flex justify-between items-center text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <ShieldCheck className="w-4 h-4 text-yellow-400" />
              <span>Apple App Store & RevenueCat Compliant</span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl"
            >
              Close
            </button>
          </div>

        </div>
      </div>

      {/* Legal & Compliance Modal */}
      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialTab={legalModalTab}
      />
    </>
  );
};
