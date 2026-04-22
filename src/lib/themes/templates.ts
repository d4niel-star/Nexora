// ─── Built-in store template registry ───────────────────────────────────
//
// Each template below is a honest, fully editable starting point for a
// Nexora storefront. The payload uses the SAME block types the public
// renderer (StoreSectionRenderer) already knows how to render, so:
//
//   · applying a template produces rows in StoreBlock / StoreBranding
//     that the existing storefront can render without any change;
//   · the merchant can immediately edit every field (copy, colours,
//     order, visibility) from /admin/store?tab=home, because the output
//     is just regular StoreBlock rows;
//   · re-applying a template replaces blocks with `source="template"`
//     only, preserving blocks the merchant authored manually (`manual`)
//     or generated with the AI studio (`ai`).
//
// We avoid featured_products / featured_categories with hardcoded
// handles here because each store's catalog is different; the apply
// pipeline fetches real product/collection handles at apply time and
// injects them into those blocks so templates work on empty catalogs
// and on populated catalogs alike.

import type { StoreTemplate } from "@/types/store-templates";

export const STORE_TEMPLATES: readonly StoreTemplate[] = [
  // ───────────────────────────── 01 ────────────────────────────
  {
    id: "minimal-essentials",
    name: "Minimal Essentials",
    description:
      "Base sobria y editorial. Pensada para marcas que priorizan producto, espacios amplios y lectura sin ruido.",
    industry: "Uso general",
    themeStyle: "minimal",
    branding: {
      primaryColor: "#0F172A",
      secondaryColor: "#E2E8F0",
      fontFamily: "Inter",
      tone: "Elegante y directo",
    },
    homeBlocks: [
      {
        blockType: "hero",
        settings: {
          headline: "Piezas esenciales para todos los días.",
          subheadline:
            "Una colección curada, sin estridencias. Comprá lo que usás, dejá lo que no.",
          primaryActionLabel: "Ver colección",
          primaryActionLink: "",
          secondaryActionLabel: "Conocer la marca",
          backgroundImageUrl:
            "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=2000",
        },
      },
      {
        blockType: "featured_products",
        settings: {
          title: "Selección destacada",
          subtitle: "Los productos que más pedidos reciben esta semana.",
          productHandles: [],
        },
      },
      {
        blockType: "benefits",
        settings: {
          title: "Por qué comprar acá",
          benefits: [
            { title: "Envío en 24–48h", description: "CABA y GBA. Resto del país 3–5 días hábiles.", icon: "Truck" },
            { title: "Cambios sin vueltas", description: "30 días para cambiar o devolver sin costo.", icon: "RefreshCw" },
            { title: "Pago con Mercado Pago", description: "Todas las tarjetas y hasta 12 cuotas.", icon: "CreditCard" },
          ],
        },
      },
      {
        blockType: "newsletter",
        settings: {
          title: "Sumate al newsletter",
          description: "10% OFF en tu primera compra y avisos de reposiciones antes que nadie.",
          buttonLabel: "Suscribirme",
        },
      },
    ],
    footerNavigation: [
      {
        group: "footer_shop",
        items: [
          { label: "Ver todo", href: "/collections" },
          { label: "Novedades", href: "/collections/novedades" },
        ],
      },
      {
        group: "footer_support",
        items: [
          { label: "Contacto", href: "/contact" },
          { label: "Envíos y devoluciones", href: "/policies/returns" },
          { label: "Preguntas frecuentes", href: "/faq" },
        ],
      },
    ],
    version: 1,
  },

  // ───────────────────────────── 02 ────────────────────────────
  {
    id: "bold-commerce",
    name: "Bold Commerce",
    description:
      "Layout pensado para conversión rápida. CTAs marcadas, beneficios arriba, social proof visible, newsletter sólo al final.",
    industry: "Retail y consumo masivo",
    themeStyle: "bold",
    branding: {
      primaryColor: "#1D1D1F",
      secondaryColor: "#FFCC00",
      fontFamily: "System",
      tone: "Directo, enérgico",
    },
    homeBlocks: [
      {
        blockType: "hero",
        settings: {
          headline: "Envío gratis arriba de $50.000",
          subheadline: "Todos los pedidos salen al día siguiente. Llegá antes que el envío estándar.",
          primaryActionLabel: "Comprar ahora",
          primaryActionLink: "",
          secondaryActionLabel: "Ver ofertas",
          backgroundImageUrl:
            "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=2000",
        },
      },
      {
        blockType: "benefits",
        settings: {
          title: "Por qué miles de clientes eligen comprar acá",
          benefits: [
            { title: "Envío gratis +$50K", description: "Llega en 48h a CABA y GBA.", icon: "Truck" },
            { title: "Hasta 12 cuotas", description: "Con todas las tarjetas de crédito.", icon: "CreditCard" },
            { title: "Cambios sin costo", description: "30 días para cambiar talle o modelo.", icon: "RefreshCw" },
            { title: "Atención personalizada", description: "WhatsApp directo de lunes a sábado.", icon: "Headphones" },
          ],
        },
      },
      {
        blockType: "featured_products",
        settings: {
          title: "Los más vendidos",
          subtitle: "Lo que otros compradores están eligiendo ahora.",
          productHandles: [],
        },
      },
      {
        blockType: "testimonials",
        settings: {
          title: "Reseñas reales de clientes",
          testimonials: [
            { name: "Lucía R.", text: "Llegó al día siguiente. Calidad mucho mejor que la foto.", rating: 5 },
            { name: "Javier P.", text: "Pude cambiar el talle sin ningún problema.", rating: 5 },
            { name: "Camila S.", text: "La atención por WhatsApp es súper rápida, resolvieron todo.", rating: 5 },
          ],
        },
      },
      {
        blockType: "featured_categories",
        settings: {
          title: "Elegí tu categoría",
          collectionHandles: [],
        },
      },
      {
        blockType: "newsletter",
        settings: {
          title: "Guardate el 15% OFF",
          description: "Ingresá tu email y te mandamos el código ahora mismo.",
          buttonLabel: "Quiero el descuento",
        },
      },
    ],
    footerNavigation: [
      {
        group: "footer_shop",
        items: [
          { label: "Todos los productos", href: "/collections" },
          { label: "Ofertas", href: "/collections/ofertas" },
          { label: "Novedades", href: "/collections/novedades" },
        ],
      },
      {
        group: "footer_support",
        items: [
          { label: "Ayuda y envíos", href: "/faq" },
          { label: "Cambios y devoluciones", href: "/policies/returns" },
          { label: "Contacto", href: "/contact" },
        ],
      },
    ],
    version: 1,
  },

  // ───────────────────────────── 03 ────────────────────────────
  {
    id: "editorial-brand",
    name: "Editorial Brand",
    description:
      "Narrativa de marca en primer plano. Hero contemplativo, beneficios cualitativos, testimonios y un FAQ extenso para reducir fricción.",
    industry: "Cuidado personal · Belleza · Lifestyle",
    themeStyle: "classic",
    branding: {
      primaryColor: "#3A2E29",
      secondaryColor: "#F5EEE6",
      fontFamily: "Editorial Serif",
      tone: "Cálido, cuidadoso",
    },
    homeBlocks: [
      {
        blockType: "hero",
        settings: {
          headline: "Rituales pequeños, cambios reales.",
          subheadline:
            "Fórmulas limpias, empaques reciclables y lotes chicos. Hechos en Argentina.",
          primaryActionLabel: "Descubrir la línea",
          primaryActionLink: "",
          secondaryActionLabel: "Nuestra historia",
          backgroundImageUrl:
            "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=2000",
        },
      },
      {
        blockType: "featured_categories",
        settings: {
          title: "Líneas",
          collectionHandles: [],
        },
      },
      {
        blockType: "benefits",
        settings: {
          title: "Lo que nos diferencia",
          benefits: [
            { title: "Ingredientes transparentes", description: "Lista completa de cada fórmula, sin letra chica.", icon: "Leaf" },
            { title: "Testeo dermatológico", description: "Cada lote pasa control antes de envasar.", icon: "Shield" },
            { title: "Envases recargables", description: "Reduciendo plástico lote a lote.", icon: "RefreshCw" },
          ],
        },
      },
      {
        blockType: "testimonials",
        settings: {
          title: "Quienes ya la usan",
          testimonials: [
            { name: "Martina L.", text: "Probé dos meses. La piel realmente mejoró y el aroma es hermoso.", rating: 5 },
            { name: "Ana V.", text: "Compré como regalo. La persona me llamó agradeciendo el packaging.", rating: 5 },
          ],
        },
      },
      {
        blockType: "faq",
        settings: {
          title: "Preguntas frecuentes",
          questions: [
            { question: "¿Los productos están testeados en animales?", answer: "No. Ninguna fórmula ni ingrediente es testeado en animales, ni por nosotros ni por proveedores." },
            { question: "¿Cuánto dura un frasco?", answer: "Depende del uso, pero cada presentación está pensada para un ciclo de 6 a 8 semanas." },
            { question: "¿Hacen envío a todo el país?", answer: "Sí, a todo el país. Envíos a CABA y GBA en 24–48h; al interior, 3–5 días hábiles." },
            { question: "¿Puedo devolver si no me gustó?", answer: "Sí. Dentro de los 30 días, sin costo de devolución." },
          ],
        },
      },
      {
        blockType: "newsletter",
        settings: {
          title: "Cartas al inner circle",
          description: "Rituales, lanzamientos y notas del equipo. Un email cada dos semanas, nunca más.",
          buttonLabel: "Sumarme",
        },
      },
    ],
    footerNavigation: [
      {
        group: "footer_shop",
        items: [
          { label: "Toda la línea", href: "/collections" },
          { label: "Regalos", href: "/collections/regalos" },
        ],
      },
      {
        group: "footer_support",
        items: [
          { label: "Nuestra historia", href: "/about" },
          { label: "Ingredientes", href: "/pages/ingredientes" },
          { label: "Contacto", href: "/contact" },
        ],
      },
    ],
    version: 1,
  },

  // ───────────────────────────── 04 ────────────────────────────
  {
    id: "starter-safe",
    name: "Starter — Base segura",
    description:
      "Mínima estructura publicable: hero, productos destacados y beneficios. Ideal para arrancar rápido y construir encima.",
    industry: "Cualquier catálogo",
    themeStyle: "minimal",
    branding: {
      primaryColor: "#111111",
      secondaryColor: "#F4F4F5",
      fontFamily: "Inter",
      tone: "Neutro",
    },
    homeBlocks: [
      {
        blockType: "hero",
        settings: {
          headline: "Bienvenido.",
          subheadline: "Explorá la colección completa.",
          primaryActionLabel: "Ver productos",
          primaryActionLink: "",
          secondaryActionLabel: "",
          backgroundImageUrl:
            "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=2000",
        },
      },
      {
        blockType: "featured_products",
        settings: {
          title: "Productos destacados",
          subtitle: "Una selección del catálogo para empezar.",
          productHandles: [],
        },
      },
      {
        blockType: "benefits",
        settings: {
          title: "Información útil",
          benefits: [
            { title: "Envío", description: "Configurable desde /admin/store.", icon: "Truck" },
            { title: "Pago", description: "Mercado Pago listo para conectar.", icon: "CreditCard" },
            { title: "Cambios", description: "Política editable desde Configuración → Legal.", icon: "RefreshCw" },
          ],
        },
      },
    ],
    version: 1,
  },

  // ───────────────────────────── 05 ────────────────────────────
  {
    id: "moda-urban",
    name: "Urban Fashion",
    description:
      "Layout visual fuerte para marcas de indumentaria. Hero full-bleed, categorías de productos y social proof integrado.",
    industry: "Moda y accesorios",
    themeStyle: "bold",
    branding: {
      primaryColor: "#1A1A1A",
      secondaryColor: "#F5F0EB",
      fontFamily: "Rounded Commerce",
      tone: "Moderno, urbano",
    },
    homeBlocks: [
      {
        blockType: "hero",
        settings: {
          headline: "Nueva temporada. Nuevas reglas.",
          subheadline:
            "Descubrí la colección que redefine lo casual. Diseño argentino, calce real.",
          primaryActionLabel: "Comprar colección",
          primaryActionLink: "",
          secondaryActionLabel: "Lo más vendido",
          backgroundImageUrl:
            "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=2000",
        },
      },
      {
        blockType: "featured_categories",
        settings: {
          title: "Categorías",
          collectionHandles: [],
        },
      },
      {
        blockType: "featured_products",
        settings: {
          title: "Lo más pedido",
          subtitle: "Los productos que se agotan primero cada semana.",
          productHandles: [],
        },
      },
      {
        blockType: "testimonials",
        settings: {
          title: "Lo que dicen",
          testimonials: [
            { name: "Sol M.", text: "Compré dos remeras, el algodón es increíble. Ya pedí más.", rating: 5 },
            { name: "Tomás R.", text: "El talle me salió perfecto, cosa rara comprando online.", rating: 5 },
          ],
        },
      },
      {
        blockType: "newsletter",
        settings: {
          title: "Acceso temprano",
          description: "Suscribite y enteráte de los drops antes que nadie.",
          buttonLabel: "Quiero enterarme",
        },
      },
    ],
    footerNavigation: [
      {
        group: "footer_shop",
        items: [
          { label: "Hombre", href: "/collections/hombre" },
          { label: "Mujer", href: "/collections/mujer" },
          { label: "Accesorios", href: "/collections/accesorios" },
        ],
      },
      {
        group: "footer_support",
        items: [
          { label: "Guía de talles", href: "/pages/talles" },
          { label: "Envíos", href: "/policies/shipping" },
          { label: "Contacto", href: "/contact" },
        ],
      },
    ],
    version: 1,
  },

  // ───────────────────────────── 06 ────────────────────────────
  {
    id: "tech-showcase",
    name: "Tech Showcase",
    description:
      "Diseñado para electrónica y gadgets. Especificaciones claras, beneficios técnicos y un layout que resalta cada producto.",
    industry: "Tecnología y gadgets",
    themeStyle: "minimal",
    branding: {
      primaryColor: "#0A0A0A",
      secondaryColor: "#E8E8E8",
      fontFamily: "Technical Mono",
      tone: "Técnico, preciso",
    },
    homeBlocks: [
      {
        blockType: "hero",
        settings: {
          headline: "Tecnología real. Sin humo.",
          subheadline:
            "Los productos que realmente usamos. Seleccionados, testeados y con garantía local.",
          primaryActionLabel: "Ver catálogo",
          primaryActionLink: "",
          secondaryActionLabel: "",
          backgroundImageUrl:
            "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=2000",
        },
      },
      {
        blockType: "featured_products",
        settings: {
          title: "Productos destacados",
          subtitle: "Selección curada de lo mejor del catálogo.",
          productHandles: [],
        },
      },
      {
        blockType: "benefits",
        settings: {
          title: "Comprá tranquilo",
          benefits: [
            { title: "Garantía oficial", description: "12 meses de garantía en todos los productos.", icon: "Shield" },
            { title: "Envío asegurado", description: "Todos los envíos con tracking y seguro.", icon: "Truck" },
            { title: "Soporte técnico", description: "Ayuda real por WhatsApp y email.", icon: "Headphones" },
          ],
        },
      },
      {
        blockType: "faq",
        settings: {
          title: "Preguntas frecuentes",
          questions: [
            { question: "¿Los productos son originales?", answer: "Sí. Trabajamos con importadores autorizados y distribuidores oficiales." },
            { question: "¿Cuánto tarda el envío?", answer: "CABA 24h, GBA 48h, interior 3–5 días hábiles. Todos con tracking." },
            { question: "¿Puedo devolver?", answer: "Sí. 30 días naturales desde la recepción para cambio o devolución." },
          ],
        },
      },
    ],
    footerNavigation: [
      {
        group: "footer_shop",
        items: [
          { label: "Catálogo", href: "/collections" },
          { label: "Ofertas", href: "/collections/ofertas" },
        ],
      },
      {
        group: "footer_support",
        items: [
          { label: "Garantía", href: "/pages/garantia" },
          { label: "Soporte", href: "/contact" },
        ],
      },
    ],
    version: 1,
  },

  // ───────────────────────────── 07 ────────────────────────────
  {
    id: "belleza-ritual",
    name: "Beauty Ritual",
    description:
      "Template cálido para marcas de cosmética y skincare. Tono editorial, paleta suave y secciones pensadas para contar historias.",
    industry: "Belleza y cosmética",
    themeStyle: "classic",
    branding: {
      primaryColor: "#4A3728",
      secondaryColor: "#F9F3ED",
      fontFamily: "Editorial Serif",
      tone: "Cálido, sensorial",
    },
    homeBlocks: [
      {
        blockType: "hero",
        settings: {
          headline: "Tu piel merece ingredientes reales.",
          subheadline:
            "Fórmulas limpias con activos naturales. Sin parabenos, sin siliconas, sin promesas vacías.",
          primaryActionLabel: "Ver productos",
          primaryActionLink: "",
          secondaryActionLabel: "Nuestra filosofía",
          backgroundImageUrl:
            "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=2000",
        },
      },
      {
        blockType: "featured_categories",
        settings: {
          title: "Líneas de productos",
          collectionHandles: [],
        },
      },
      {
        blockType: "featured_products",
        settings: {
          title: "Favoritos de la comunidad",
          subtitle: "Los productos con mejores reseñas y más recompras.",
          productHandles: [],
        },
      },
      {
        blockType: "benefits",
        settings: {
          title: "Nuestro compromiso",
          benefits: [
            { title: "Fórmulas limpias", description: "Sin ingredientes cuestionables. Lista completa en cada producto.", icon: "Leaf" },
            { title: "Cruelty free", description: "Ningún producto ni ingrediente testeado en animales.", icon: "Shield" },
            { title: "Packaging sustentable", description: "Envases reciclables y recargas disponibles.", icon: "RefreshCw" },
          ],
        },
      },
      {
        blockType: "testimonials",
        settings: {
          title: "Experiencias reales",
          testimonials: [
            { name: "Carolina G.", text: "Uso el sérum hace 3 meses. Mi dermatóloga notó la diferencia.", rating: 5 },
            { name: "Valentina P.", text: "Los aromas son divinos y la textura se absorbe al toque.", rating: 5 },
          ],
        },
      },
      {
        blockType: "newsletter",
        settings: {
          title: "Secretos de skincare",
          description: "Tips, lanzamientos y un 10% en tu primera compra.",
          buttonLabel: "Quiero saber más",
        },
      },
    ],
    footerNavigation: [
      {
        group: "footer_shop",
        items: [
          { label: "Todas las líneas", href: "/collections" },
          { label: "Kits y regalos", href: "/collections/kits" },
        ],
      },
      {
        group: "footer_support",
        items: [
          { label: "Ingredientes", href: "/pages/ingredientes" },
          { label: "Contacto", href: "/contact" },
        ],
      },
    ],
    version: 1,
  },

  // ───────────────────────────── 08 ────────────────────────────
  {
    id: "editorial-lifestyle",
    name: "Lifestyle Editorial",
    description:
      "Diseño contemplativo para marcas con historia. Espacios amplios, tipografía protagonista y secciones que priorizan narrativa.",
    industry: "Editorial · Lifestyle",
    themeStyle: "classic",
    branding: {
      primaryColor: "#2C2C2C",
      secondaryColor: "#FAFAF8",
      fontFamily: "Editorial Serif",
      tone: "Contemplativo, sofisticado",
    },
    homeBlocks: [
      {
        blockType: "hero",
        settings: {
          headline: "Menos es suficiente.",
          subheadline:
            "Objetos pensados para durar. Diseño funcional, materiales nobles, producción responsable.",
          primaryActionLabel: "Explorar",
          primaryActionLink: "",
          secondaryActionLabel: "La marca",
          backgroundImageUrl:
            "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=2000",
        },
      },
      {
        blockType: "featured_products",
        settings: {
          title: "Selección del editor",
          subtitle: "Piezas que definen la colección actual.",
          productHandles: [],
        },
      },
      {
        blockType: "benefits",
        settings: {
          title: "Principios",
          benefits: [
            { title: "Producción local", description: "Hecho en Argentina con materiales de origen trazable.", icon: "Leaf" },
            { title: "Diseño atemporal", description: "Piezas que no siguen tendencias — las trascienden.", icon: "Sparkles" },
            { title: "Garantía de por vida", description: "Reparamos o reemplazamos cualquier pieza, siempre.", icon: "Shield" },
          ],
        },
      },
      {
        blockType: "newsletter",
        settings: {
          title: "Diario de taller",
          description: "Procesos, materiales y reflexiones. Un envío al mes.",
          buttonLabel: "Suscribirme",
        },
      },
    ],
    footerNavigation: [
      {
        group: "footer_shop",
        items: [
          { label: "Colección", href: "/collections" },
          { label: "Archivo", href: "/collections/archivo" },
        ],
      },
      {
        group: "footer_support",
        items: [
          { label: "Manifiesto", href: "/pages/manifiesto" },
          { label: "Contacto", href: "/contact" },
        ],
      },
    ],
    version: 1,
  },
];

export function findTemplateById(id: string): StoreTemplate | null {
  return STORE_TEMPLATES.find((t) => t.id === id) ?? null;
}
