"use server";

// ─── Order Shipping Operations ─────────────────────────────────────────────
// Server actions that bridge the shipping carrier infrastructure
// (lib/shipping) with the order fulfillment pipeline (lib/store-engine/fulfillment).
// This closes the gap between "carriers exist" and "a merchant can actually
// create a shipment from an order".

import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

import { CARRIERS, getCarrierById } from "@/lib/shipping/registry";
import { listCarrierSummaries, loadAuthContext } from "@/lib/shipping/store-connection";
import { getStoreShippingSettings } from "@/lib/shipping/store-settings";
import { updateOrderFulfillment } from "@/lib/store-engine/fulfillment/actions";
import { logSystemEvent } from "@/lib/observability/audit";
import type { CarrierId, CarrierCapabilities } from "@/lib/shipping/types";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface CarrierCapabilityRow {
  provider: string;
  label: string;
  configured: boolean;
  connected: boolean;
  canQuote: boolean;
  canCreateShipment: boolean;
  canGenerateLabel: boolean;
  canTrack: boolean;
  mode: "real_api" | "manual" | "coming_soon";
}

export interface OrderShippingState {
  requiresShipping: boolean;
  isPickup: boolean;
  shippingMethodLabel: string | null;
  selectedCarrier: string | null;
  currentTrackingCode: string | null;
  currentTrackingUrl: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  shippingStatus: string;
  availableCarriers: CarrierCapabilityRow[];
  canCreateShipment: boolean;
  canMarkManualShipment: boolean;
  warnings: string[];
}

// ─── Query: Shipping state for an order ────────────────────────────────────

export async function getOrderShippingState(orderId: string): Promise<OrderShippingState | null> {
  const store = await getCurrentStore();
  if (!store) return null;

  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId: store.id },
    select: {
      shippingMethodId: true,
      shippingMethodLabel: true,
      shippingCarrier: true,
      shippingStatus: true,
      trackingCode: true,
      trackingUrl: true,
      shippedAt: true,
      deliveredAt: true,
      status: true,
      paymentStatus: true,
    },
  });
  if (!order) return null;

  // Detect pickup by checking ShippingMethod.type
  let isPickup = false;
  if (order.shippingMethodId) {
    const method = await prisma.shippingMethod.findUnique({
      where: { id: order.shippingMethodId },
      select: { type: true },
    });
    isPickup = method?.type === "pickup";
  }
  // Fallback: if label contains "retir" or "pickup" keywords
  const labelLower = (order.shippingMethodLabel || "").toLowerCase();
  if (!isPickup && (labelLower.includes("retir") || labelLower.includes("pickup"))) {
    isPickup = true;
  }

  const requiresShipping = !isPickup;
  const warnings: string[] = [];

  // Build carrier capabilities
  const availableCarriers: CarrierCapabilityRow[] = [];
  if (requiresShipping) {
    const summaries = await listCarrierSummaries(store.id);

    for (const meta of CARRIERS) {
      const summary = summaries.find((s) => s.carrier === meta.id);
      const caps = meta.adapter.capabilities;
      const connected = summary?.status === "connected";
      const configured = !!summary;

      let mode: CarrierCapabilityRow["mode"] = "coming_soon";
      if (connected && caps.createShipment) mode = "real_api";
      else if (configured) mode = "manual";

      availableCarriers.push({
        provider: meta.id,
        label: meta.name,
        configured,
        connected,
        canQuote: connected && caps.quoteShipment,
        canCreateShipment: connected && caps.createShipment,
        canGenerateLabel: connected && caps.labelPdf,
        canTrack: connected && caps.getTracking,
        mode,
      });
    }

    // Check shipping settings
    const settings = await getStoreShippingSettings(store.id);
    if (!settings.originPostalCode) {
      warnings.push("Cargá el código postal de origen en Envíos > Ajustes antes de crear envíos.");
    }
  }

  const alreadyShipped = order.shippingStatus === "shipped" || order.shippingStatus === "delivered";
  const isPaid = order.paymentStatus === "paid";
  const isCancelled = order.status === "cancelled";
  const hasRealCarrier = availableCarriers.some((c) => c.canCreateShipment);

  return {
    requiresShipping,
    isPickup,
    shippingMethodLabel: order.shippingMethodLabel,
    selectedCarrier: order.shippingCarrier,
    currentTrackingCode: order.trackingCode,
    currentTrackingUrl: order.trackingUrl,
    shippedAt: order.shippedAt?.toISOString() ?? null,
    deliveredAt: order.deliveredAt?.toISOString() ?? null,
    shippingStatus: order.shippingStatus,
    availableCarriers,
    canCreateShipment: requiresShipping && !alreadyShipped && isPaid && !isCancelled && hasRealCarrier,
    canMarkManualShipment: requiresShipping && !alreadyShipped && isPaid && !isCancelled,
    warnings,
  };
}

