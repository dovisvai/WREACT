import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cx } from '../ui/Primitives';

/* -------------------------------------------------------------------------- */

export const ComparisonRow: React.FC<{
  label: string;
  valueMs: number;
  tone: 'signal' | 'ink' | 'muted';
  note?: string;
}> = ({ label, valueMs, tone, note }) => {
  // Fixed 100-350ms scale so bars stay comparable between rows and sessions.
  const percent = valueMs
    ? Math.round(((350 - Math.min(350, Math.max(100, valueMs))) / 250) * 100)
    : 0;

  const fill = {
    signal: 'var(--color-signal)',
    ink: 'var(--color-ink)',
    muted: 'var(--color-pitch-600)',
  }[tone];

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[12px] font-medium text-ink-muted">
          {label}
          {note && <span className="ml-1.5 text-[10px] text-ink-faint">{note}</span>}
        </span>
        <span className="font-display text-sm font-bold text-ink">
          {valueMs ? `${valueMs}ms` : '—'}
        </span>
      </div>
      <div className="standings-bar">
        <div className="standings-bar-fill" style={{ width: `${percent}%`, background: fill }} />
      </div>
    </div>
  );
};

export const RowButton: React.FC<{
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  onClick: () => void;
}> = ({ label, hint, icon, destructive, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-pitch-800"
  >
    {icon && <span className={destructive ? 'text-alert' : 'text-ink-faint'}>{icon}</span>}
    <div className="min-w-0 flex-1">
      <div
        className={cx(
          'text-[13px] font-semibold',
          destructive ? 'text-alert' : 'text-ink'
        )}
      >
        {label}
      </div>
      {hint && <div className="text-[11px] text-ink-faint">{hint}</div>}
    </div>
    <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" />
  </button>
);
