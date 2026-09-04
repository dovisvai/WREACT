import { Share } from '@capacitor/share';
import { ChallengeInvite, GameMode } from '../types';
import { getCountryFlag, getCountryName } from '../utils/countries';
import { isNative } from './native';

/**
 * The share pipeline.
 *
 * Copying text to a clipboard is not a viral loop. This module produces an
 * actual image the player can post, and a link that drops the recipient into a
 * head-to-head against the sender's time.
 */

/**
 * Public origin used in share links.
 *
 * Capacitor serves the Android bundle from `https://localhost`, which starts
 * with "http" and so satisfied the old guard -- every challenge and recruitment
 * link a player shared was `https://localhost/?c=...`, dead on arrival for the
 * recipient and unable to match the App Links filter. VITE_SHARE_ORIGIN was
 * declared in vite-env.d.ts but never read anywhere; it is read here now.
 */
const CONFIGURED_SHARE_ORIGIN = (import.meta.env.VITE_SHARE_ORIGIN ?? '').replace(/\/+$/, '');

export const SHARE_ORIGIN = CONFIGURED_SHARE_ORIGIN
  ? CONFIGURED_SHARE_ORIGIN
  : isNative()
  ? 'https://wreact.app'
  : typeof window !== 'undefined' && /^https?:$/.test(window.location.protocol)
  ? window.location.origin
  : 'https://wreact.app';

/* -------------------------------------------------------------------------- */
/* Challenge links                                                            */
/* -------------------------------------------------------------------------- */

function toBase64Url(input: string): string {
  return btoa(unescape(encodeURIComponent(input)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64Url(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const withPadding = padded + '='.repeat((4 - (padded.length % 4)) % 4);
  return decodeURIComponent(escape(atob(withPadding)));
}

/**
 * Encode a "beat my time" invite into a URL.
 *
 * The payload is deliberately tiny and self-contained so the link works with no
 * backend lookup — a cold recipient can be in a duel against the sender's ghost
 * before they have an account.
 */
export function buildChallengeLink(invite: ChallengeInvite): string {
  const payload = toBase64Url(
    JSON.stringify({
      u: invite.username,
      c: invite.country,
      a: invite.avatar,
      s: invite.scoreMs,
      m: invite.mode,
    })
  );
  return `${SHARE_ORIGIN}/?c=${payload}`;
}

/** Read an invite out of the current URL, if one is present. */
export function parseChallengeFromUrl(
  url: string = typeof window !== 'undefined' ? window.location.href : ''
): ChallengeInvite | null {
  try {
    const parsed = new URL(url, SHARE_ORIGIN);
    const token = parsed.searchParams.get('c');
    if (!token) return null;

    const raw = JSON.parse(fromBase64Url(token));
    const scoreMs = Number(raw.s);
    if (!Number.isFinite(scoreMs) || scoreMs < 80 || scoreMs > 2000) return null;

    return {
      username: String(raw.u || 'A rival').slice(0, 30),
      country: String(raw.c || 'US').slice(0, 3).toUpperCase(),
      avatar: String(raw.a || '⚡').slice(0, 8),
      scoreMs: Math.round(scoreMs),
      mode: (raw.m || 'CLASSIC') as GameMode,
    };
  } catch {
    return null;
  }
}

/** Strip the challenge token so a refresh doesn't re-trigger the invite. */
export function clearChallengeFromUrl(): void {
  if (typeof window === 'undefined' || !window.history?.replaceState) return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has('c')) return;
  url.searchParams.delete('c');
  window.history.replaceState({}, '', url.pathname + url.search + url.hash);
}

/* -------------------------------------------------------------------------- */
/* Share card rendering                                                       */
/* -------------------------------------------------------------------------- */

export interface ShareCardData {
  username: string;
  country: string;
  avatar: string;
  scoreMs: number;
  mode: GameMode;
  /** National rank, when the country is qualified. */
  countryRank?: number | null;
  countryAvgMs?: number | null;
  /** How many ranked nations this single time beats. */
  beatsNations?: number;
  totalNations?: number;
  isNationalBest?: boolean;
}

const CARD_W = 1080;
const CARD_H = 1350;

const PALETTE = {
  bg: '#0a0f13',
  card: '#0f161b',
  hairline: '#1d2932',
  ink: '#f3f6f8',
  inkMuted: '#93a3af',
  inkFaint: '#5b6b77',
  signal: '#00e87a',
  gold: '#ffc53d',
};

function displayFont(weight: number, size: number): string {
  return `${weight} ${size}px "Barlow Condensed", "Arial Narrow", sans-serif`;
}

function uiFont(weight: number, size: number): string {
  return `${weight} ${size}px Inter, -apple-system, "Segoe UI", sans-serif`;
}

/** Letter-spaced small-caps label, the workhorse of broadcast graphics. */
function drawTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking: number
): number {
  let cursor = x;
  for (const char of text) {
    ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width + tracking;
  }
  return cursor - x;
}

function measureTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  tracking: number
): number {
  let width = 0;
  for (const char of text) width += ctx.measureText(char).width + tracking;
  return Math.max(0, width - tracking);
}

