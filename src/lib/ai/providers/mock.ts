import type { AIProvider, StoreContext } from "./index";
import type { AIBrief, AIGenerationResult, AIRegenerationResult, AISectionType, AIBlockOutput } from "@/types/ai";

/**
 * MockProvider: Generates high-quality, structured store drafts deterministically.
 * Used for development, demo, and fallback when no real provider is configured.
 */
export const MockProvider: AIProvider = {
  id: "mock",

  async generateStoreDraft(brief: AIBrief, context?: StoreContext): Promise<AIGenerationResult> {
    await simulateDelay(1200);

    const productHandles = context?.existingProducts?.slice(0, 4).map(p => p.handle) ?? [];
    const categoryHandles = context?.existingCategories?.slice(0, 3).map(c => c.handle) ?? [];

    const proposals = [
      buildProposal("A", "minimal_premium", brief, productHandles, categoryHandles),
      buildProposal("B", "high_conversion", brief, productHandles, categoryHandles),
      buildProposal("C", "editorial", brief, productHandles, categoryHandles),
    ];

    return { proposals, tokensUsed: 0 };
  },

  async regenerateSection(brief: AIBrief, section: AISectionType, currentBlocks: AIBlockOutput[]): Promise<AIRegenerationResult> {
    await simulateDelay(800);
    const block = buildBlock(section, brief, currentBlocks.length);
    return { block, tokensUsed: 0 };
  },
};

function simulateDelay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildProposal(
  label: string,
  style: "minimal_premium" | "high_conversion" | "editorial",
  brief: AIBrief,
  productHandles: string[],
  categoryHandles: string[]
) {
  const configs: Record<string, { name: string; summary: string; strengths: string[]; tone: string; visual: string; hero: { headline: string; sub: string; cta: string } }> = {
    minimal_premium: {
      name: `${brief.brandName} Noir (Minimal Premium)`,
      summary: `Diseño ultra limpio enfocado en el valor del producto. Tipografías elegantes, fondos neutros y espacios amplios que transmiten exclusividad para ${brief.industry}.`,
      strengths: ["Alta percepción de marca", "Carga ultra rápida", "Ideal para ticket alto", "Experiencia premium mobile"],
      tone: "Sofisticado y directo",
      visual: "Grillas espaciadas, imágenes amplias, tipografía serif",
      hero: {
        headline: `La esencia de ${brief.brandName}, revelada.`,
        sub: `Descubrí nuestra selección curada de ${brief.industry.toLowerCase()} pensada para vos.`,
        cta: "Explorar colección",
      },
    },
    high_conversion: {
      name: `${brief.brandName} Flow (Alta Conversión)`,
      summary: `Layout diseñado para maximizar conversiones. CTAs contrastantes, bloques de confianza prominentes y flujo directo al carrito para ${brief.industry}.`,
      strengths: ["Maximiza conversión", "Excelente para móvil", "Foco en beneficios", "Reduce fricción de compra"],
      tone: "Urgente y orientado a acción",
      visual: "Compacto, alto contraste visual, CTAs prominentes",
      hero: {
        headline: `${brief.industry} que transforma tu rutina. Comprá hoy.`,
        sub: `Más de 10.000 clientes confían en ${brief.brandName}. Envío gratis en tu primer pedido.`,
        cta: "Comprar ahora",
      },
    },
    editorial: {
      name: `${brief.brandName} Magazine (Editorial)`,
      summary: `Una experiencia inmersiva estilo revista, ideal para contar la historia detrás de ${brief.brandName}. Storytelling visual con tipografías grandes y composiciones asimétricas.`,
      strengths: ["Storytelling fuerte", "Diferenciación visual", "Engagement alto", "Ideal para marca con historia"],
      tone: "Narrativo e inspiracional",
      visual: "Asimétrico, tipografías grandes, composición editorial",
      hero: {
        headline: `Belleza consciente en cada detalle.`,
        sub: `${brief.brandName} nace de la convicción de que ${brief.industry.toLowerCase()} puede ser diferente.`,
        cta: "Conocer la historia",
      },
    },
  };

  const cfg = configs[style];
  const storeSlug = brief.brandName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const blocks: AIBlockOutput[] = [
    {
      type: "hero",
      sortOrder: 0,
      settings: {
        headline: cfg.hero.headline,
        subheadline: cfg.hero.sub,
        primaryActionLabel: cfg.hero.cta,
        primaryActionLink: `/${storeSlug}/collections`,
      },
    },
    {
      type: "featured_products",
      sortOrder: 1,
      settings: {
        title: "Nuestros Favoritos",
        subtitle: "Descubrí lo más buscado de la temporada.",
        productHandles,
      },
    },
    {
      type: "benefits",
      sortOrder: 2,
      settings: {
        title: `Por qué elegir ${brief.brandName}`,
        benefits: [
          { title: "Envío Gratis", description: "En pedidos mayores a $50.000", icon: "truck" },
          { title: "Calidad Garantizada", description: "30 días de garantía", icon: "shield" },
          { title: "Soporte 24/7", description: "Atención personalizada", icon: "headphones" },
        ],
      },
    },
    ...(categoryHandles.length > 0
      ? [{
          type: "featured_categories" as const,
          sortOrder: 3,
          settings: {
            title: "Explorá por categoría",
            collectionHandles: categoryHandles,
          },
        }]
      : []),
    {
      type: "testimonials",
      sortOrder: 4,
      settings: {
        title: "Lo que dicen nuestros clientes",
        testimonials: [
          { name: "María G.", text: `Increíble calidad. ${brief.brandName} superó mis expectativas.`, rating: 5 },
          { name: "Carolina L.", text: "Envío rápido y packaging premium. Voy a repetir seguro.", rating: 5 },
          { name: "Lucía P.", text: "La mejor experiencia de compra online que tuve.", rating: 4 },
        ],
      },
    },
    {
      type: "faq",
      sortOrder: 5,
      settings: {
        title: "Preguntas frecuentes",
        questions: [
          { question: "¿Cuánto tarda el envío?", answer: "Los envíos se procesan en 24-48hs hábiles. El tiempo de entrega depende de tu ubicación." },
          { question: "¿Puedo devolver un producto?", answer: "Sí, aceptamos devoluciones dentro de los 30 días de recibido el producto." },
          { question: "¿Hacen envíos a todo el país?", answer: `Sí, ${brief.brandName} envía a todo el territorio argentino.` },
        ],
      },
    },
    {
      type: "newsletter",
      sortOrder: 6,
      settings: {
        title: "Newsletter",
        description: "Enterate de nuevos lanzamientos y promociones especiales.",
        buttonLabel: "Suscribirse",
      },
    },
  ];

  return {
    name: cfg.name,
    style,
    summary: cfg.summary,
    strengths: cfg.strengths,
    hero: {
      headline: cfg.hero.headline,
      subheadline: cfg.hero.sub,
      ctaLabel: cfg.hero.cta,
      ctaLink: `/${storeSlug}/collections`,
    },
    blocks,
    navigation: [
      { label: "Shop All", href: `/${storeSlug}/collections` },
      { label: "Best Sellers", href: `/${storeSlug}/collections/best-sellers` },
      { label: "Nosotros", href: `/${storeSlug}/about` },
      { label: "Tracking", href: `/${storeSlug}/tracking` },
    ],
    brandClaim: cfg.hero.headline,
    copyTone: cfg.tone,
    visualRecommendations: cfg.visual,
  };
}

