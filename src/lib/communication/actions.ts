"use server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import type { CommunicationSettings } from "./types";

// ─── Save full communication settings ────────────────────────────────────

export async function saveCommunicationSettings(
  settings: CommunicationSettings,
): Promise<{ success: boolean; error?: string }> {
  const store = await getCurrentStore();
  if (!store) return { success: false, error: "No active store" };

  try {
    // Normalise WhatsApp number: strip everything except digits
    const cleanNumber = settings.whatsapp.number
      ? settings.whatsapp.number.replace(/\D/g, "")
      : null;

    // Validate WhatsApp number if provided
    if (cleanNumber && cleanNumber.length < 8) {
      return {
        success: false,
        error: "El número de WhatsApp debe tener al menos 8 dígitos",
      };
    }

    // Normalise Instagram handle: strip @ and url prefix
    let igHandle = settings.instagram.handle;
    if (igHandle) {
      igHandle = igHandle
        .replace(/^@/, "")
        .replace(/^https?:\/\/(www\.)?instagram\.com\//, "")
        .replace(/\/+$/, "")
        .trim();
    }

    // Derive Instagram URL from handle if only handle provided
    const igUrl =
      settings.instagram.url ||
      (igHandle ? `https://instagram.com/${igHandle}` : null);

    await prisma.storeCommunicationSettings.upsert({
      where: { storeId: store.id },
      create: {
        storeId: store.id,
        // Contact
        contactEmail: settings.contact.email || null,
        contactPhone: settings.contact.phone || null,
        contactAddress: settings.contact.address || null,
        contactCity: settings.contact.city || null,
        contactProvince: settings.contact.province || null,
        contactCountry: settings.contact.country || "AR",
        contactSchedule: settings.contact.schedule || null,
        showContactInStore: settings.contact.showInStore,
        // WhatsApp
        whatsappNumber: cleanNumber || null,
        whatsappDisplayName: settings.whatsapp.displayName || null,
        whatsappConnected: Boolean(cleanNumber),
        whatsappVerifiedAt: cleanNumber ? new Date() : null,
        // WhatsApp button
        whatsappButtonEnabled: settings.whatsapp.buttonEnabled,
        whatsappButtonText: settings.whatsapp.buttonText || null,
        whatsappButtonPosition: settings.whatsapp.buttonPosition || "bottom-right",
        // Instagram
        instagramHandle: igHandle || null,
        instagramUrl: igUrl || null,
        instagramConnected: Boolean(igHandle),
        showInstagramInStore: settings.instagram.showInStore,
        // Facebook
        facebookPageUrl: settings.facebook.pageUrl || null,
        facebookPageName: settings.facebook.pageName || null,
        facebookConnected: Boolean(settings.facebook.pageUrl),
        showFacebookInStore: settings.facebook.showInStore,
        // Emails
        emailOrderCreated: settings.emails.orderCreated,
        emailPaymentApproved: settings.emails.paymentApproved,
        emailPaymentPending: settings.emails.paymentPending,
        emailPaymentFailed: settings.emails.paymentFailed,
        emailOrderShipped: settings.emails.orderShipped,
        emailOrderCancelled: settings.emails.orderCancelled,
        emailPaymentRefunded: settings.emails.paymentRefunded,
        emailOrderDelivered: settings.emails.orderDelivered,
        emailAbandonedCart: settings.emails.abandonedCart,
        emailStockCritical: settings.emails.stockCritical,
      },
      update: {
        // Contact
        contactEmail: settings.contact.email || null,
        contactPhone: settings.contact.phone || null,
        contactAddress: settings.contact.address || null,
        contactCity: settings.contact.city || null,
        contactProvince: settings.contact.province || null,
        contactCountry: settings.contact.country || "AR",
        contactSchedule: settings.contact.schedule || null,
        showContactInStore: settings.contact.showInStore,
        // WhatsApp
        whatsappNumber: cleanNumber || null,
        whatsappDisplayName: settings.whatsapp.displayName || null,
        whatsappConnected: Boolean(cleanNumber),
        whatsappVerifiedAt: cleanNumber ? new Date() : undefined,
        // WhatsApp button
        whatsappButtonEnabled: settings.whatsapp.buttonEnabled,
        whatsappButtonText: settings.whatsapp.buttonText || null,
        whatsappButtonPosition: settings.whatsapp.buttonPosition || "bottom-right",
        // Instagram
        instagramHandle: igHandle || null,
        instagramUrl: igUrl || null,
        instagramConnected: Boolean(igHandle),
        showInstagramInStore: settings.instagram.showInStore,
        // Facebook
        facebookPageUrl: settings.facebook.pageUrl || null,
        facebookPageName: settings.facebook.pageName || null,
        facebookConnected: Boolean(settings.facebook.pageUrl),
        showFacebookInStore: settings.facebook.showInStore,
        // Emails
        emailOrderCreated: settings.emails.orderCreated,
        emailPaymentApproved: settings.emails.paymentApproved,
        emailPaymentPending: settings.emails.paymentPending,
        emailPaymentFailed: settings.emails.paymentFailed,
        emailOrderShipped: settings.emails.orderShipped,
        emailOrderCancelled: settings.emails.orderCancelled,
        emailPaymentRefunded: settings.emails.paymentRefunded,
        emailOrderDelivered: settings.emails.orderDelivered,
        emailAbandonedCart: settings.emails.abandonedCart,
        emailStockCritical: settings.emails.stockCritical,
      },
    });

    // Comunicación now lives inside Mi tienda > tab Comunicación. We
    // revalidate both the new home (/admin/store) and the legacy
    // /admin/communication redirect path so any pending RSC payload is
    // refreshed and the merchant sees the change immediately.
    revalidatePath("/admin/store");
    revalidatePath("/admin/communication");
    // Revalidate storefront so the changes appear immediately
    revalidatePath("/store/[storeSlug]", "layout");

    return { success: true };
  } catch (error: unknown) {
    console.error("[Communication] Save failed:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error inesperado al guardar la configuración",
    };
  }
}
