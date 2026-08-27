import React, { useState } from 'react';
import { Bell, X, Check, Clock, Sparkles, Smartphone, Flame } from 'lucide-react';

interface DailyNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  dailyStreak: number;
}

export const DailyNotificationModal: React.FC<DailyNotificationModalProps> = ({
  isOpen,
  onClose,
  dailyStreak,
}) => {
  const [enabled, setEnabled] = useState(true);
  const [time, setTime] = useState('12:00');
  const [simulatedPush, setSimulatedPush] = useState(false);

  if (!isOpen) return null;

  const triggerTestNotification = () => {
    setSimulatedPush(true);
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl text-white">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-500/10 border border-orange-500/30 rounded-full text-orange-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Bell className="w-3.5 h-3.5 fill-orange-400" /> Push Notifications
          </div>
          <h2 className="text-lg font-bold text-white">Daily Challenge Reminders</h2>
          <p className="text-xs text-slate-400 mt-1">
            Never lose your <span className="text-orange-400 font-bold">{dailyStreak}-Day Streak</span>! Compete in today's global event.
          </p>
        </div>

        {/* Toggle & Settings */}
        <div className="space-y-3 bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-200">Enable Daily Reminders</span>
            <button
              onClick={() => setEnabled(!enabled)}
              className={`w-12 h-6 rounded-full transition-all relative ${
                enabled ? 'bg-orange-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-all transform absolute top-0.5 ${
                  enabled ? 'left-6' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" /> Reminder Time
            </span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-amber-400 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Test Lockscreen Notification Banner */}
        {simulatedPush && (
          <div className="mb-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/50 rounded-xl p-3 shadow-lg animate-pulse">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400 shrink-0">
                <Flame className="w-4 h-4 fill-orange-400" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 truncate">WREACT • Now</span>
                  <span className="text-[9px] bg-indigo-500/30 text-indigo-300 px-1 rounded shrink-0 font-mono">Lockscreen</span>
                </div>
                <h4 className="text-xs font-black text-white leading-tight">⚡ Daily Challenge Active!</h4>
                <p className="text-[11px] text-slate-300 leading-normal">"Lightning 3-Tap Surge" is live! Beat 154ms to climb today's world ranking.</p>
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="space-y-2">
          <button
            onClick={triggerTestNotification}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all active:scale-95"
          >
            <Smartphone className="w-4 h-4" /> Send Test Phone Notification
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-sm transition-all"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};
