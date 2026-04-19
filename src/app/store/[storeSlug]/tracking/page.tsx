import { getStorefrontData } from "@/lib/store-engine/queries";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { TrackingClient } from "@/components/storefront/tracking/TrackingClient";

export default async function TrackingPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ storeSlug: string }>, 
  searchParams: Promise<{ order?: string; email?: string }> 
}) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const storefrontData = await getStorefrontData(resolvedParams.storeSlug);

  if (!storefrontData) {
    notFound();
  }

  // If query params present, try to look up the order
  let trackedOrder = null;
  if (resolvedSearch.order && resolvedSearch.email) {
    const order = await prisma.order.findFirst({
      where: {
        storeId: storefrontData.store.id,
        orderNumber: resolvedSearch.order,
        email: resolvedSearch.email.toLowerCase(),
      },
      include: {
        items: true,
      },
    });

    if (order) {
      trackedOrder = {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt.toISOString(),
        email: order.email,
        firstName: order.firstName,
        lastName: order.lastName,
        addressLine1: order.addressLine1,
        city: order.city,
        province: order.province,
        postalCode: order.postalCode,
        subtotal: order.subtotal,
        shippingAmount: order.shippingAmount,
        total: order.total,
        currency: order.currency,
        shippingMethodLabel: order.shippingMethodLabel,
        shippingCarrier: order.shippingCarrier,
        shippingEstimate: order.shippingEstimate,
        shippingStatus: order.shippingStatus,
        trackingCode: order.trackingCode,
        trackingUrl: order.trackingUrl,
        items: order.items.map(item => ({
          id: item.id,
          title: item.titleSnapshot,
          variantTitle: item.variantTitleSnapshot,
          quantity: item.quantity,
          price: item.priceSnapshot,
          lineTotal: item.lineTotal,
          image: item.imageSnapshot,
        })),
        liveTracking: null as any, // Placeholder for live external tracking data
      };

      // Fetch real live tracking events from CarrierWebhookLog
      if (order.trackingCode) {
        try {
          const logs = await prisma.carrierWebhookLog.findMany({
            where: { trackingCode: order.trackingCode, status: "processed" },
            orderBy: { processedAt: 'asc' },
          });

          if (logs.length > 0) {
            const STATUS_LABELS: Record<string, string> = {
              "unfulfilled": "Pendiente de preparación",
              "preparing": "En preparación",
              "ready_to_ship": "Listo para despacho",
              "shipped": "En camino",
              "in_transit": "En tránsito",
              "out_for_delivery": "En reparto",
              "delivered": "Entregado",
              "failed_delivery": "Intento de entrega fallido",
              "returned": "Devuelto al remitente",
              "cancelled": "Envío cancelado"
            };

            const events = logs.map(log => {
              let payload: any = {};
              try {
                payload = JSON.parse(log.bodyJson);
              } catch (e) {}

              // Extract data from the payload, fallback to processedAt and generic status
              const carrierStatus = payload.status as string;
              let description = payload.description;
              
              if (!description) {
                 description = carrierStatus ? (STATUS_LABELS[carrierStatus] || "Actualización de estado") : "Actualización de envío";
              }

              return {
                description,
                location: payload.location || null,
                timestamp: payload.timestamp || log.processedAt.toISOString(),
              };
            });

            trackedOrder.liveTracking = { events };
          }
        } catch (err) {
          console.error(`Failed to fetch live tracking events for ${order.trackingCode}`, err);
        }
      }
    }
  }

  return (
    <TrackingClient 
      storeSlug={resolvedParams.storeSlug}
      locale={storefrontData.store.locale}
      currency={storefrontData.store.currency}
      initialOrder={trackedOrder}
      initialOrderNumber={resolvedSearch.order || ""}
      initialEmail={resolvedSearch.email || ""}
    />
  );
}
