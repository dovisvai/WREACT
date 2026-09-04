import {
  Purchases,
  LOG_LEVEL,
  type PurchasesOffering,
  type PurchasesPackage,
  type CustomerInfo,
} from '@revenuecat/purchases-capacitor';
import { isNative, platform } from './native';

/**
 * RevenueCat integration.
 *
 * On iOS and Android this is the real SDK talking to StoreKit / Play Billing.
 * On the web build — where no store exists — it falls back to a clearly
 * labelled preview mode so the paywall can still be designed and reviewed in a
 * browser. `isSimulated` tells the UI which one it is; never present preview
 * mode to a user as a completed purchase.
 */

export const REVENUECAT_ENTITLEMENT_ID = 'pro_access';

/* ---------------------------------------------------------------------------
 * API keys.
 *
 * These are RevenueCat *public* SDK keys and are safe to ship in a client
 * bundle. Replace the placeholders with the values from
 * RevenueCat dashboard → Project settings → API keys.
 * ------------------------------------------------------------------------- */
export const REVENUECAT_KEYS = {
  ios: import.meta.env.VITE_REVENUECAT_IOS_KEY ?? 'appl_REPLACE_WITH_YOUR_IOS_KEY',
  android:
    import.meta.env.VITE_REVENUECAT_ANDROID_KEY ?? 'goog_REPLACE_WITH_YOUR_ANDROID_KEY',
};

export function hasRealKeys(): boolean {
  const key = platform() === 'android' ? REVENUECAT_KEYS.android : REVENUECAT_KEYS.ios;
  return !key.includes('REPLACE_WITH');
}

/* ---------------------------------------------------------------------------
 * Types — a thin shape the UI renders, mapped from either source.
 * ------------------------------------------------------------------------- */

export interface RevenueCatPackageInfo {
  identifier: string;
  packageType: 'MONTHLY' | 'ANNUAL' | 'LIFETIME' | 'CUSTOM';
  product: {
    identifier: string;
    description: string;
    title: string;
    price: number;
    priceString: string;
    currencyCode: string;
    introductoryPrice?: {
      price: number;
      priceString: string;
      period: string;
      cycles: number;
    } | null;
  };
  /** Present only for real SDK packages; required to actually purchase. */
  native?: PurchasesPackage;
}

export interface RevenueCatOfferingData {
  identifier: string;
  serverDescription: string;
  availablePackages: RevenueCatPackageInfo[];
  /** True when these came from the preview fallback rather than the store. */
  isSimulated: boolean;
}

export interface RevenueCatCustomerState {
  originalAppUserId: string;
  activeSubscriptions: string[];
  entitlements: {
    active: Record<
      string,
      {
        identifier: string;
        isActive: boolean;
        willRenew: boolean;
        periodType: string;
        latestPurchaseDate: string;
        expirationDate: string | null;
        productIdentifier: string;
      }
    >;
  };
  managementURL: string | null;
  isSimulated: boolean;
}

/* ---------------------------------------------------------------------------
 * Product catalogue used for the web preview and as the design reference for
 * what to create in App Store Connect / Play Console.
 * ------------------------------------------------------------------------- */

export const PRODUCT_IDS = {
  monthly: 'wreact_pro_monthly_399',
  annual: 'wreact_pro_annual_2999',
  lifetime: 'wreact_founder_lifetime_4999',
} as const;

export const PREVIEW_OFFERING: RevenueCatOfferingData = {
  identifier: 'default',
  serverDescription: 'WREACT Pro — preview catalogue (no store connected)',
  isSimulated: true,
  availablePackages: [
    {
      identifier: '$rc_monthly',
      packageType: 'MONTHLY',
      product: {
        identifier: PRODUCT_IDS.monthly,
        title: 'WREACT Pro — Monthly',
        description:
          'Unlimited duels, full reaction telemetry, no ads, and a verified badge on the world standings.',
        price: 3.99,
        priceString: '$3.99',
        currencyCode: 'USD',
        introductoryPrice: {
          price: 0,
          priceString: 'First 3 days free',
          period: 'P3D',
          cycles: 1,
        },
      },
    },
    {
      identifier: '$rc_annual',
      packageType: 'ANNUAL',
      product: {
        identifier: PRODUCT_IDS.annual,
        title: 'WREACT Pro — Annual',
        description: 'Everything in Pro, billed yearly. Save 37%.',
        price: 29.99,
        priceString: '$29.99',
        currencyCode: 'USD',
      },
    },
    {
      identifier: '$rc_lifetime',
      packageType: 'LIFETIME',
      product: {
        identifier: PRODUCT_IDS.lifetime,
        title: 'WREACT Founder — Lifetime',
        description: 'One payment, permanent Pro, and a founder mark beside your name.',
        price: 49.99,
        priceString: '$49.99',
        currencyCode: 'USD',
      },
    },
  ],
};

