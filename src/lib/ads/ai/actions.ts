"use server";

import { prisma } from "@/lib/db/prisma";

export async function buildAdsContext(storeId: string) {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: {
      branding: true,
      products: { 
        where: { isPublished: true },
        select: { id: true, title: true, price: true, cost: true, description: true, category: true }
      },
      orders: {
        where: { shippingStatus: "delivered" },
        take: 50,
        orderBy: { createdAt: "desc" },
        select: { total: true }
      }
    }
  });

  if (!store) throw new Error("Store not found");

  // Calculate simple context metrics
  let totalRevenue = 0;
  store.orders.forEach((o: any) => totalRevenue += o.total);
  const avgOrderValue = store.orders.length > 0 ? totalRevenue / store.orders.length : 0;

  // Best products by "margin" (price - cost)
  const productsWithMargin = store.products.map((p: any) => ({
    ...p,
    margin: p.price - (p.cost || 0),
    marginPercent: p.cost ? ((p.price - p.cost) / p.price) * 100 : 100
  })).sort((a: any, b: any) => b.margin - a.margin);

  const topProducts = productsWithMargin.slice(0, 3);
  const tone = store.branding?.tone || "professional";

  return {
    storeName: store.name,
    locale: store.locale,
    tone,
    avgOrderValue,
    totalProducts: store.products.length,
    topProducts,
    categories: Array.from(new Set(store.products.map((p: any) => p.category).filter(Boolean))),
  };
}

export async function generateAdsCopilotRecommendations(storeId: string) {
  const context = await buildAdsContext(storeId);
  const { logSystemEvent } = await import("@/lib/observability/audit");

  // In a real product, this makes an API call to OpenAI / Anthropic passing `context`.
  // For the MVP, we generate structured deterministic JSON mimicking the AI response.

  const reco1 = {
      platform: "meta",
      type: "new_campaign",
      priority: "high",
      title: "Campaña de Ventas: Top Margen",
      summary: "Impulsa los productos con mayor margen neto para maximizar ROAS diario.",
      recommendationJson: JSON.stringify({
         objective: "sales",
         budgetSuggestion: 15000, // local currency
         suggestedProducts: context.topProducts.map(p => p.id),
         audience: "Retargeting visitantes 30d + Lookalike 1%",
         creativeAngles: [
           "Solución práctica al problema del cliente",
           "Demostración de calidad premium"
         ],
         hook: "Por qué todo el mundo está hablando de...",
         primaryText: `¡Descubrí el producto estrella de ${context.storeName}! Diseñado para durar y con calidad garantizada.`,
         cta: "Comprar ahora"
      })
  };

  const reco2 = {
      platform: "google",
      type: "new_campaign",
      priority: "medium",
      title: "Campaña Search: Marca + Intención Crítica",
      summary: "Capturá a quienes buscan exactamente tus categorías estrella.",
      recommendationJson: JSON.stringify({
         objective: "leads_or_sales",
         budgetSuggestion: 8000,
         suggestedProducts: context.topProducts.slice(0,1).map(p => p.id),
         audience: `Palabras clave enfocadas en: ${context.categories.join(", ")}`,
         creativeAngles: ["Comparación directa con competidor principal"],
         hook: `¿Buscás [Categoría]? La mejor opción está en ${context.storeName}`,
         primaryText: "Calidad premium, soporte asegurado. Pedilo hoy y recibilo en tu casa.",
         cta: "Ver tienda"
      })
  };

  // Create them in DB
  const [created1, created2] = await prisma.$transaction([
    prisma.adRecommendation.create({ data: { storeId, ...reco1 } }),
    prisma.adRecommendation.create({ data: { storeId, ...reco2 } })
  ]);

  await logSystemEvent({
     storeId,
     entityType: "ai_ads",
     entityId: created1.id,
     eventType: "ads_recommendation_generated",
     source: "ads_copilot",
     message: `Nexora AI generó 2 recomendaciones basadas en ${context.totalProducts} productos activos.`
  });

  return [created1, created2];
}

export async function getStoreRecommendations(storeId: string) {
   return prisma.adRecommendation.findMany({
     where: { storeId, dismissedAt: null },
     orderBy: { priority: "asc" } // high < medium < low alphabetically? wait "high" depends...
   });
}
