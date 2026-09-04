import React from 'react';

/**
 * Stadium primitives.
 *
 * The rules this system enforces, so no screen has to re-decide them:
 *   - Signal green means GO or improvement. It is never decoration.
 *   - Alert red means false start or destructive. It is never emphasis.
 *   - Gold means first place. Nothing else.
 *   - All other colour comes from national flags.
 *   - Labels are tracked small-caps; headlines are condensed display;
 *     every comparable number is tabular.
 */

type Cx = (string | false | null | undefined)[];
export const cx = (...classes: Cx): string => classes.filter(Boolean).join(' ');

/* -------------------------------------------------------------------------- */
/* Flags                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Does this platform have flag glyphs?
 *
 * Windows ships no flag emoji, so 🇱🇹 renders as two loose regional-indicator
 * letters and "🇺🇸 United States" reads as "us United States". Since shared
 * challenge links land in desktop browsers, the fallback matters.
 *
 * Detection: draw the regional-indicator pair and the first indicator alone,
 * then compare pixels. Where flags are supported the pair ligates into a single
 * flag glyph that looks nothing like a lone letter; where they are not, the
 * pair is literally that letter followed by another, so the two renders match.
 *
 * A width-ratio heuristic was tried first and measured 1.794 on Windows against
 * a 1.8 cutoff — far too close to the line to trust.
 */
let flagSupport: boolean | null = null;

function supportsFlagEmoji(): boolean {
  if (flagSupport !== null) return flagSupport;
  if (typeof document === 'undefined') return false;

  try {
    const W = 48;
    const H = 24;
    const PROBE_COLUMNS = 10; // the first glyph's leading edge

    const render = (text: string): Uint8ClampedArray | null => {
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;
      ctx.clearRect(0, 0, W, H);
      ctx.font = '20px sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(text, 0, 0);
      return ctx.getImageData(0, 0, W, H).data;
    };

    const pair = render('\u{1F1FA}\u{1F1F8}'); // 🇺🇸
    const single = render('\u{1F1FA}'); // the lone U indicator

    if (!pair || !single) return (flagSupport = false);

    // Compare only where the first glyph sits. Sampling the whole canvas would
    // pick up the second indicator on unsupported platforms and read as a
    // difference, which is the trap the previous attempt fell into.
    let differing = 0;
    let sampled = 0;
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < PROBE_COLUMNS; x += 1) {
        const alpha = (y * W + x) * 4 + 3;
        sampled += 1;
        if (Math.abs(pair[alpha] - single[alpha]) > 8) differing += 1;
      }
    }

    // A ligature replaces the letter entirely, so a supported platform shows a
    // large difference here. Windows shows exactly zero.
    flagSupport = differing / sampled > 0.1;
  } catch {
    flagSupport = false;
  }

  return flagSupport;
}

/**
 * A nation mark, in the best form this platform can show.
 *
 *   1. The flag emoji, where the OS has glyphs for it — phones, macOS.
 *   2. A bundled SVG, where it does not. Windows ships no flag emoji at all,
 *      and the app's whole premise is that 190 flags carry the colour, so
 *      falling straight to grey text would gut the design on desktop, which is
 *      where shared challenge links land.
 *   3. The country code, if even the SVG is missing.
 *
 * The SVG path is only ever reached on platforms without emoji flags, so phones
 * download none of the artwork.
 */
export const Flag: React.FC<{
  code: string;
  emoji: string;
  className?: string;
}> = ({ code, emoji, className }) => {
  const [artworkFailed, setArtworkFailed] = React.useState(false);
  const upper = (code || '').toUpperCase();

  if (supportsFlagEmoji()) {
    return (
      <span className={cx('leading-none', className)} aria-label={upper}>
        {emoji}
      </span>
    );
  }

  if (upper.length === 2 && !artworkFailed) {
    return (
      <img
        src={`/flags/${upper}.svg`}
        alt={upper}
        loading="lazy"
        decoding="async"
        onError={() => setArtworkFailed(true)}
        // Flags are 3:2. Height tracks the surrounding font-size so a single
        // `text-*` class at the call site still governs the mark, and the inset
        // ring keeps white-edged flags (Japan) from dissolving into the ground.
        className={cx(
          'inline-block h-[1em] w-[1.5em] shrink-0 rounded-[2px] object-cover align-[-0.12em]',
          'ring-1 ring-inset ring-pitch-600/60',
          className
        )}
      />
    );
  }

  return (
    <span
      aria-label={upper}
      className={cx(
        'inline-flex items-center justify-center rounded-xs bg-pitch-700 px-1 py-0.5',
        'font-display text-[0.7em] font-bold uppercase leading-none tracking-wide text-ink-muted',
        className
      )}
    >
      {upper || '??'}
    </span>
  );
};

