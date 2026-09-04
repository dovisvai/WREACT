import { isNative } from './native';

/**
 * Where the backend lives.
 *
 * On the web the app is served by the same process that serves the API, so
 * relative paths are correct. In a native build they are not: Capacitor serves
 * the bundle from `capacitor://localhost` (iOS) or `http://localhost` (Android),
 * so `fetch('/api/standings')` asks the app bundle for an endpoint it does not
 * have, and `ws://<location.host>/ws` dials the WebView itself.
 *
 * Every packaged build therefore needs an absolute origin. Set it at build time:
 *
 *   VITE_API_ORIGIN=https://api.wreact.app
 */
const CONFIGURED_ORIGIN = (import.meta.env.VITE_API_ORIGIN ?? '').replace(/\/+$/, '');

export const API_ORIGIN = CONFIGURED_ORIGIN;

/**
 * True when the app cannot reach a backend: packaged natively with no origin
 * configured. Surfaced in the UI rather than failing as a silent blank screen,
 * because this is a build-configuration mistake and needs to look like one.
 */
export function isBackendUnreachable(): boolean {
  return isNative() && CONFIGURED_ORIGIN === '';
}

if (isBackendUnreachable()) {
  console.error(
    '[API] Running natively with no VITE_API_ORIGIN set. Relative requests resolve ' +
      'to the app bundle, so standings, the ticker, duels and score submission will ' +
      'all fail. Rebuild with VITE_API_ORIGIN pointing at the deployed server.'
  );
}

/** Absolute URL for a REST endpoint. */
export function apiUrl(path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${CONFIGURED_ORIGIN}${suffix}`;
}

/**
 * Absolute URL for the WebSocket endpoint.
 *
 * Derived from the configured origin when there is one, so the scheme upgrades
 * to `wss` alongside `https` and never falls back to the WebView's own host.
 */
export function wsUrl(path = '/ws'): string {
  const suffix = path.startsWith('/') ? path : `/${path}`;

  if (CONFIGURED_ORIGIN) {
    return `${CONFIGURED_ORIGIN.replace(/^http/, 'ws')}${suffix}`;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${suffix}`;
}

/** Convenience wrapper so callers never rebuild the origin themselves. */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), init);
}