// ─── Action: Create shipment via real carrier ──────────────────────────────

export interface CreateOrderShipmentResult {
  success: boolean;
  trackingCode?: string | null;
  trackingUrl?: string | null;
  labelUrl?: string | null;
  error?: string;
}

export async function createOrderShipment(
  orderId: string,
  carrierId: string,
): Promise<CreateOrderShipmentResult> {
  const store = await getCurrentStore();
  if (!store) return { success: false, error: "No hay tienda activa." };

  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId: store.id },
    select: {
      id: true,
      orderNumber: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      document: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      province: true,
      postalCode: true,
      country: true,
      shippingStatus: true,
      status: true,
      paymentStatus: true,
      total: true,
    },
  });
  if (!order) return { success: false, error: "Orden no encontrada." };
  if (order.status === "cancelled") return { success: false, error: "No se puede enviar una orden cancelada." };
  if (order.paymentStatus !== "paid") return { success: false, error: "La orden no tiene pago confirmado." };
  if (order.shippingStatus === "shipped" || order.shippingStatus === "delivered") {
    return { success: false, error: "La orden ya fue enviada." };
  }

  const meta = getCarrierById(carrierId);
  if (!meta) return { success: false, error: "Carrier no soportado." };
  if (!meta.adapter.createShipment) return { success: false, error: `${meta.name} no soporta creación de envío.` };

  const ctx = await loadAuthContext(store.id, carrierId as CarrierId);
  if (!ctx) return { success: false, error: `Conectá la cuenta de ${meta.name} antes de crear envíos.` };

  const settings = await getStoreShippingSettings(store.id);
  if (!settings.originPostalCode) {
    return { success: false, error: "Cargá el código postal de origen en Envíos > Ajustes." };
  }

  try {
    const res = await meta.adapter.createShipment(ctx, {
      externalOrderId: order.id,
      orderNumber: order.orderNumber,
      origin: {
        name: settings.originContactName ?? "Origen",
        email: settings.originContactEmail ?? "envios@nexora.local",
        phone: settings.originContactPhone ?? null,
        postalCode: settings.originPostalCode,
        street: settings.originStreet ?? null,
        streetNumber: settings.originStreetNumber ?? null,
        floor: settings.originFloor ?? null,
        apartment: settings.originApartment ?? null,
        city: settings.originCity ?? null,
        provinceCode: settings.originProvinceCode ?? null,
        country: "AR",
      },
      destination: {
        name: `${order.firstName} ${order.lastName}`.trim(),
        email: order.email,
        phone: order.phone ?? null,
        document: order.document ?? null,
        postalCode: order.postalCode,
        street: order.addressLine1 ?? null,
        city: order.city,
        province: order.province,
        country: order.country,
      },
      package: {
        weightG: settings.defaultPackageWeightG ?? 1000,
        heightCm: settings.defaultPackageHeightCm ?? 15,
        widthCm: settings.defaultPackageWidthCm ?? 20,
        lengthCm: settings.defaultPackageLengthCm ?? 25,
        declaredValue: order.total,
      },
      deliveryType: "home",
    });

    if (!res.ok) {
      // Sanitize: don't expose raw carrier error if it may contain secrets
      await logSystemEvent({
        storeId: store.id,
        entityType: "order",
        entityId: order.id,
        eventType: "shipment_create_failed",
        severity: "error",
        source: "order_shipping",
        message: `Error creando envío con ${meta.name}: ${res.message}`,
        metadata: { carrier: carrierId, code: res.code },
      });
      return { success: false, error: res.message };
    }

    // Persist CarrierShipment
    const shipment = await prisma.carrierShipment.create({
      data: {
        storeId: store.id,
        carrier: carrierId,
        externalShipmentId: res.externalShipmentId,
        trackingNumber: res.trackingNumber,
        trackingUrl: res.trackingUrl,
        status: res.status,
        destinationName: `${order.firstName} ${order.lastName}`,
        destinationEmail: order.email,
        destinationPostalCode: order.postalCode,
        destinationCity: order.city,
        destinationProvince: order.province,
        weightG: settings.defaultPackageWeightG,
        heightCm: settings.defaultPackageHeightCm,
        widthCm: settings.defaultPackageWidthCm,
        lengthCm: settings.defaultPackageLengthCm,
        declaredValue: order.total,
        rawCreateResponse: (() => { try { const s = JSON.stringify(res.raw); return s.length > 50000 ? s.slice(0, 50000) : s; } catch { return null; } })(),
      },
    });

    // Update order fulfillment (triggers email + system event)
    await updateOrderFulfillment({
      orderId: order.id,
      shippingStatus: "shipped",
      trackingCode: res.trackingNumber || undefined,
      trackingUrl: res.trackingUrl || undefined,
      carrier: meta.name,
    });

    // Additional audit event
    await logSystemEvent({
      storeId: store.id,
      entityType: "order",
      entityId: order.id,
      eventType: "shipment_created",
      source: "order_shipping",
      message: `Envío creado con ${meta.name} para orden ${order.orderNumber}`,
      metadata: {
        carrier: carrierId,
        trackingCode: res.trackingNumber,
        trackingUrl: res.trackingUrl,
        mode: "real_api",
        labelGenerated: meta.adapter.capabilities.labelPdf && !!res.externalShipmentId,
      },
    });

    const labelUrl = meta.adapter.capabilities.labelPdf && shipment.externalShipmentId
      ? `/api/shipping/label?carrier=${encodeURIComponent(carrierId)}&id=${encodeURIComponent(shipment.externalShipmentId)}`
      : null;

    revalidatePath("/admin/orders");

    return {
      success: true,
      trackingCode: res.trackingNumber,
      trackingUrl: res.trackingUrl,
      labelUrl,
    };
  } catch (err: any) {
    await logSystemEvent({
      storeId: store.id,
      entityType: "order",
      entityId: order.id,
      eventType: "shipment_create_failed",
      severity: "error",
      source: "order_shipping",
      message: `Error inesperado creando envío con ${meta.name}`,
      metadata: { carrier: carrierId },
    });
    return { success: false, error: "Error inesperado al crear el envío. Intentá de nuevo." };
  }
}

