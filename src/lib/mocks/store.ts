import type {
  StoreTheme,
  StoreBranding,
  HomeSection,
  NavItem,
  StorePage,
  StoreDomain,
  StorePreview,
  StoreSummary,
} from "@/types/store";

const now = Date.now();
const HOUR = 1000 * 60 * 60;
const DAY = HOUR * 24;

const hoursAgo = (h: number) => new Date(now - h * HOUR).toISOString();
const daysAgo = (d: number) => new Date(now - d * DAY).toISOString();

// ─── Themes ───

export const MOCK_THEMES: StoreTheme[] = [
  {
    id: "theme_01",
    name: "Minimal Pro",
    style: "minimal",
    description: "Diseño limpio y moderno con tipografía sobria, espacios amplios y foco total en producto.",
    status: "published",
    version: "2.1.0",
    lastModified: hoursAgo(3),
    previewColors: ["#111111", "#FAFAFA", "#10B981"],
  },
  {
    id: "theme_02",
    name: "Bold Commerce",
    style: "bold",
    description: "Diseño vibrante con colores fuertes, tipografía bold y CTAs agresivos. Ideal para promos.",
    status: "draft",
    version: "1.0.0",
    lastModified: daysAgo(5),
    previewColors: ["#7C3AED", "#F59E0B", "#111111"],
  },
  {
    id: "theme_03",
    name: "Classic Elegance",
    style: "classic",
    description: "Estilo clasico con serif, bordes sutiles y una estetica refinada para productos premium.",
    status: "draft",
    version: "1.2.0",
    lastModified: daysAgo(12),
    previewColors: ["#1E3A5F", "#D4AF37", "#FAFAFA"],
  },
];

// ─── Branding ───

export const MOCK_BRANDING: StoreBranding = {
  storeName: "TechStore Argentina",
  logoUrl: "/logo-techstore.png",
  faviconUrl: "/favicon-techstore.png",
  primaryColor: "#111111",
  secondaryColor: "#10B981",
  fontFamily: "Inter",
  buttonStyle: "rounded",
};

// ─── Home Sections ───

export const MOCK_HOME_SECTIONS: HomeSection[] = [
  { id: "sec_01", type: "hero", label: "Hero principal", status: "active", order: 1, description: "Banner principal con imagen, titulo y CTA." },
  { id: "sec_02", type: "featured-products", label: "Productos destacados", status: "active", order: 2, description: "Grilla de 4 productos seleccionados." },
  { id: "sec_03", type: "categories", label: "Categorias", status: "active", order: 3, description: "Cards con categorias principales de la tienda." },
  { id: "sec_04", type: "benefits", label: "Beneficios", status: "active", order: 4, description: "3 iconos con envio gratis, garantia y soporte." },
  { id: "sec_05", type: "testimonials", label: "Testimonios", status: "hidden", order: 5, description: "Carrusel con reviews de clientes verificados." },
  { id: "sec_06", type: "faq", label: "Preguntas frecuentes", status: "active", order: 6, description: "Acordeon con 5 preguntas mas comunes." },
  { id: "sec_07", type: "newsletter", label: "Newsletter", status: "active", order: 7, description: "Formulario de suscripcion con titulo y descripcion." },
];

// ─── Navigation ───

export const MOCK_NAV_ITEMS: NavItem[] = [
  { id: "nav_01", label: "Inicio", destination: "/", group: "main", status: "active", order: 1 },
  { id: "nav_02", label: "Catalogo", destination: "/catalogo", group: "main", status: "active", order: 2 },
  { id: "nav_03", label: "Ofertas", destination: "/ofertas", group: "main", status: "active", order: 3 },
  { id: "nav_04", label: "Contacto", destination: "/contacto", group: "main", status: "active", order: 4 },
  { id: "nav_05", label: "Nosotros", destination: "/nosotros", group: "main", status: "hidden", order: 5 },
  { id: "nav_06", label: "Politica de privacidad", destination: "/privacidad", group: "footer", status: "active", order: 1 },
  { id: "nav_07", label: "Terminos y condiciones", destination: "/terminos", group: "footer", status: "active", order: 2 },
  { id: "nav_08", label: "Devoluciones", destination: "/devoluciones", group: "footer", status: "active", order: 3 },
  { id: "nav_09", label: "WhatsApp", destination: "https://wa.me/5491155001234", group: "quick-links", status: "active", order: 1 },
  { id: "nav_10", label: "Instagram", destination: "https://instagram.com/techstore", group: "quick-links", status: "active", order: 2 },
];

// ─── Pages ───

export const MOCK_PAGES: StorePage[] = [
  { id: "page_01", name: "Inicio", slug: "/", status: "published", lastModified: hoursAgo(1), type: "system" },
  { id: "page_02", name: "Contacto", slug: "/contacto", status: "published", lastModified: daysAgo(3), type: "system" },
  { id: "page_03", name: "Preguntas frecuentes", slug: "/faq", status: "published", lastModified: daysAgo(7), type: "system" },
  { id: "page_04", name: "Politica de privacidad", slug: "/privacidad", status: "published", lastModified: daysAgo(14), type: "system" },
  { id: "page_05", name: "Devoluciones", slug: "/devoluciones", status: "published", lastModified: daysAgo(14), type: "system" },
  { id: "page_06", name: "Nosotros", slug: "/nosotros", status: "draft", lastModified: daysAgo(2), type: "system" },
  { id: "page_07", name: "Guia de talles", slug: "/guia-talles", status: "published", lastModified: daysAgo(10), type: "custom" },
  { id: "page_08", name: "Programa de afiliados", slug: "/afiliados", status: "draft", lastModified: daysAgo(1), type: "custom" },
];

// ─── Domain ───

export const MOCK_DOMAIN: StoreDomain = {
  subdomain: "techstore.nexora.app",
  customDomain: "www.techstore.com.ar",
  ssl: "verified",
  connection: "connected",
  lastVerified: hoursAgo(2),
};

// ─── Preview ───

export const MOCK_PREVIEW: StorePreview = {
  publishedAt: hoursAgo(3),
  status: "published",
  desktopUrl: "https://techstore.nexora.app",
  mobileUrl: "https://techstore.nexora.app",
};

// ─── Summary ───

export const MOCK_STORE_SUMMARY: StoreSummary = {
  themeName: "Minimal Pro",
  themeStatus: "published",
  hasLogo: true,
  primaryColor: "#111111",
  secondaryColor: "#10B981",
  domain: "www.techstore.com.ar",
  publishStatus: "published",
  pagesCount: 8,
  navItemsCount: 10,
  homeSectionsCount: 7,
};
