import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App } from '@capacitor/app';

/**
 * Thin, failure-tolerant wrapper over the native layer.
 *
 * Every call here is safe to make on the web build: Capacitor's web
 * implementations either no-op or throw "unimplemented", and each call is
 * guarded. Nothing in the UI should ever need to know which platform it is on.
 */

export const isNative = (): boolean => Capacitor.isNativePlatform();
export const platform = (): 'ios' | 'android' | 'web' =>
  Capacitor.getPlatform() as 'ios' | 'android' | 'web';

/* -------------------------------------------------------------------------- */
/* Haptics                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Real device haptics. The web fallback is `navigator.vibrate`, which Android
 * Chrome honours and iOS Safari ignores — acceptable, because the shipping iOS
 * build goes through the native path.
 */
export const haptic = {
  async light() {
    if (isNative()) {
      await Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    } else {
      navigator.vibrate?.(8);
    }
  },

  async medium() {
    if (isNative()) {
      await Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
    } else {
      navigator.vibrate?.(16);
    }
  },

  async heavy() {
    if (isNative()) {
      await Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
    } else {
      navigator.vibrate?.(28);
    }
  },

  /** The signal turning green. Must be the sharpest cue in the product. */
  async signal() {
    if (isNative()) {
      await Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
    } else {
      navigator.vibrate?.(30);
    }
  },

  async success() {
    if (isNative()) {
      await Haptics.notification({ type: NotificationType.Success }).catch(() => {});
    } else {
      navigator.vibrate?.([12, 40, 12]);
    }
  },

  async error() {
    if (isNative()) {
      await Haptics.notification({ type: NotificationType.Error }).catch(() => {});
    } else {
      navigator.vibrate?.([40, 60, 40]);
    }
  },
};

/* -------------------------------------------------------------------------- */
/* Shell chrome                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Configure the native shell once at boot: dark status bar content over the
 * pitch background, then dismiss the splash screen.
 */
export async function initNativeShell(): Promise<void> {
  if (!isNative()) return;

  await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});

  if (platform() === 'android') {
    await StatusBar.setBackgroundColor({ color: '#0a0f13' }).catch(() => {});
    await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
  }

  await SplashScreen.hide().catch(() => {});
}

/**
 * Register a handler for cold and warm launches from a deep link
 * (wreact://challenge?... or an https universal link).
 */
export function onDeepLink(handler: (url: string) => void): () => void {
  if (!isNative()) return () => {};

  const listener = App.addListener('appUrlOpen', (event) => {
    if (event?.url) handler(event.url);
  });

  return () => {
    listener.then((l) => l.remove()).catch(() => {});
  };
}

/** Fires when the app returns to the foreground — used to refresh standings. */
export function onAppResume(handler: () => void): () => void {
  if (!isNative()) {
    const onVisible = () => {
      if (document.visibilityState === 'visible') handler();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }

  const listener = App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) handler();
  });

  return () => {
    listener.then((l) => l.remove()).catch(() => {});
  };
}
