// ─── Section Library — available sections to add ─────────────────────────────

import type { LucideIcon } from "lucide-react";
import {
  Image,
  ShoppingBag,
  Grid3X3,
  Award,
  MessageCircle,
  HelpCircle,
  Mail,
} from "lucide-react";

export interface SectionDefinition {
  blockType: string;
  label: string;
  description: string;
  icon: LucideIcon;
  defaultSettings: Record<string, unknown>;
}

export const SECTION_LIBRARY: SectionDefinition[] = [
  {
    blockType: "hero",
    label: "Hero",
    description: "Sección principal con imagen, titular y CTA.",
    icon: Image,
    defaultSettings: {
      headline: "Tu titular aquí",
      subheadline: "Texto de apoyo para tu hero section.",
      primaryActionLabel: "Ver productos",
      primaryActionLink: "products",
      secondaryActionLabel: "",
      secondaryActionLink: "",
      backgroundImageUrl: "",
      layout: "default",
    },
  },
  {
    blockType: "featured_products",
    label: "Productos destacados",
    description: "Grid de productos seleccionados o recientes.",
    icon: ShoppingBag,
    defaultSettings: {
      title: "Productos destacados",
      subtitle: "",
      productHandles: [],
    },
  },
  {
    blockType: "featured_categories",
    label: "Categorías",
    description: "Cards de colecciones con imagen y título.",
    icon: Grid3X3,
    defaultSettings: {
      title: "Categorías",
      collectionHandles: [],
    },
  },
  {
    blockType: "benefits",
    label: "Beneficios",
    description: "Grid de beneficios con iconos.",
    icon: Award,
    defaultSettings: {
      title: "¿Por qué elegirnos?",
      subtitle: "",
      benefits: [
        { title: "Envío rápido", description: "Entrega en 24-48hs.", icon: "Truck" },
        { title: "Calidad premium", description: "Materiales de primera.", icon: "ShieldCheck" },
        { title: "Garantía", description: "30 días de devolución.", icon: "PackageCheck" },
      ],
    },
  },
  {
    blockType: "testimonials",
    label: "Testimonios",
    description: "Opiniones de clientes con rating.",
    icon: MessageCircle,
    defaultSettings: {
      title: "Lo que dicen nuestros clientes",
      subtitle: "",
      testimonials: [],
    },
  },
  {
    blockType: "faq",
    label: "Preguntas frecuentes",
    description: "Acordeón de preguntas y respuestas.",
    icon: HelpCircle,
    defaultSettings: {
      title: "Preguntas frecuentes",
      questions: [],
    },
  },
  {
    blockType: "newsletter",
    label: "Newsletter",
    description: "Formulario de suscripción por email.",
    icon: Mail,
    defaultSettings: {
      title: "Mantente al día",
      description: "Suscribite para recibir novedades y ofertas.",
      buttonLabel: "Suscribirse",
    },
  },
];

export function findSectionDef(blockType: string): SectionDefinition | undefined {
  return SECTION_LIBRARY.find((s) => s.blockType === blockType);
}
