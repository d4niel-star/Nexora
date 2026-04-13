"use server";

import { prisma } from "@/lib/db/prisma";

export type AIContextType = "general" | "store" | "catalog" | "orders" | "marketing" | "support";

interface ContextData {
  storeSummary?: string;
  productsSummary?: string;
  ordersSummary?: string;
  extra?: string;
}

/**
 * Builds a scoped system prompt with real store context for the AI assistant.
 * Only exposes aggregated/summary data — never raw secrets or full DB dumps.
 */
export async function buildContextPrompt(storeId: string, contextType: AIContextType): Promise<string> {
  const basePrompt = `Sos el asistente de IA integrado en Nexora, una plataforma de e-commerce profesional.
Respondés en español argentino. Sos directo, útil y profesional.
No inventés datos que no tengas. Si no sabés algo, decilo.
Tus respuestas deben ser prácticas y orientadas a acción.
Usá markdown para formatear.`;

  const context = await getContextData(storeId, contextType);

  const contextBlock = [
    context.storeSummary && `## Contexto de la tienda\n${context.storeSummary}`,
    context.productsSummary && `## Catálogo\n${context.productsSummary}`,
    context.ordersSummary && `## Pedidos\n${context.ordersSummary}`,
    context.extra,
  ].filter(Boolean).join("\n\n");

  const scopeInstructions: Record<AIContextType, string> = {
    general: "Podés ayudar con cualquier aspecto de la tienda: catálogo, ventas, marketing, operaciones, soporte.",
    store: "Enfocate en ayudar con la configuración, diseño, branding, bloques y estructura de la tienda.",
    catalog: "Enfocate en ayudar con productos, descripciones, títulos, categorías, SEO y precios.",
    orders: "Enfocate en los pedidos, envíos, estados, fulfillment y atención al comprador.",
    marketing: "Enfocate en estrategias de marketing, campañas, copy, promos y engagement.",
    support: "Enfocate en generar FAQs, respuestas tipo, políticas y contenido de soporte.",
  };

  return `${basePrompt}\n\n${scopeInstructions[contextType]}\n\n${contextBlock}`.trim();
}

async function getContextData(storeId: string, contextType: AIContextType): Promise<ContextData> {
  const data: ContextData = {};

  // Always get store summary (lightweight)
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { name: true, slug: true, status: true, currency: true, locale: true },
  });

  if (store) {
    data.storeSummary = `Nombre: ${store.name}\nSlug: ${store.slug}\nEstado: ${store.status}\nMoneda: ${store.currency}\nLocale: ${store.locale}`;
  }

  // Context-specific data
  if (contextType === "catalog" || contextType === "general" || contextType === "store") {
    const productCount = await prisma.product.count({ where: { storeId } });
    const publishedCount = await prisma.product.count({ where: { storeId, isPublished: true } });
    const categories = await prisma.collection.findMany({
      where: { storeId },
      select: { title: true },
      take: 10,
    });

    const topProducts = await prisma.product.findMany({
      where: { storeId },
      select: { title: true, price: true, compareAtPrice: true, handle: true },
      take: 6,
      orderBy: { createdAt: "desc" },
    });

    data.productsSummary = [
      `Total de productos: ${productCount} (${publishedCount} publicados)`,
      `Categorías: ${categories.map(c => c.title).join(", ") || "ninguna"}`,
      topProducts.length > 0 ? `Productos recientes:\n${topProducts.map(p => `- ${p.title}: $${p.price}`).join("\n")}` : "",
    ].filter(Boolean).join("\n");
  }

  if (contextType === "orders" || contextType === "general") {
    const totalOrders = await prisma.order.count({ where: { storeId } });
    const newOrders = await prisma.order.count({ where: { storeId, status: "new" } });
    const revenue = await prisma.order.aggregate({
      where: { storeId },
      _sum: { total: true },
    });

    data.ordersSummary = [
      `Total de pedidos: ${totalOrders}`,
      `Pedidos nuevos: ${newOrders}`,
      `Revenue total: $${(revenue._sum.total ?? 0).toLocaleString("es-AR")}`,
    ].join("\n");
  }

  if (contextType === "marketing") {
    data.extra = `## Enfoque de Marketing\nAyudá al merchant a crear campañas, mejorar copy, diseñar promos y aumentar el engagement. Usá el contexto del catálogo y la tienda.`;
  }

  if (contextType === "support") {
    data.extra = `## Soporte\nAyudá a generar FAQs, plantillas de respuesta para clientes, políticas de devolución y contenido de ayuda.`;
  }

  return data;
}