// ─── Action: Mark shipped manually ─────────────────────────────────────────

export interface MarkShippedManuallyInput {
  orderId: string;
  carrierName: string;
  trackingCode: string;
  trackingUrl: string;
  note: string;
}

export interface MarkShippedResult {
  success: boolean;
  error?: string;
}

export async function markOrderShippedManually(
  input: MarkShippedManuallyInput,
): Promise<MarkShippedResult> {
  const store = await getCurrentStore();
  if (!store) return { success: false, error: "No hay tienda activa." };

  const order = await prisma.order.findFirst({
    where: { id: input.orderId, storeId: store.id },
    select: {
      id: true,
      orderNumber: true,
      shippingStatus: true,
      status: true,
      paymentStatus: true,
    },
  });
  if (!order) return { success: false, error: "Orden no encontrada." };
  if (order.status === "cancelled") return { success: false, error: "No se puede enviar una orden cancelada." };
  if (order.paymentStatus !== "paid") return { success: false, error: "La orden no tiene pago confirmado." };
  if (order.shippingStatus === "shipped" || order.shippingStatus === "delivered") {
    return { success: false, error: "La orden ya fue marcada como enviada." };
  }

  try {
    // Update order fulfillment (triggers email + system event)
    await updateOrderFulfillment({
      orderId: input.orderId,
      shippingStatus: "shipped",
      trackingCode: input.trackingCode || undefined,
      trackingUrl: input.trackingUrl || undefined,
      carrier: input.carrierName || "Manual",
    });

    // Audit event
    await logSystemEvent({
      storeId: store.id,
      entityType: "order",
      entityId: order.id,
      eventType: "order_marked_shipped",
      source: "order_shipping",
      message: `Orden ${order.orderNumber} marcada como enviada manualmente`,
      metadata: {
        carrier: input.carrierName || "Manual",
        trackingCode: input.trackingCode || null,
        trackingUrl: input.trackingUrl || null,
        note: input.note || null,
        mode: "manual",
      },
    });

    revalidatePath("/admin/orders");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Error al marcar como enviado." };
  }
}

// ─── Action: Update tracking on already-shipped order ──────────────────────

export async function updateOrderTracking(
  orderId: string,
  trackingCode: string,
  trackingUrl: string,
): Promise<MarkShippedResult> {
  const store = await getCurrentStore();
  if (!store) return { success: false, error: "No hay tienda activa." };

  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId: store.id },
    select: { id: true, orderNumber: true, shippingStatus: true, status: true },
  });
  if (!order) return { success: false, error: "Orden no encontrada." };
  if (order.status === "cancelled") return { success: false, error: "Orden cancelada." };

  await prisma.order.update({
    where: { id: orderId },
    data: {
      trackingCode: trackingCode || null,
      trackingUrl: trackingUrl || null,
    },
  });

  await logSystemEvent({
    storeId: store.id,
    entityType: "order",
    entityId: order.id,
    eventType: "tracking_updated",
    source: "order_shipping",
    message: `Tracking actualizado para orden ${order.orderNumber}`,
    metadata: { trackingCode, trackingUrl },
  });

  revalidatePath("/admin/orders");
  return { success: true };
}
