import { prisma } from "@/lib/db/prisma";
import type {
  CommunicationSettings,
  StorefrontCommunication,
} from "./types";

// ─── Default settings — used when no DB record exists or query fails ────

const DEFAULTS: CommunicationSettings = {
  contact: {
    email: null,
    phone: null,
    address: null,
    city: null,
    province: null,
    country: "AR",
    schedule: null,
    showInStore: true,
  },
  whatsapp: {
    number: null,
    displayName: null,
    connected: false,
    verifiedAt: null,
    buttonEnabled: false,
    buttonText: "¡Hola! Quiero consultar sobre sus productos",
    buttonPosition: "bottom-right",
  },
  instagram: {
    handle: null,
    url: null,
    connected: false,
    showInStore: false,
  },
  facebook: {
    pageUrl: null,
    pageName: null,
    connected: false,
    showInStore: false,
  },
  emails: {
    orderCreated: true,
    paymentApproved: true,
    paymentPending: true,
    paymentFailed: true,
    orderShipped: true,
    orderCancelled: true,
    paymentRefunded: true,
    orderDelivered: true,
    abandonedCart: false,
    stockCritical: true,
  },
};

// ─── Admin: get full communication settings ─────────────────────────────

export async function getCommunicationSettings(
  storeId: string,
): Promise<CommunicationSettings> {
  let row;
  try {
    row = await prisma.storeCommunicationSettings.findUnique({
      where: { storeId },
    });
  } catch (error) {
    // Table may not exist yet (migration pending) — return safe defaults
    console.error("[Communication] Failed to load settings, using defaults:", error);
    return DEFAULTS;
  }

  if (!row) {
    return DEFAULTS;
  }

  return {
    contact: {
      email: row.contactEmail,
      phone: row.contactPhone,
      address: row.contactAddress,
      city: row.contactCity,
      province: row.contactProvince,
      country: row.contactCountry,
      schedule: row.contactSchedule,
      showInStore: row.showContactInStore,
    },
    whatsapp: {
      number: row.whatsappNumber,
      displayName: row.whatsappDisplayName,
      connected: row.whatsappConnected,
      verifiedAt: row.whatsappVerifiedAt?.toISOString() ?? null,
      buttonEnabled: row.whatsappButtonEnabled,
      buttonText: row.whatsappButtonText,
      buttonPosition: (row.whatsappButtonPosition as "bottom-right" | "bottom-left") ?? "bottom-right",
    },
    instagram: {
      handle: row.instagramHandle,
      url: row.instagramUrl,
      connected: row.instagramConnected,
      showInStore: row.showInstagramInStore,
    },
    facebook: {
      pageUrl: row.facebookPageUrl,
      pageName: row.facebookPageName,
      connected: row.facebookConnected,
      showInStore: row.showFacebookInStore,
    },
    emails: {
      orderCreated: row.emailOrderCreated,
      paymentApproved: row.emailPaymentApproved,
      paymentPending: row.emailPaymentPending,
      paymentFailed: row.emailPaymentFailed,
      orderShipped: row.emailOrderShipped,
      orderCancelled: row.emailOrderCancelled,
      paymentRefunded: row.emailPaymentRefunded,
      orderDelivered: row.emailOrderDelivered,
      abandonedCart: row.emailAbandonedCart,
      stockCritical: row.emailStockCritical,
    },
  };
}

// ─── Storefront: get communication data for rendering ───────────────────

export async function getStorefrontCommunication(
  storeId: string,
): Promise<StorefrontCommunication> {
  const EMPTY: StorefrontCommunication = { contact: null, whatsapp: null, socialLinks: [] };

  let row;
  try {
    row = await prisma.storeCommunicationSettings.findUnique({
      where: { storeId },
    });
  } catch (error) {
    console.error("[Communication] Failed to load storefront settings:", error);
    return EMPTY;
  }

  if (!row) {
    return EMPTY;
  }

  // Contact info — only expose if merchant enabled it
  const contact =
    row.showContactInStore &&
    (row.contactEmail || row.contactPhone || row.contactAddress)
      ? {
          email: row.contactEmail,
          phone: row.contactPhone,
          address: [row.contactAddress, row.contactCity, row.contactProvince]
            .filter(Boolean)
            .join(", ") || null,
          schedule: row.contactSchedule,
        }
      : null;

  // WhatsApp button — only when number exists and button is enabled
  const whatsapp =
    row.whatsappNumber && row.whatsappButtonEnabled
      ? {
          number: row.whatsappNumber,
          buttonEnabled: true,
          buttonText:
            row.whatsappButtonText ??
            "¡Hola! Quiero consultar sobre sus productos",
          buttonPosition:
            (row.whatsappButtonPosition as "bottom-right" | "bottom-left") ??
            "bottom-right",
        }
      : null;

  // Social links — only surfaces that are visible in store
  const socialLinks: StorefrontCommunication["socialLinks"] = [];

  if (row.whatsappNumber) {
    socialLinks.push({
      platform: "whatsapp",
      label: "WhatsApp",
      url: `https://wa.me/${row.whatsappNumber.replace(/\D/g, "")}`,
    });
  }

  if (row.showInstagramInStore && row.instagramHandle) {
    socialLinks.push({
      platform: "instagram",
      label: "Instagram",
      url:
        row.instagramUrl ||
        `https://instagram.com/${row.instagramHandle.replace(/^@/, "")}`,
    });
  }

  if (row.showFacebookInStore && row.facebookPageUrl) {
    socialLinks.push({
      platform: "facebook",
      label: row.facebookPageName || "Facebook",
      url: row.facebookPageUrl,
    });
  }

  return { contact, whatsapp, socialLinks };
}
