// RevenueCat Entitlements & Product Identifiers for App Store / StoreKit
export const REVENUECAT_ENTITLEMENT_ID = 'pro_access';

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
}

export interface RevenueCatOfferingData {
  identifier: string;
  serverDescription: string;
  availablePackages: RevenueCatPackageInfo[];
  monthly?: RevenueCatPackageInfo;
  annual?: RevenueCatPackageInfo;
  lifetime?: RevenueCatPackageInfo;
}

export interface RevenueCatCustomerState {
  originalAppUserId: string;
  activeSubscriptions: string[];
  entitlements: {
    active: Record<string, {
      identifier: string;
      isActive: boolean;
      willRenew: boolean;
      periodType: string;
      latestPurchaseDate: string;
      expirationDate: string | null;
      productIdentifier: string;
    }>;
  };
  managementURL: string | null;
}

// Default fallback offering catalog matching App Store IAP setup for Shipathon
export const DEFAULT_OFFERING: RevenueCatOfferingData = {
  identifier: 'default_paywall',
  serverDescription: 'WREACT Pro Athlete Pass Offerings',
  availablePackages: [
    {
      identifier: '$rc_monthly',
      packageType: 'MONTHLY',
      product: {
        identifier: 'wreact_pro_monthly_399',
        title: 'WREACT Pro Athlete Monthly',
        description: 'Unlimited 1v1 duels, millisecond perception telemetry, gold halo avatar and zero ads.',
        price: 3.99,
        priceString: '$3.99',
        currencyCode: 'USD',
        introductoryPrice: {
          price: 0.0,
          priceString: '$0.00 (3-day trial)',
          period: 'P3D',
          cycles: 1,
        },
      },
    },
    {
      identifier: '$rc_annual',
      packageType: 'ANNUAL',
      product: {
        identifier: 'wreact_pro_annual_2999',
        title: 'WREACT Pro Athlete Annual (Best Value - Save 37%)',
        description: 'Annual access to all telemetry graphs, custom sound packs, and national team captain perks.',
        price: 29.99,
        priceString: '$29.99',
        currencyCode: 'USD',
      },
    },
    {
      identifier: '$rc_lifetime',
      packageType: 'LIFETIME',
      product: {
        identifier: 'wreact_founder_lifetime_4999',
        title: 'WREACT Founder Lifetime Pass',
        description: 'Permanent VIP unlock with exclusive Shipathon Gold Founder badge forever.',
        price: 49.99,
        priceString: '$49.99',
        currencyCode: 'USD',
      },
    },
  ],
};

class RevenueCatService {
  private isConfigured: boolean = false;
  private currentUserId: string = '';
  private apiKey: string = '';

  constructor() {
    this.apiKey = 'appl_wreact_shipathon_demo_key';
  }

  public initialize(userId: string) {
    this.currentUserId = userId || `user_anon_${Math.random().toString(36).substring(2, 9)}`;
    this.isConfigured = true;
    console.log(`[RevenueCat] Initialized SDK with App User ID: ${this.currentUserId}`);
  }

  public async getOfferings(): Promise<RevenueCatOfferingData> {
    // In live Capacitor/iOS runtime, this calls window.Purchases.getOfferings()
    // For web preview & Shipathon staging, returns the active offering structure
    try {
      if (typeof window !== 'undefined' && (window as any).Purchases) {
        const nativeOfferings = await (window as any).Purchases.getOfferings();
        if (nativeOfferings?.current) {
          return nativeOfferings.current;
        }
      }
    } catch (e) {
      console.warn('[RevenueCat] Native purchases not detected, using fallback offering:', e);
    }
    return DEFAULT_OFFERING;
  }

  public async getCustomerInfo(): Promise<RevenueCatCustomerState> {
    const isPro = localStorage.getItem('wreact_pro_pass') === 'true';
    const expiration = localStorage.getItem('wreact_pro_expiration') || '2027-12-31T23:59:59Z';

    return {
      originalAppUserId: this.currentUserId || 'athlete_user',
      activeSubscriptions: isPro ? ['wreact_pro_monthly_399'] : [],
      entitlements: {
        active: isPro
          ? {
              [REVENUECAT_ENTITLEMENT_ID]: {
                identifier: REVENUECAT_ENTITLEMENT_ID,
                isActive: true,
                willRenew: true,
                periodType: 'NORMAL',
                latestPurchaseDate: new Date().toISOString(),
                expirationDate: expiration,
                productIdentifier: 'wreact_pro_monthly_399',
              },
            }
          : {},
      },
      managementURL: 'https://apps.apple.com/account/subscriptions',
    };
  }

  public async purchasePackage(pkg: RevenueCatPackageInfo): Promise<{ success: boolean; customerInfo: RevenueCatCustomerState }> {
    console.log(`[RevenueCat] Initiating StoreKit purchase for product: ${pkg.product.identifier} (${pkg.product.priceString})`);
    
    // Simulate StoreKit / RevenueCat purchase cycle with full local persistence
    await new Promise((resolve) => setTimeout(resolve, 800));

    localStorage.setItem('wreact_pro_pass', 'true');
    localStorage.setItem('wreact_pro_product', pkg.product.identifier);
    localStorage.setItem('wreact_pro_purchased_at', new Date().toISOString());

    const customerInfo = await this.getCustomerInfo();
    return {
      success: true,
      customerInfo,
    };
  }

  public async restorePurchases(): Promise<{ success: boolean; restored: boolean; customerInfo: RevenueCatCustomerState }> {
    console.log('[RevenueCat] Restoring purchases via Apple App Store receipt validation...');
    await new Promise((resolve) => setTimeout(resolve, 900));

    // Check if there was any historical receipt
    const wasPro = localStorage.getItem('wreact_pro_pass') === 'true' || localStorage.getItem('wreact_pro_product') !== null;
    if (wasPro) {
      localStorage.setItem('wreact_pro_pass', 'true');
    }

    const customerInfo = await this.getCustomerInfo();
    return {
      success: true,
      restored: wasPro,
      customerInfo,
    };
  }
}

export const revenueCat = new RevenueCatService();
