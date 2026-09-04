import React, { useState } from 'react';
import { Trash2, AlertTriangle, ShieldAlert, X, RotateCw } from 'lucide-react';
import { triggerHaptic } from '../utils/audio';

interface AccountDeletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: () => void;
  username: string;
}

export const AccountDeletionModal: React.FC<AccountDeletionModalProps> = ({
  isOpen,
  onClose,
  onConfirmDelete,
  username,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleDelete = () => {
    if (confirmText.trim().toLowerCase() !== 'delete') return;
    setIsDeleting(true);
    triggerHaptic([50, 50, 100]);

    setTimeout(() => {
      setIsDeleting(false);
      onConfirmDelete();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pitch-900/95 backdrop-blur-md p-4 animate-fade-in text-ink">
      <div className="relative w-full max-w-md bg-pitch-850 border-2 border-alert rounded-3xl shadow-[0_0_50px_rgba(220,38,38,0.3)] overflow-hidden flex flex-col p-6 space-y-4">
        
        <div className="flex items-center justify-between border-b border-pitch-700 pb-3">
          <div className="flex items-center gap-2 text-alert">
            <div className="p-2 rounded-xl bg-alert/20 border border-alert/40">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-ink">Delete Athlete Account</h2>
              <span className="text-[10px] font-mono text-alert">Apple Guideline 5.1.1(v) Compliant</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-ink-faint hover:text-ink hover:bg-pitch-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs text-ink-muted">
          <p>
            You are about to permanently delete the profile for athlete <strong className="text-ink">@{username}</strong>.
          </p>
          <div className="bg-alert-deep/40 border border-alert/40 rounded-2xl p-3 text-alert space-y-1 text-[11px]">
            <p className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-alert shrink-0" />
              This action is permanent and cannot be reversed:
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-ink-muted pl-1">
              <li>All reaction times and telemetry history will be wiped</li>
              <li>World leaderboard rankings and duel records will be removed</li>
              <li>VIP Pro Pass local cloud token bindings will be detached</li>
            </ul>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-faint uppercase mb-1">
              Type <strong className="text-alert font-mono">DELETE</strong> to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full bg-pitch-900 border border-alert/50 rounded-xl px-3 py-2 text-xs font-mono text-ink text-center tracking-widest focus:outline-none focus:border-alert"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-pitch-700">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-pitch-900 hover:bg-pitch-700 border border-pitch-700 text-ink-muted font-bold text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={confirmText.trim().toLowerCase() !== 'delete' || isDeleting}
            onClick={handleDelete}
            className="flex-1 py-2.5 rounded-xl bg-alert hover:bg-alert disabled:bg-pitch-800 disabled:text-ink-faint text-ink font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-lg"
          >
            {isDeleting ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Purging Data...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Permanently</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