/* ---------------------------------------------------------------------------
 * Mapping helpers
 * ------------------------------------------------------------------------- */

function mapPackage(pkg: PurchasesPackage): RevenueCatPackageInfo {
  const product = pkg.product;
  const intro = product.introPrice;

  return {
    identifier: pkg.identifier,
    packageType: (pkg.packageType as RevenueCatPackageInfo['packageType']) ?? 'CUSTOM',
    product: {
      identifier: product.identifier,
      title: product.title,
      description: product.description,
      price: product.price,
      priceString: product.priceString,
      currencyCode: product.currencyCode,
      introductoryPrice: intro
        ? {
            price: intro.price,
            priceString: intro.priceString,
            period: intro.period ?? '',
            cycles: intro.cycles ?? 1,
          }
        : null,
    },
    native: pkg,
  };
}

function mapCustomerInfo(info: CustomerInfo): RevenueCatCustomerState {
  const active: RevenueCatCustomerState['entitlements']['active'] = {};

  for (const [key, entitlement] of Object.entries(info.entitlements.active ?? {})) {
    active[key] = {
      identifier: entitlement.identifier,
      isActive: entitlement.isActive,
      willRenew: entitlement.willRenew,
      periodType: entitlement.periodType,
      latestPurchaseDate: entitlement.latestPurchaseDate,
      expirationDate: entitlement.expirationDate ?? null,
      productIdentifier: entitlement.productIdentifier,
    };
  }

  return {
    originalAppUserId: info.originalAppUserId,
    activeSubscriptions: info.activeSubscriptions ?? [],
    entitlements: { active },
    managementURL: info.managementURL ?? null,
    isSimulated: false,
  };
}

/* ---------------------------------------------------------------------------
 * Service
 * ------------------------------------------------------------------------- */

class RevenueCatService {
  private configured = false;
  private appUserId = '';

  /** True when running without a real store connection (web / missing keys). */
  get isSimulated(): boolean {
    return !isNative() || !hasRealKeys();
  }

  async initialize(userId: string): Promise<void> {
    this.appUserId = userId;

    if (this.isSimulated) {
      if (isNative() && !hasRealKeys()) {
        console.error(
          '[RevenueCat] SHIPPING MISCONFIGURATION: native build with a placeholder ' +
            'API key. Purchases are disabled and the paywall will refuse. Set ' +
            'VITE_REVENUECAT_ANDROID_KEY / VITE_REVENUECAT_IOS_KEY and rebuild.'
        );
      }
      return;
    }

    if (this.configured) {
      await Purchases.logIn({ appUserID: userId }).catch(() => {});
      return;
    }

    try {
      if (import.meta.env.DEV) {
        await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      }

      await Purchases.configure({
        apiKey:
          platform() === 'android' ? REVENUECAT_KEYS.android : REVENUECAT_KEYS.ios,
        appUserID: userId,
      });

      this.configured = true;
    } catch (err) {
      console.error('[RevenueCat] configure failed:', err);
    }
  }

  async getOfferings(): Promise<RevenueCatOfferingData> {
    if (this.isSimulated) return PREVIEW_OFFERING;

    try {
      const { current } = await Purchases.getOfferings();
      if (!current) return PREVIEW_OFFERING;

      return {
        identifier: current.identifier,
        serverDescription: current.serverDescription,
        availablePackages: (current as PurchasesOffering).availablePackages.map(mapPackage),
        isSimulated: false,
      };
    } catch (err) {
      console.warn('[RevenueCat] getOfferings failed, showing preview catalogue:', err);
      return PREVIEW_OFFERING;
    }
  }

  async getCustomerInfo(): Promise<RevenueCatCustomerState> {
    if (this.isSimulated) return this.previewCustomerState();

    try {
      const { customerInfo } = await Purchases.getCustomerInfo();
      return mapCustomerInfo(customerInfo);
    } catch (err) {
      console.warn('[RevenueCat] getCustomerInfo failed:', err);
      return this.previewCustomerState();
    }
  }

