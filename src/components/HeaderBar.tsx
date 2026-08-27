import React from 'react';
import { Zap, Volume2, VolumeX, Smartphone, Globe2, ShieldCheck, Bell } from 'lucide-react';
import { DeviceOS } from '../types';
import { useHapticSound } from '../hooks/useHapticSound';

interface HeaderBarProps {
  deviceOS: DeviceOS;
  setDeviceOS: (os: DeviceOS) => void;
  audioEnabled: boolean;
  setAudioEnabled: (val: boolean) => void;
  onlineCount: number;
  openProfile: () => void;
  openNotifications: () => void;
  userAvatar: string;
  userCountryFlag: string;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  deviceOS,
  setDeviceOS,
  audioEnabled,
  setAudioEnabled,
  onlineCount,
  openProfile,
  openNotifications,
  userAvatar,
  userCountryFlag,
}) => {
  const [timeStr, setTimeStr] = React.useState('');
  const { playTap, playPop, playTick } = useHapticSound({ enabled: audioEnabled });

  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#00122e] text-white border-b border-[#12284c] sticky top-0 z-30 select-none">
      {/* Phone Hardware Bar (Status Bar) */}
      <div className="flex items-center justify-between px-4 pt-2 pb-1 text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-1.5 font-medium text-slate-300">
          <span>{timeStr || '10:27'}</span>
          <span className="text-[10px] bg-red-600/30 border border-red-500/40 px-1 rounded text-red-400 font-bold">5G</span>
        </div>

        {/* Dynamic Platform Toggle Pill */}
        <div className="flex items-center gap-1 bg-[#020b1c] border border-slate-800 rounded-full px-2 py-0.5 text-[10px]">
          <button
            onClick={() => { playTick(); setDeviceOS('iOS'); }}
            className={`px-1.5 py-0.5 rounded-full transition-all ${
              deviceOS === 'iOS' ? 'bg-red-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
            title="iOS App Interface"
          >
            iOS
          </button>
          <button
            onClick={() => { playTick(); setDeviceOS('Android'); }}
            className={`px-1.5 py-0.5 rounded-full transition-all ${
              deviceOS === 'Android' ? 'bg-yellow-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
            title="Android App Interface"
          >
            Android
          </button>
          <button
            onClick={() => { playTick(); setDeviceOS('Web'); }}
            className={`px-1.5 py-0.5 rounded-full transition-all ${
              deviceOS === 'Web' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
            title="Full Canvas Mode"
          >
            Web
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-yellow-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>{onlineCount.toLocaleString()} online</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 via-red-500 to-yellow-400 text-slate-950 font-black shadow-lg shadow-red-600/30 border border-yellow-400/50">
            <Zap className="w-5 h-5 fill-yellow-300 stroke-slate-950" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-400"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-lg tracking-wider text-white flex items-center">
                <span className="text-red-500 font-black">W</span>
                <span className="text-yellow-400 font-black">REACT</span>
              </h1>
              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 bg-red-600 text-white rounded shadow-sm border border-yellow-400/50">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium flex items-center gap-1">
              <Globe2 className="w-3 h-3 text-yellow-400" /> Human Reflex Championship
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio toggle */}
          <button
            onClick={() => {
              if (!audioEnabled) {
                playPop();
              }
              setAudioEnabled(!audioEnabled);
            }}
            className="p-2 rounded-xl bg-[#020b1c] border border-[#12284c] text-slate-300 hover:text-white hover:border-red-500/50 transition-all active:scale-95"
            title={audioEnabled ? 'Mute Audio' : 'Unmute Audio'}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4 text-yellow-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Daily Notifications Button */}
          <button
            onClick={() => { playTap(); openNotifications(); }}
            className="p-2 rounded-xl bg-[#020b1c] border border-[#12284c] text-slate-300 hover:text-white hover:border-yellow-400/50 transition-all relative active:scale-95"
            title="Daily Challenge Reminders"
          >
            <Bell className="w-4 h-4 text-red-500" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-yellow-400 shadow-sm" />
          </button>

          {/* Profile Badge Button */}
          <button
            onClick={() => { playPop(); openProfile(); }}
            className="flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-xl bg-[#020b1c] border border-red-500/40 hover:border-yellow-400 transition-all active:scale-95 group shadow-sm"
          >
            <span className="text-base leading-none">{userAvatar}</span>
            <span className="text-xs font-semibold text-slate-200 group-hover:text-white">{userCountryFlag}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
