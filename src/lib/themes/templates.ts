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
      fontFamily: "Inter",
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
      fontFamily: "Inter",
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
];

export function findTemplateById(id: string): StoreTemplate | null {
  return STORE_TEMPLATES.find((t) => t.id === id) ?? null;
}