  async purchasePackage(
    pkg: RevenueCatPackageInfo
  ): Promise<{ success: boolean; cancelled: boolean; customerInfo: RevenueCatCustomerState }> {
    if (this.isSimulated || !pkg.native) {
      /**
       * On a device, this branch is a misconfiguration, not a preview.
       *
       * The keys fall back to `..._REPLACE_WITH_...` placeholders when the
       * VITE_ vars are absent at build time, which makes `isSimulated` true on
       * real hardware -- so tapping Subscribe granted Pro, reported success,
       * and never showed a Play billing sheet or charged anyone. Refuse
       * instead: an unconfigured build must fail visibly rather than hand out
       * an entitlement it cannot sell.
       */
      if (isNative()) {
        console.error(
          '[RevenueCat] Refusing to grant Pro: this native build has no real API key. ' +
            'Set VITE_REVENUECAT_ANDROID_KEY (or _IOS_KEY) and rebuild.'
        );
        return {
          success: false,
          cancelled: false,
          customerInfo: await this.getCustomerInfo(),
        };
      }

      // Browser preview only, so the paywall and Pro states stay testable.
      localStorage.setItem('wreact_preview_pro', 'true');
      return { success: true, cancelled: false, customerInfo: this.previewCustomerState() };
    }

    try {
      const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg.native });
      return { success: true, cancelled: false, customerInfo: mapCustomerInfo(customerInfo) };
    } catch (err) {
      const cancelled = Boolean((err as { userCancelled?: boolean })?.userCancelled);
      if (!cancelled) console.error('[RevenueCat] purchase failed:', err);
      return {
        success: false,
        cancelled,
        customerInfo: await this.getCustomerInfo(),
      };
    }
  }

  async restorePurchases(): Promise<{
    success: boolean;
    restored: boolean;
    customerInfo: RevenueCatCustomerState;
  }> {
    if (this.isSimulated) {
      const state = this.previewCustomerState();
      return {
        success: true,
        restored: Boolean(state.entitlements.active[REVENUECAT_ENTITLEMENT_ID]),
        customerInfo: state,
      };
    }

    try {
      const { customerInfo } = await Purchases.restorePurchases();
      const mapped = mapCustomerInfo(customerInfo);
      return {
        success: true,
        restored: Boolean(mapped.entitlements.active[REVENUECAT_ENTITLEMENT_ID]),
        customerInfo: mapped,
      };
    } catch (err) {
      console.error('[RevenueCat] restore failed:', err);
      return { success: false, restored: false, customerInfo: await this.getCustomerInfo() };
    }
  }

  /** Subscribe to entitlement changes (renewals, expiries, cross-device). */
  async onCustomerInfoChanged(
    handler: (state: RevenueCatCustomerState) => void
  ): Promise<void> {
    if (this.isSimulated) return;
    try {
      await Purchases.addCustomerInfoUpdateListener((info) => handler(mapCustomerInfo(info)));
    } catch {
      /* listener unsupported — entitlement still refreshes on app resume */
    }
  }

  private previewCustomerState(): RevenueCatCustomerState {
    // The preview unlock is a browser affordance and must never confer an
    // entitlement on a device. Reading it on native would let a flag written by
    // an earlier misconfigured build keep reporting an active subscription
    // through getCustomerInfo and restorePurchases.
    const isPro = !isNative() && localStorage.getItem('wreact_preview_pro') === 'true';

    return {
      originalAppUserId: this.appUserId || 'preview-user',
      activeSubscriptions: isPro ? [PRODUCT_IDS.monthly] : [],
      entitlements: {
        active: isPro
          ? {
              [REVENUECAT_ENTITLEMENT_ID]: {
                identifier: REVENUECAT_ENTITLEMENT_ID,
                isActive: true,
                willRenew: true,
                periodType: 'NORMAL',
                latestPurchaseDate: new Date().toISOString(),
                expirationDate: null,
                productIdentifier: PRODUCT_IDS.monthly,
              },
            }
          : {},
      },
      managementURL: null,
      isSimulated: true,
    };
  }
}

export const revenueCat = new RevenueCatService();

/** Convenience: does this customer hold Pro right now? */
export function isProActive(state: RevenueCatCustomerState | null): boolean {
  return Boolean(state?.entitlements.active[REVENUECAT_ENTITLEMENT_ID]?.isActive);
}

/** Kept for the existing paywall import; now points at the preview catalogue. */
export const DEFAULT_OFFERING = PREVIEW_OFFERING;
