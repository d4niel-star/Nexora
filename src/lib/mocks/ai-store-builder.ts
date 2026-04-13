import type { AIStoreProject } from "@/types/ai-store-builder";

const d = new Date();
const subtractDays = (days: number) => new Date(d.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

export const MOCK_AI_PROJECT: AIStoreProject = {
  id: "PRJ-AI-9021",
  status: "generated",
  createdAt: subtractDays(2),
  updatedAt: subtractDays(1),
  config: {
    brandName: "Aura Essentials",
    industry: "Cuidado Personal & Belleza",
    storeType: "Marca de nicho (D2C)",
    primaryObjective: "Generar ventas directas y suscripciones",
    targetAudience: "Mujeres 25-45, interesadas en skincare organico y cruelty-free",
    country: "Argentina",
    currency: "ARS",
    brandTone: "Elegante, minimalista, confiable y directo",
  },
  brandStyle: {
    styleCategory: "minimal_premium",
    primaryColor: "#0F172A",
    secondaryColor: "#E2E8F0",
    typography: "Inter / Playfair Display",
    copyTone: "Elegante y persuasivo",
    formalityLevel: "Intermedio",
    visualMood: "Limpio, espacios en blanco amplios, fotografia high-key",
  },
  catalogStructure: {
    useRealCatalog: true,
    featuredProductsCount: 8,
    mainCategories: ["Rutina Facial", "Limpieza", "Serums", "Sets de Regalo"],
    suggestedNavigation: ["Shop All", "Best Sellers", "Sobre Nosotros", "Contacto"],
    suggestedHomepageBlocks: [
      "Hero Banner Text-Left",
      "Features (Cruelty-free, Vegan, etc)",
      "Best Sellers (Carousel)",
      "Banners de Categoria",
      "Social Proof / Reseñas",
      "Instagram Feed",
      "Newsletter Footer"
    ],
    includeFaq: true,
    includePolicies: true,
    includeBenefits: true,
  },
  proposals: [
    {
      id: "PROP-A-MINIMAL",
      name: "Aura Noir (Minimal Premium)",
      styleCategory: "minimal_premium",
      shortSummary: "Diseño extremadamente limpio enfocado en el valor del producto, con tipografias serif elegantes y fondos neutros.",
      suggestedHeroText: "La esencia de tu piel, revelada.",
      homepageStructure: ["Hero", "Features", "Featured Collection", "About Brand", "Testimonials", "Footer"],
      copyTone: "Sofisticado y directo",
      layoutStyle: "Grillas espaciadas, imagenes amplias",
      strengths: ["Alta percepcion de marca", "Carga ultra rapida", "Ideal para ticket alto"],
      previewUrlDesktop: "/assets/mocks/ai-preview-min-desktop.webp",
      previewUrlMobile: "/assets/mocks/ai-preview-min-mobile.webp",
    },
    {
      id: "PROP-B-CONV",
      name: "Aura Flow (Alta Conversion)",
      styleCategory: "high_conversion",
      shortSummary: "Layout diseñado para guiar al usuario directamente al carrito, con CTAs contrastantes y bloques de confianza prominentes.",
      suggestedHeroText: "Cuidado organico que transforma tu rutina. Compra hoy.",
      homepageStructure: ["Hero (Call to Action Fuerte)", "Beneficios Icons", "Best Sellers Row", "UGC / Reseñas Video", "FAQ", "Footer"],
      copyTone: "Urgente y orientado a accion",
      layoutStyle: "Compacto, alto contraste visual",
      strengths: ["Maximiza conversion", "Excelente para movil", "Foco en beneficios"],
      previewUrlDesktop: "/assets/mocks/ai-preview-conv-desktop.webp",
      previewUrlMobile: "/assets/mocks/ai-preview-conv-mobile.webp",
    },
    {
      id: "PROP-C-EDIT",
      name: "Aura Magazine (Editorial)",
      styleCategory: "editorial",
      shortSummary: "Una experiencia inmersiva estilo revista de moda, ideal para contar la historia detras de los ingredientes.",
      suggestedHeroText: "Belleza consciente en cada gota.",
      homepageStructure: ["Hero Full Screen Video", "Brand Story", "Curated Collection", "Journal / Blog", "Instagram Grid", "Footer"],
      copyTone: "Narrativo e inspiracional",
      layoutStyle: "Asimetrico, tipografias grandes",
      strengths: ["Storytelling fuerte", "Diferenciacion visual", "Engagement alto"],
      previewUrlDesktop: "/assets/mocks/ai-preview-edit-desktop.webp",
      previewUrlMobile: "/assets/mocks/ai-preview-edit-mobile.webp",
    }
  ],
  selectedProposalId: "PROP-A-MINIMAL",
  publishReadiness: {
    branding: true,
    catalog: true,
    navigation: false,
    payments: false,
    policies: true,
  }
};
