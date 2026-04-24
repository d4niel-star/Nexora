// ─── Communication module types ─────────────────────────────────────────
// Shared between server actions, queries, and the admin Comunicación page.

export interface ContactInfo {
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  schedule: string | null;
  showInStore: boolean;
}

export interface WhatsAppConfig {
  number: string | null;
  displayName: string | null;
  connected: boolean;
  verifiedAt: string | null;
  // Floating button
  buttonEnabled: boolean;
  buttonText: string | null;
  buttonPosition: "bottom-right" | "bottom-left";
}

export interface InstagramConfig {
  handle: string | null;
  url: string | null;
  connected: boolean;
  showInStore: boolean;
}

export interface FacebookConfig {
  pageUrl: string | null;
  pageName: string | null;
  connected: boolean;
  showInStore: boolean;
}

export interface AutomatedEmailConfig {
  orderCreated: boolean;
  paymentApproved: boolean;
  paymentPending: boolean;
  paymentFailed: boolean;
  orderShipped: boolean;
  orderCancelled: boolean;
  paymentRefunded: boolean;
  orderDelivered: boolean;
  abandonedCart: boolean;
  stockCritical: boolean;
}

/** Full communication settings as served to the admin UI (serializable). */
export interface CommunicationSettings {
  contact: ContactInfo;
  whatsapp: WhatsAppConfig;
  instagram: InstagramConfig;
  facebook: FacebookConfig;
  emails: AutomatedEmailConfig;
}

/** Storefront-facing contact/social data (subset, no admin flags). */
export interface StorefrontCommunication {
  contact: {
    email: string | null;
    phone: string | null;
    address: string | null;
    schedule: string | null;
  } | null;
  whatsapp: {
    number: string;
    buttonEnabled: boolean;
    buttonText: string;
    buttonPosition: "bottom-right" | "bottom-left";
  } | null;
  socialLinks: Array<{
    platform: "instagram" | "facebook" | "whatsapp";
    label: string;
    url: string;
  }>;
}
