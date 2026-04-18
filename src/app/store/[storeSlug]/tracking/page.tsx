import { getStorefrontData } from "@/lib/store-engine/queries";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { TrackingClient } from "@/components/storefront/tracking/TrackingClient";
import { getAllProviders } from "@/lib/logistics/registry";

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

      // Try to fetch live external tracking if possible
      if (order.trackingCode && order.shippingCarrier) {
        const providers = getAllProviders();
        const providerMatch = providers.find(p => p.name === order.shippingCarrier);
        if (providerMatch) {
           try {
              const liveStatus = await providerMatch.getTrackingStatus("unknown_shipment_id", order.trackingCode);
              trackedOrder.liveTracking = liveStatus;
           } catch (err) {
              console.error(`Failed to fetch live tracking from ${providerMatch.name} for ${order.trackingCode}`, err);
           }
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
