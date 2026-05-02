"use server";

// ─── Store Readiness Engine ──────────────────────────────────────────────
// Evaluates a store's operational readiness with real data.
// Every query is scoped by storeId. No secrets exposed.
// Uses count/aggregate/findFirst — never loads full datasets.

import { prisma } from "@/lib/db/prisma";
import { getStorefrontAnalyticsConfig } from "@/lib/ads/pixels/storefront-query";

// ─── Types ─────────────────────────────────────────────────────────────────

export type ReadinessSeverity = "blocking" | "recommended" | "optional";
export type ReadinessStatus = "complete" | "warning" | "missing" | "not_applicable";

export interface ReadinessItem {
  id: string;
  category: string;
  label: string;
  description: string;
  status: ReadinessStatus;
  severity: ReadinessSeverity;
  actionLabel?: string;
  actionHref?: string;
  evidence?: string;
}

export interface StoreReadiness {
  overallStatus: "ready" | "almost_ready" | "not_ready";
  score: number;
  blockingMissing: number;
  recommendedMissing: number;
  optionalMissing: number;
  items: ReadinessItem[];
}

// ─── Main query ────────────────────────────────────────────────────────────

export async function getStoreReadiness(storeId: string): Promise<StoreReadiness> {
  const items: ReadinessItem[] = [];

  // ── Parallel data fetch (all counts/aggregates, no full datasets) ──────
  const [
    store,
    branding,
    commSettings,
    // Catalog
    activeProductCount,
    activeProductsNoPriceCount,
    activeProductsNoImageCount,
    activeProductsNoCostCount,
    activeProductsNoVariantCount,
    // Stock
    totalVariantsActive,
    variantsWithStockCount,
    variantsBackorderCount,
    // Payments
    paymentProviders,
    // Shipping
    shippingMethodsActive,
    pickupMethodsActive,
    carrierConnections,
    shippingSettings,
    // Location
    location,
    // Emails
    emailLogCount,
    // Pixels
    pixelConfig,
  ] = await Promise.all([
    // Store identity
    prisma.store.findUnique({
      where: { id: storeId },
      select: { name: true, slug: true, logo: true, description: true, status: true, customDomain: true },
    }),
    prisma.storeBranding.findUnique({ where: { storeId }, select: { logoUrl: true } }),
    prisma.storeCommunicationSettings.findUnique({
      where: { storeId },
      select: {
        contactEmail: true, contactPhone: true,
        whatsappNumber: true, whatsappButtonEnabled: true,
        instagramHandle: true, facebookPageUrl: true,
        emailOrderCreated: true, emailPaymentApproved: true,
        emailOrderShipped: true, emailOrderCancelled: true,
      },
    }),
    // Catalog counts
    prisma.product.count({ where: { storeId, status: "published", isPublished: true } }),
    prisma.product.count({ where: { storeId, status: "published", isPublished: true, price: { lte: 0 } } }),
    prisma.product.count({ where: { storeId, status: "published", isPublished: true, featuredImage: null } }),
    prisma.product.count({ where: { storeId, status: "published", isPublished: true, cost: null } }),
    // Products with NO variants at all
    prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) as count FROM "Product" p WHERE p."storeId" = $1 AND p."status" = 'published' AND p."isPublished" = true AND NOT EXISTS (SELECT 1 FROM "ProductVariant" v WHERE v."productId" = p."id")`,
      storeId,
    ),
    // Stock: total active variants
    prisma.productVariant.count({
      where: { product: { storeId, status: "published", isPublished: true } },
    }),
    // Variants with stock > 0
    prisma.productVariant.count({
      where: { product: { storeId, status: "published", isPublished: true }, stock: { gt: 0 } },
    }),
    // Variants with backorder enabled
    prisma.productVariant.count({
      where: { product: { storeId, status: "published", isPublished: true }, allowBackorder: true },
    }),
    // Payment providers
    prisma.storePaymentProvider.findMany({
      where: { storeId },
      select: { provider: true, status: true },
    }),
    // Shipping
    prisma.shippingMethod.count({ where: { storeId, isActive: true, type: "shipping" } }),
    prisma.shippingMethod.count({ where: { storeId, isActive: true, type: "pickup" } }),
    prisma.storeCarrierConnection.findMany({
      where: { storeId },
      select: { carrier: true, status: true },
    }),
    prisma.storeShippingSettings.findUnique({
      where: { storeId },
      select: { originPostalCode: true },
    }),
    // Location
    prisma.storeLocation.findFirst({
      where: { storeId },
      select: {
        name: true, addressLine: true, pickupEnabled: true,
        hours: { select: { id: true }, take: 1 },
      },
    }),
    // Email logs (evidence of real sends)
    prisma.emailLog.count({ where: { storeId, status: "sent" } }),
    // Pixels
    getStorefrontAnalyticsConfig(storeId),
  ]);

  const noVariantCount = Number(activeProductsNoVariantCount?.[0]?.count ?? 0);

  // ═══════════════════════════════════════════════════════════════════════
  // 1. IDENTITY
  // ═══════════════════════════════════════════════════════════════════════

  items.push({
    id: "identity_name",
    category: "Identidad",
    label: "Nombre de tienda",
    description: "Tu tienda necesita un nombre visible para clientes.",
    status: store?.name ? "complete" : "missing",
    severity: "blocking",
    evidence: store?.name || undefined,
    actionLabel: "Configurar tienda",
    actionHref: "/admin/store",
  });

  items.push({
    id: "identity_slug",
    category: "Identidad",
    label: "Slug público",
    description: "URL pública donde se accede a tu tienda.",
    status: store?.slug ? "complete" : "missing",
    severity: "blocking",
    evidence: store?.slug ? `/store/${store.slug}` : undefined,
    actionLabel: "Configurar tienda",
    actionHref: "/admin/store",
  });

  const hasLogo = !!(store?.logo || branding?.logoUrl);
  items.push({
    id: "identity_logo",
    category: "Identidad",
    label: "Logo de tienda",
    description: "Un logo refuerza la identidad de marca en el storefront.",
    status: hasLogo ? "complete" : "missing",
    severity: "recommended",
    actionLabel: "Subir logo",
    actionHref: "/admin/store",
  });

  items.push({
    id: "identity_description",
    category: "Identidad",
    label: "Descripción de tienda",
    description: "Ayuda a SEO y a que los clientes entiendan qué vendés.",
    status: store?.description ? "complete" : "missing",
    severity: "recommended",
    actionLabel: "Agregar descripción",
    actionHref: "/admin/store",
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 2. CATALOG
  // ═══════════════════════════════════════════════════════════════════════

  items.push({
    id: "catalog_active",
    category: "Catálogo",
    label: "Productos activos publicados",
    description: "Necesitás al menos un producto publicado para vender.",
    status: activeProductCount > 0 ? "complete" : "missing",
    severity: "blocking",
    evidence: `${activeProductCount} productos activos`,
    actionLabel: "Ir al catálogo",
    actionHref: "/admin/catalog",
  });

  if (activeProductCount > 0) {
    items.push({
      id: "catalog_price",
      category: "Catálogo",
      label: "Productos con precio válido",
      description: "Todos los productos activos deben tener precio > $0.",
      status: activeProductsNoPriceCount === 0 ? "complete" : "missing",
      severity: "blocking",
      evidence: activeProductsNoPriceCount > 0 ? `${activeProductsNoPriceCount} sin precio válido` : "Todos con precio",
      actionLabel: "Revisar precios",
      actionHref: "/admin/catalog",
    });

    items.push({
      id: "catalog_variants",
      category: "Catálogo",
      label: "Productos con variantes",
      description: "Los productos necesitan al menos una variante para funcionar en checkout.",
      status: noVariantCount === 0 ? "complete" : "missing",
      severity: "blocking",
      evidence: noVariantCount > 0 ? `${noVariantCount} sin variantes` : "Todos con variantes",
      actionLabel: "Revisar variantes",
      actionHref: "/admin/catalog",
    });

    items.push({
      id: "catalog_image",
      category: "Catálogo",
      label: "Productos con imagen",
      description: "Las imágenes aumentan la conversión significativamente.",
      status: activeProductsNoImageCount === 0 ? "complete" : "missing",
      severity: "recommended",
      evidence: activeProductsNoImageCount > 0 ? `${activeProductsNoImageCount} sin imagen` : "Todos con imagen",
      actionLabel: "Agregar imágenes",
      actionHref: "/admin/catalog",
    });

    items.push({
      id: "catalog_cost",
      category: "Catálogo",
      label: "Costos cargados",
      description: "Cargar costos permite calcular márgenes y rentabilidad.",
      status: activeProductsNoCostCount === 0 ? "complete" : "missing",
      severity: "recommended",
      evidence: activeProductsNoCostCount > 0 ? `${activeProductsNoCostCount} sin costo` : "Todos con costo",
      actionLabel: "Cargar costos",
      actionHref: "/admin/catalog",
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 3. STOCK
  // ═══════════════════════════════════════════════════════════════════════

  if (totalVariantsActive > 0) {
    const sellableVariants = variantsWithStockCount + variantsBackorderCount;
    const allOutOfStock = sellableVariants === 0;
    const someOutOfStock = sellableVariants < totalVariantsActive && !allOutOfStock;

    items.push({
      id: "stock_availability",
      category: "Stock",
      label: "Stock disponible para venta",
      description: "Al menos un producto necesita stock o backorder activo.",
      status: allOutOfStock ? "missing" : someOutOfStock ? "warning" : "complete",
      severity: allOutOfStock ? "blocking" : "recommended",
      evidence: `${variantsWithStockCount} con stock, ${variantsBackorderCount} con backorder, de ${totalVariantsActive} variantes`,
      actionLabel: "Gestionar inventario",
      actionHref: "/admin/inventory",
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 4. PAYMENTS
  // ═══════════════════════════════════════════════════════════════════════

  const mpProvider = paymentProviders.find((p: any) => p.provider === "mercadopago");
  const mpConnected = mpProvider?.status === "connected";
  const anyPaymentConnected = paymentProviders.some((p: any) => p.status === "connected");

  items.push({
    id: "payment_operational",
    category: "Pagos",
    label: "Método de pago operativo",
    description: "Necesitás al menos un método de pago conectado para cobrar.",
    status: anyPaymentConnected ? "complete" : "missing",
    severity: "blocking",
    evidence: mpConnected
      ? "Mercado Pago conectado"
      : anyPaymentConnected
        ? `${paymentProviders.filter((p: any) => p.status === "connected").map((p: any) => p.provider).join(", ")} conectado`
        : "Sin método de pago",
    actionLabel: "Configurar pagos",
    actionHref: "/admin/settings",
  });

  if (paymentProviders.length > 0 && !anyPaymentConnected) {
    const pending = paymentProviders.filter((p: any) => p.status !== "connected");
    items.push({
      id: "payment_pending",
      category: "Pagos",
      label: "Proveedores pendientes",
      description: "Hay proveedores configurados pero no conectados.",
      status: "warning",
      severity: "recommended",
      evidence: pending.map((p) => `${p.provider}: ${p.status}`).join(", "),
      actionLabel: "Revisar conexión",
      actionHref: "/admin/settings",
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 5. DELIVERY (Shipping / Pickup)
  // ═══════════════════════════════════════════════════════════════════════

  const hasShipping = shippingMethodsActive > 0;
  const hasPickup = pickupMethodsActive > 0;
  const hasDelivery = hasShipping || hasPickup;

  items.push({
    id: "delivery_method",
    category: "Entrega",
    label: "Método de entrega activo",
    description: "Necesitás envío o pickup activo para que los clientes reciban sus pedidos.",
    status: hasDelivery ? "complete" : "missing",
    severity: "blocking",
    evidence: [
      hasShipping && `${shippingMethodsActive} método(s) de envío`,
      hasPickup && `${pickupMethodsActive} método(s) de pickup`,
    ].filter(Boolean).join(", ") || "Sin método de entrega",
    actionLabel: hasShipping ? "Ver envíos" : "Configurar envíos",
    actionHref: "/admin/shipping",
  });

  if (hasShipping) {
    const connectedCarriers = carrierConnections.filter((c: any) => c.status === "connected");
    items.push({
      id: "delivery_carrier",
      category: "Entrega",
      label: "Carrier API conectado",
      description: "Un carrier conectado permite cotizar y crear envíos automáticos.",
      status: connectedCarriers.length > 0 ? "complete" : "missing",
      severity: "recommended",
      evidence: connectedCarriers.length > 0
        ? connectedCarriers.map((c: any) => c.carrier).join(", ")
        : "Sin carrier conectado (envío manual disponible)",
      actionLabel: "Conectar carrier",
      actionHref: "/admin/shipping",
    });

    items.push({
      id: "delivery_origin",
      category: "Entrega",
      label: "Origen de envío configurado",
      description: "El código postal de origen es necesario para cotizar y generar etiquetas.",
      status: shippingSettings?.originPostalCode ? "complete" : "missing",
      severity: "recommended",
      evidence: shippingSettings?.originPostalCode ? `CP: ${shippingSettings.originPostalCode}` : undefined,
      actionLabel: "Configurar origen",
      actionHref: "/admin/shipping",
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 6. COMMUNICATION
  // ═══════════════════════════════════════════════════════════════════════

  const hasContact = !!(commSettings?.contactEmail || commSettings?.contactPhone || commSettings?.whatsappNumber);

  items.push({
    id: "comm_contact",
    category: "Comunicación",
    label: "Canal de contacto visible",
    description: "Los clientes necesitan al menos un canal de contacto.",
    status: hasContact ? "complete" : "missing",
    severity: "blocking",
    evidence: [
      commSettings?.contactEmail && `Email: ${commSettings.contactEmail}`,
      commSettings?.contactPhone && `Tel: ${commSettings.contactPhone}`,
      commSettings?.whatsappNumber && "WhatsApp activo",
    ].filter(Boolean).join(", ") || "Sin canal de contacto",
    actionLabel: "Configurar contacto",
    actionHref: "/admin/communication",
  });

  items.push({
    id: "comm_whatsapp",
    category: "Comunicación",
    label: "WhatsApp configurado",
    description: "WhatsApp es el canal preferido por compradores argentinos.",
    status: commSettings?.whatsappNumber && commSettings?.whatsappButtonEnabled ? "complete" : "missing",
    severity: "recommended",
    evidence: commSettings?.whatsappNumber ? "WhatsApp activo" : undefined,
    actionLabel: "Activar WhatsApp",
    actionHref: "/admin/communication",
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 7. AUTOMATED EMAILS
  // ═══════════════════════════════════════════════════════════════════════

  const hasResend = !!process.env.RESEND_API_KEY;

  items.push({
    id: "email_provider",
    category: "Emails",
    label: "Proveedor de email configurado",
    description: "Sin proveedor real (Resend), los emails no llegan a clientes.",
    status: hasResend ? "complete" : "missing",
    severity: "recommended",
    evidence: hasResend ? "Resend configurado" : "Usando MockProvider (emails no se envían)",
    actionLabel: "Ver documentación",
    actionHref: "/admin/communication",
  });

  const criticalEmails = [
    { key: "emailOrderCreated" as const, label: "Confirmación de orden" },
    { key: "emailPaymentApproved" as const, label: "Pago aprobado" },
    { key: "emailOrderShipped" as const, label: "Envío con tracking" },
    { key: "emailOrderCancelled" as const, label: "Cancelación" },
  ];

  for (const { key, label } of criticalEmails) {
    const isEnabled = commSettings?.[key] ?? true; // defaults are true in schema
    items.push({
      id: `email_${key}`,
      category: "Emails",
      label: `Email: ${label}`,
      description: `El email "${label}" está ${isEnabled ? "activado" : "desactivado"}.`,
      status: isEnabled ? "complete" : "warning",
      severity: "recommended",
      evidence: isEnabled ? "Activado" : "Desactivado",
      actionLabel: "Gestionar emails",
      actionHref: "/admin/communication",
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 8. STOREFRONT
  // ═══════════════════════════════════════════════════════════════════════

  const storefrontAccessible = !!(store?.slug && store.status === "active");

  items.push({
    id: "storefront_accessible",
    category: "Storefront",
    label: "Tienda pública accesible",
    description: "Los clientes deben poder acceder a tu tienda por URL.",
    status: storefrontAccessible ? "complete" : "missing",
    severity: "blocking",
    evidence: storefrontAccessible ? `/store/${store!.slug}` : "Tienda no accesible",
    actionLabel: "Ver storefront",
    actionHref: store?.slug ? `/store/${store.slug}` : "/admin/store",
  });

  items.push({
    id: "storefront_domain",
    category: "Storefront",
    label: "Dominio custom",
    description: "Un dominio propio mejora la confianza del cliente.",
    status: store?.customDomain ? "complete" : "missing",
    severity: "optional",
    evidence: store?.customDomain || undefined,
    actionLabel: "Configurar dominio",
    actionHref: "/admin/store",
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 9. PIXELS / TRACKING
  // ═══════════════════════════════════════════════════════════════════════

  const hasGA4 = pixelConfig.ga4MeasurementIds.length > 0;
  const hasMeta = pixelConfig.metaPixelIds.length > 0;
  const hasTikTok = pixelConfig.tiktokPixelIds.length > 0;
  const hasAnyPixel = hasGA4 || hasMeta || hasTikTok;

  items.push({
    id: "pixel_analytics",
    category: "Tracking",
    label: "Analytics configurado",
    description: "Sin analytics no podés medir el tráfico y las conversiones.",
    status: hasAnyPixel ? "complete" : "missing",
    severity: "recommended",
    evidence: [
      hasGA4 && `GA4: ${pixelConfig.ga4MeasurementIds.join(", ")}`,
      hasMeta && `Meta Pixel: ${pixelConfig.metaPixelIds.join(", ")}`,
      hasTikTok && `TikTok: ${pixelConfig.tiktokPixelIds.join(", ")}`,
    ].filter(Boolean).join(" · ") || "Sin pixels configurados",
    actionLabel: "Configurar pixels",
    actionHref: "/admin/ads",
  });

  items.push({
    id: "pixel_tiktok",
    category: "Tracking",
    label: "TikTok Pixel",
    description: "TikTok Pixel permite trackear conversiones de campañas de TikTok.",
    status: hasTikTok ? "complete" : "missing",
    severity: "optional",
    actionLabel: "Configurar TikTok",
    actionHref: "/admin/ads",
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 10. PHYSICAL LOCATION (if applicable)
  // ═══════════════════════════════════════════════════════════════════════

  if (hasPickup || location) {
    items.push({
      id: "location_configured",
      category: "Local físico",
      label: "Local físico configurado",
      description: "Si usás pickup, necesitás un local con dirección.",
      status: location?.addressLine ? "complete" : hasPickup ? "missing" : "not_applicable",
      severity: hasPickup ? "blocking" : "recommended",
      evidence: location?.name || undefined,
      actionLabel: "Configurar local",
      actionHref: "/admin/operations",
    });

    if (location) {
      items.push({
        id: "location_hours",
        category: "Local físico",
        label: "Horarios de atención",
        description: "Los clientes necesitan saber cuándo pueden retirar.",
        status: (location.hours?.length ?? 0) > 0 ? "complete" : "missing",
        severity: "recommended",
        actionLabel: "Configurar horarios",
        actionHref: "/admin/operations",
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SCORE & OVERALL STATUS
  // ═══════════════════════════════════════════════════════════════════════

  const blockingMissing = items.filter((i) => i.severity === "blocking" && (i.status === "missing")).length;
  const recommendedMissing = items.filter((i) => i.severity === "recommended" && (i.status === "missing" || i.status === "warning")).length;
  const optionalMissing = items.filter((i) => i.severity === "optional" && i.status === "missing").length;

  const totalItems = items.filter((i) => i.status !== "not_applicable").length;
  const completeItems = items.filter((i) => i.status === "complete").length;
  const score = totalItems > 0 ? Math.round((completeItems / totalItems) * 100) : 0;

  let overallStatus: StoreReadiness["overallStatus"];
  if (blockingMissing > 0) {
    overallStatus = "not_ready";
  } else if (recommendedMissing > 3) {
    overallStatus = "almost_ready";
  } else {
    overallStatus = "ready";
  }

  return { overallStatus, score, blockingMissing, recommendedMissing, optionalMissing, items };
}