/**
 * Draw the shareable result card.
 *
 * The country CODE is the hero rather than the flag emoji, because Windows has
 * no flag glyphs and would render a share card with two stray letters in it.
 * The flag is drawn as a secondary mark where it degrades harmlessly.
 */
export async function renderShareCard(data: ShareCardData): Promise<Blob> {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const code = (data.country || 'US').toUpperCase();
  const countryName = getCountryName(code).toUpperCase();

  /* Background ----------------------------------------------------------- */
  ctx.fillStyle = PALETTE.bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // A single soft pool of signal light behind the number, like a floodlit pitch.
  const glow = ctx.createRadialGradient(CARD_W / 2, 660, 0, CARD_W / 2, 660, 620);
  glow.addColorStop(0, 'rgba(0, 232, 122, 0.10)');
  glow.addColorStop(1, 'rgba(0, 232, 122, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const M = 84; // margin

  /* Header --------------------------------------------------------------- */
  ctx.fillStyle = PALETTE.ink;
  ctx.font = displayFont(900, 54);
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('WREACT', M, M + 46);

  ctx.fillStyle = PALETTE.inkFaint;
  ctx.font = uiFont(700, 22);
  const headerLabel = 'WORLD STANDINGS';
  const headerWidth = measureTracked(ctx, headerLabel, 3);
  drawTracked(ctx, headerLabel, CARD_W - M - headerWidth, M + 42, 3);

  ctx.strokeStyle = PALETTE.hairline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(M, M + 78);
  ctx.lineTo(CARD_W - M, M + 78);
  ctx.stroke();

  /* Nation --------------------------------------------------------------- */
  ctx.textAlign = 'center';

  ctx.fillStyle = PALETTE.ink;
  ctx.font = displayFont(800, 150);
  ctx.fillText(code, CARD_W / 2, 400);

  ctx.fillStyle = PALETTE.inkMuted;
  ctx.font = uiFont(600, 26);
  const nameWidth = measureTracked(ctx, countryName, 4);
  ctx.textAlign = 'left';
  drawTracked(ctx, countryName, (CARD_W - nameWidth) / 2, 448, 4);
  ctx.textAlign = 'center';

  if (data.countryRank) {
    ctx.fillStyle = PALETTE.gold;
    ctx.font = uiFont(700, 24);
    ctx.fillText(`WORLD #${data.countryRank}`, CARD_W / 2, 500);
  }

  /* The number ----------------------------------------------------------- */
  ctx.fillStyle = PALETTE.signal;
  ctx.font = displayFont(900, 380);
  ctx.fillText(String(data.scoreMs), CARD_W / 2, 800);

  ctx.fillStyle = PALETTE.inkMuted;
  ctx.font = uiFont(600, 30);
  const unit = 'MILLISECONDS';
  const unitWidth = measureTracked(ctx, unit, 8);
  ctx.textAlign = 'left';
  drawTracked(ctx, unit, (CARD_W - unitWidth) / 2, 856, 8);
  ctx.textAlign = 'center';

  /* Verdict -------------------------------------------------------------- */
  let verdictY = 960;

  if (data.isNationalBest) {
    ctx.fillStyle = PALETTE.gold;
    ctx.font = displayFont(800, 62);
    ctx.fillText(`FASTEST IN ${code}`, CARD_W / 2, verdictY);
    verdictY += 74;
  } else if (data.beatsNations != null && data.totalNations) {
    ctx.fillStyle = PALETTE.ink;
    ctx.font = displayFont(700, 58);
    ctx.fillText(
      `BEATS ${data.beatsNations} OF ${data.totalNations} NATIONS`,
      CARD_W / 2,
      verdictY
    );
    verdictY += 74;
  }

  if (data.countryAvgMs) {
    ctx.fillStyle = PALETTE.inkFaint;
    ctx.font = uiFont(500, 26);
    ctx.fillText(
      `${countryName} national average · ${data.countryAvgMs}ms`,
      CARD_W / 2,
      verdictY
    );
  }

  /* Footer --------------------------------------------------------------- */
  const footerY = CARD_H - M - 96;

  ctx.strokeStyle = PALETTE.hairline;
  ctx.beginPath();
  ctx.moveTo(M, footerY);
  ctx.lineTo(CARD_W - M, footerY);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.ink;
  ctx.font = uiFont(700, 34);
  ctx.fillText(`${data.avatar}  @${data.username}`, M, footerY + 58);

  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.signal;
  ctx.font = uiFont(700, 30);
  ctx.fillText('CAN YOU BEAT IT?', CARD_W - M, footerY + 56);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Card encoding failed'))),
      'image/png'
    );
  });
}