/* -------------------------------------------------------------------------- */
/* Brand marks                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The Apple logo, for Sign in with Apple.
 *
 * The previous path was a hand-mangled approximation — a lopsided body with a
 * detached leaf — repeated in three places. This is the correct silhouette at
 * its true 3:4 proportion, so it must never be given a square viewBox or it
 * stretches.
 *
 * Sized in `em` rather than a fixed pixel box so it tracks whatever label it
 * sits beside, and nudged up a hair: the glyph's mass is all in the body, so
 * centring its bounding box makes it read as sitting low next to text.
 */
export const AppleMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 384 512"
    aria-hidden="true"
    focusable="false"
    className={cx('h-[1.15em] w-auto shrink-0 -translate-y-px fill-current', className)}
  >
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
  </svg>
);

/* -------------------------------------------------------------------------- */
/* Layout                                                                     */
/* -------------------------------------------------------------------------- */

export const Screen: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={cx('h-full overflow-y-auto no-scrollbar overscroll-contain', className)}>
    {children}
  </div>
);

/** Tracked small-caps label. The connective tissue of broadcast graphics. */
export const Label: React.FC<{
  children: React.ReactNode;
  className?: string;
  as?: 'span' | 'div' | 'h2';
}> = ({ children, className, as: Tag = 'span' }) => (
  <Tag
    className={cx(
      'text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint',
      className
    )}
  >
    {children}
  </Tag>
);

export const Headline: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <h1
    className={cx(
      'font-display text-4xl font-extrabold uppercase leading-[0.92] tracking-tight text-ink',
      className
    )}
  >
    {children}
  </h1>
);

export const Panel: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}> = ({ children, className, onClick }) => {
  const classes = cx(
    'rounded-md border border-pitch-700 bg-pitch-850',
    onClick && 'w-full text-left transition-colors hover:border-pitch-600 active:bg-pitch-800',
    className
  );

  return onClick ? (
    <button type="button" onClick={onClick} className={classes}>
      {children}
    </button>
  ) : (
    <div className={classes}>{children}</div>
  );
};

export const Divider: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cx('h-px bg-pitch-700', className)} />
);

/** Section header with an optional right-hand action. */
export const SectionHeader: React.FC<{
  title: string;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, action, className }) => (
  <div className={cx('mb-3 flex items-baseline justify-between gap-3', className)}>
    <Label as="h2">{title}</Label>
    {action}
  </div>
);

/* -------------------------------------------------------------------------- */
/* Controls                                                                   */
/* -------------------------------------------------------------------------- */

type ButtonVariant = 'signal' | 'solid' | 'quiet' | 'ghost' | 'danger';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  signal: 'bg-signal text-pitch-950 hover:bg-signal/90 active:bg-signal-deep',
  solid: 'bg-ink text-pitch-950 hover:bg-white active:bg-ink/90',
  quiet: 'bg-pitch-800 text-ink border border-pitch-700 hover:border-pitch-600 active:bg-pitch-700',
  ghost: 'bg-transparent text-ink-muted hover:text-ink active:text-ink',
  danger: 'bg-transparent text-alert border border-alert/40 hover:bg-alert/10',
};

const BUTTON_SIZES = {
  sm: 'h-9 px-3 text-xs',
  md: 'h-11 px-4 text-sm',
  lg: 'h-14 px-6 text-base',
};