function buildBlock(type: AISectionType, brief: AIBrief, sortOrder: number): AIBlockOutput {
  const storeSlug = brief.brandName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const blockBuilders: Record<AISectionType, () => Record<string, unknown>> = {
    hero: () => ({
      headline: `Descubrí ${brief.brandName}`,
      subheadline: `Lo mejor en ${brief.industry.toLowerCase()} para vos.`,
      primaryActionLabel: "Ver productos",
      primaryActionLink: `/${storeSlug}/collections`,
    }),
    benefits: () => ({
      title: `Ventajas ${brief.brandName}`,
      benefits: [
        { title: "Calidad Premium", description: "Productos seleccionados", icon: "star" },
        { title: "Envío Express", description: "Recibí en 24-48hs", icon: "truck" },
        { title: "Garantía Total", description: "Devolución sin costo", icon: "shield" },
      ],
    }),
    faq: () => ({
      title: "Preguntas frecuentes",
      questions: [
        { question: "¿Cómo compro?", answer: "Agregá productos al carrito y completá el checkout con Mercado Pago." },
        { question: "¿Cuánto tarda el envío?", answer: "Procesamos tu pedido en 24hs hábiles." },
      ],
    }),
    testimonials: () => ({
      title: "Opiniones de clientes",
      testimonials: [
        { name: "Cliente Verificado", text: "Excelente experiencia de compra.", rating: 5 },
        { name: "Compradora Frecuente", text: "Siempre vuelvo. Calidad impecable.", rating: 5 },
      ],
    }),
    featured_products: () => ({
      title: "Productos destacados",
      subtitle: "Selección curada para vos.",
      productHandles: [],
    }),
    featured_categories: () => ({
      title: "Categorías",
      collectionHandles: [],
    }),
    newsletter: () => ({
      title: "Suscribite",
      description: "Recibí novedades y ofertas exclusivas.",
      buttonLabel: "Suscribirse",
    }),
  };

  return {
    type,
    sortOrder,
    settings: blockBuilders[type](),
  };
}
