import type { BlockType } from "@/types/store-engine";

interface DefaultContext {
  brandName: string;
  heroText?: string;
  storeSlug: string;
}

export function getDefaultBlockSettings(
  blockType: BlockType,
  ctx: DefaultContext
): Record<string, unknown> {
  switch (blockType) {
    case "hero":
      return {
        headline: ctx.heroText ?? `Descubrí ${ctx.brandName}`,
        subheadline: `Productos de calidad pensados para vos. Explorá nuestra colección curada.`,
        primaryActionLabel: "Comprar ahora",
        primaryActionLink: `/store/${ctx.storeSlug}/products`,
        secondaryActionLabel: "Conocer más",
        backgroundImageUrl:
          "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=2000",
      };

    case "benefits":
      return {
        title: `Por qué elegir ${ctx.brandName}`,
        benefits: [
          {
            title: "Envío Gratis",
            description: "En pedidos mayores a $50.000",
            icon: "Truck",
          },
          {
            title: "Calidad Garantizada",
            description: "30 días de garantía",
            icon: "Shield",
          },
          {
            title: "Soporte 24/7",
            description: "Atención personalizada",
            icon: "Headphones",
          },
        ],
      };

    case "featured_products":
      return {
        title: "Nuestros Favoritos",
        subtitle: "Descubrí lo más buscado de la temporada.",
        productHandles: [],
      };

    case "featured_categories":
      return {
        title: "Explorá por Categoría",
        collectionHandles: [],
      };

    case "testimonials":
      return {
        title: "Lo que dicen nuestros clientes",
        testimonials: [
          {
            name: "María G.",
            text: "Excelente calidad y envío rapidísimo. Voy a volver a comprar seguro!",
            rating: 5,
          },
          {
            name: "Lucas P.",
            text: "El packaging es hermoso. Perfecto para regalar.",
            rating: 5,
          },
          {
            name: "Sofía R.",
            text: "Atención al cliente increíble. Resolvieron mi consulta en minutos.",
            rating: 4,
          },
        ],
      };

    case "faq":
      return {
        title: "Preguntas Frecuentes",
        questions: [
          {
            question: "¿Cuánto tarda el envío?",
            answer:
              "Los envíos dentro de CABA y GBA se entregan en 24-48hs hábiles. Al interior del país, entre 3-5 días hábiles.",
          },
          {
            question: "¿Puedo devolver un producto?",
            answer:
              "Sí, tenés 30 días desde la recepción para iniciar una devolución sin costo.",
          },
          {
            question: "¿Qué métodos de pago aceptan?",
            answer:
              "Aceptamos tarjetas de crédito/débito, transferencia bancaria y Mercado Pago.",
          },
        ],
      };

    case "newsletter":
      return {
        title: "Únete al Inner Circle",
        description:
          "Recibí 10% OFF en tu primera compra y enteráte de lanzamientos antes que nadie.",
        buttonLabel: "Suscribirse",
      };

    default:
      return {};
  }
}

export function validateBlockSettings(
  blockType: BlockType,
  settings: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  switch (blockType) {
    case "hero":
      if (!settings.headline) errors.push("Hero block requires a headline");
      break;
    case "benefits":
      if (!settings.title) errors.push("Benefits block requires a title");
      if (!Array.isArray(settings.benefits) || settings.benefits.length === 0)
        errors.push("Benefits block requires at least one benefit");
      break;
    case "featured_products":
      if (!settings.title)
        errors.push("Featured products block requires a title");
      break;
    case "featured_categories":
      if (!settings.title)
        errors.push("Featured categories block requires a title");
      break;
    case "testimonials":
      if (!settings.title) errors.push("Testimonials block requires a title");
      break;
    case "faq":
      if (!settings.title) errors.push("FAQ block requires a title");
      break;
    case "newsletter":
      if (!settings.title) errors.push("Newsletter block requires a title");
      break;
  }

  return { valid: errors.length === 0, errors };
}
