/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** RevenueCat public SDK key for iOS (appl_…). Safe to ship in the bundle. */
  readonly VITE_REVENUECAT_IOS_KEY?: string;
  /** RevenueCat public SDK key for Android (goog_…). Safe to ship in the bundle. */
  readonly VITE_REVENUECAT_ANDROID_KEY?: string;
  /** Public origin used to build share links, e.g. https://wreact.app */
  readonly VITE_SHARE_ORIGIN?: string;
  /** OneSignal App ID. Public identifier, safe to ship in the bundle. */
  readonly VITE_ONESIGNAL_APP_ID?: string;
  /**
   * Absolute backend origin, e.g. https://api.wreact.app
   * Required for native builds — relative paths resolve to the app bundle there.
   */
  readonly VITE_API_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