/* -------------------------------------------------------------------------- */
/* Sharing                                                                    */
/* -------------------------------------------------------------------------- */

export type ShareOutcome = 'shared' | 'downloaded' | 'copied' | 'cancelled' | 'failed';

function challengeText(data: ShareCardData): string {
  const flag = getCountryFlag(data.country);
  const nation = getCountryName(data.country);
  if (data.isNationalBest) {
    return `${data.scoreMs}ms — fastest reaction in ${nation} ${flag}. Think you're quicker?`;
  }
  return `I reacted in ${data.scoreMs}ms for ${nation} ${flag}. Beat me.`;
}

/**
 * Put the result in front of other people, by whatever route this platform
 * actually supports. Ordered best-effort:
 *
 *   1. Web Share with the image attached (iOS 15+ WKWebView, Android Chrome)
 *   2. Capacitor Share, text + link only
 *   3. Download the image and copy the text (desktop)
 */
export async function shareResult(
  data: ShareCardData,
  invite: ChallengeInvite
): Promise<ShareOutcome> {
  const text = challengeText(data);
  const url = buildChallengeLink(invite);

  let blob: Blob | null = null;
  try {
    blob = await renderShareCard(data);
  } catch {
    blob = null;
  }

  // 1. Native share sheet, image attached.
  if (blob && typeof navigator !== 'undefined' && navigator.share) {
    const file = new File([blob], `wreact-${data.scoreMs}ms.png`, { type: 'image/png' });
    const payload = { files: [file], text, title: 'WREACT' };

    if (!navigator.canShare || navigator.canShare(payload)) {
      try {
        await navigator.share(payload);
        return 'shared';
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return 'cancelled';
      }
    }
  }

  // 2. Capacitor share sheet, text and link.
  try {
    const available = await Share.canShare();
    if (available?.value) {
      await Share.share({ title: 'WREACT', text, url, dialogTitle: 'Challenge someone' });
      return 'shared';
    }
  } catch {
    /* fall through */
  }

  // 3. Desktop: save the card, put the challenge text on the clipboard.
  if (blob) {
    try {
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `wreact-${data.scoreMs}ms.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
      await navigator.clipboard?.writeText(`${text} ${url}`).catch(() => {});
      return 'downloaded';
    } catch {
      /* fall through */
    }
  }

  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}

/** Share a link only — used by the "recruit your country" prompt. */
export async function shareRecruitment(
  countryCode: string,
  athletesNeeded: number
): Promise<ShareOutcome> {
  const nation = getCountryName(countryCode);
  const flag = getCountryFlag(countryCode);
  const text =
    athletesNeeded > 0
      ? `${nation} ${flag} needs ${athletesNeeded} more ${
          athletesNeeded === 1 ? 'player' : 'players'
        } to enter the WREACT world standings. Get in.`
      : `Come represent ${nation} ${flag} in the WREACT world standings.`;

  const url = `${SHARE_ORIGIN}/?nation=${countryCode.toUpperCase()}`;

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ text, url, title: 'WREACT' });
      return 'shared';
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return 'cancelled';
    }
  }

  try {
    const available = await Share.canShare();
    if (available?.value) {
      await Share.share({ text, url, title: 'WREACT' });
      return 'shared';
    }
  } catch {
    /* fall through */
  }

  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}