export const Button: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: keyof typeof BUTTON_SIZES;
  full?: boolean;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}> = ({
  children,
  onClick,
  variant = 'quiet',
  size = 'md',
  full,
  disabled,
  className,
  type = 'button',
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={cx(
      'inline-flex items-center justify-center gap-2 rounded-md font-semibold',
      'transition-all duration-150 active:scale-[0.98]',
      'disabled:pointer-events-none disabled:opacity-40',
      BUTTON_VARIANTS[variant],
      BUTTON_SIZES[size],
      full && 'w-full',
      className
    )}
  >
    {children}
  </button>
);

/** Segmented control — the standard way to switch a table's dimension. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cx(
        'inline-flex rounded-md border border-pitch-700 bg-pitch-850 p-0.5',
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cx(
            'rounded-sm px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors',
            value === option.value
              ? 'bg-ink text-pitch-950'
              : 'text-ink-faint hover:text-ink-muted'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Data display                                                               */
/* -------------------------------------------------------------------------- */

export const StatTile: React.FC<{
  label: string;
  value: React.ReactNode;
  unit?: string;
  hint?: string;
  accent?: 'default' | 'signal' | 'gold' | 'alert';
}> = ({ label, value, unit, hint, accent = 'default' }) => {
  const valueColor = {
    default: 'text-ink',
    signal: 'text-signal',
    gold: 'text-gold',
    alert: 'text-alert',
  }[accent];

  return (
    <div className="rounded-md border border-pitch-700 bg-pitch-850 p-3">
      <Label>{label}</Label>
      <div className={cx('mt-1.5 font-display text-3xl font-bold leading-none', valueColor)}>
        {value}
        {unit && <span className="ml-0.5 text-base font-semibold text-ink-faint">{unit}</span>}
      </div>
      {hint && <div className="mt-1 text-[11px] text-ink-faint">{hint}</div>}
    </div>
  );
};

/** Rank movement indicator: ▲ climbed, ▼ dropped, — held. */
export const RankDelta: React.FC<{ delta: number; className?: string }> = ({
  delta,
  className,
}) => {
  if (!delta) {
    return <span className={cx('text-[11px] text-ink-faint', className)}>—</span>;
  }

  const climbed = delta > 0;
  return (
    <span
      className={cx(
        'text-[11px] font-semibold tabular-nums',
        climbed ? 'text-signal' : 'text-alert',
        className
      )}
    >
      {climbed ? '▲' : '▼'}
      {Math.abs(delta)}
    </span>
  );
};

/**
 * Horizontal comparison bar. Faster times render as longer bars, so "longer is
 * better" holds everywhere in the product and the eye never has to invert.
 */
export const SpeedBar: React.FC<{
  /** The value being drawn. */
  valueMs: number;
  /** Fastest value in the table — renders full width. */
  fastestMs: number;
  /** Slowest value in the table — renders at the floor width. */
  slowestMs: number;
  tone?: 'signal' | 'gold' | 'ink' | 'muted';
  className?: string;
}> = ({ valueMs, fastestMs, slowestMs, tone = 'ink', className }) => {
  const span = Math.max(1, slowestMs - fastestMs);
  const ratio = 1 - (valueMs - fastestMs) / span;
  const width = Math.max(6, Math.min(100, 18 + ratio * 82));

  const background = {
    signal: 'var(--color-signal)',
    gold: 'var(--color-gold)',
    ink: 'var(--color-ink)',
    muted: 'var(--color-pitch-600)',
  }[tone];

  return (
    <div className={cx('standings-bar', className)}>
      <div className="standings-bar-fill" style={{ width: `${width}%`, background }} />
    </div>
  );
};

/** Rank badge: gold/silver/bronze for the podium, plain numerals below. */
export const RankBadge: React.FC<{ rank: number | null; className?: string }> = ({
  rank,
  className,
}) => {
  if (rank === null) {
    return (
      <span className={cx('font-display text-lg font-bold text-ink-faint', className)}>—</span>
    );
  }

  const color =
    rank === 1
      ? 'text-gold'
      : rank === 2
      ? 'text-silver'
      : rank === 3
      ? 'text-bronze'
      : 'text-ink-faint';

  return (
    <span
      className={cx('font-display text-lg font-bold tabular-nums', color, className)}
    >
      {String(rank).padStart(2, '0')}
    </span>
  );
};

/**
 * Placeholder rows shown while data is in flight.
 *
 * The distinction matters: an empty state asserts something about the world
 * ("no nation has qualified"), and making that claim before the data has
 * arrived tells a user on a slow connection something untrue. A skeleton says
 * only "not yet", which is the honest position while loading.
 */
export const Skeleton: React.FC<{ rows?: number; className?: string }> = ({
  rows = 6,
  className,
}) => (
  <div className={cx('space-y-1.5', className)} aria-busy="true" aria-live="polite">
    <span className="sr-only">Loading</span>
    {Array.from({ length: rows }).map((_, index) => (
      <div
        key={index}
        className="animate-skeleton rounded-md border border-pitch-700 bg-pitch-850 px-3 py-2.5"
        // Rows fade in sequence so the block reads as loading rather than broken.
        style={{ animationDelay: `${index * 90}ms` }}
      >
        <div className="flex items-center gap-3">
          <div className="h-4 w-6 rounded-xs bg-pitch-700" />
          <div className="h-5 w-8 rounded-xs bg-pitch-700" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-2/5 rounded-xs bg-pitch-700" />
            <div className="h-2.5 w-3/5 rounded-xs bg-pitch-700/60" />
          </div>
          <div className="h-5 w-12 rounded-xs bg-pitch-700" />
        </div>
        <div className="mt-2 h-1.5 rounded-xs bg-pitch-700/60" />
      </div>
    ))}
  </div>
);

/** Consistent empty state. Never a dead screen. */
export const EmptyState: React.FC<{
  title: string;
  body?: string;
  action?: React.ReactNode;
}> = ({ title, body, action }) => (
  <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
    <h3 className="font-display text-2xl font-bold uppercase tracking-tight text-ink-muted">
      {title}
    </h3>
    {body && <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-faint">{body}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);
