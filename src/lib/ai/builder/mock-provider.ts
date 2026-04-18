import type { AIBuilderProvider } from "./provider";
import type {
  StoreIdentityInput,
  StoreIdentitySuggestion,
  StoreNameOption,
  StoreCategorySuggestion,
  ProductSheetInput,
  ProductSheetSuggestion,
  MarketingCopyInput,
  MarketingCopySuggestion,
  MarketingCopyVariant,
  MarketingChannel,
} from "./types";

/**
 * MockBuilderProvider
 * Deterministic, high-quality outputs for development, demo, and preflight testing.
 * When a real provider (Anthropic, OpenAI) is wired, swap this registration and
 * NO business logic (server actions, credit gating, DB writes) needs to change.
 *
 * Guardrails enforced here:
 *  - Never returns invented prices in product sheets.
 *  - Never invents catalog data in marketing copy (only reformats what the caller passes).
 *  - All outputs are structured and typed.
 */

function toSlug(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function approxTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ─── Capability 1: Store identity ───

async function suggestStoreIdentity(input: StoreIdentityInput): Promise<StoreIdentitySuggestion> {
  await delay(900);

  const desc = input.description.trim();
  const industry = input.industryHint?.trim() || inferIndustry(desc);

  // Extract up to 3 "anchor" words from the description to seed name options.
  const words = desc
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const anchor = words[0] ?? "Marca";
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  const baseNames = [
    capitalize(anchor),
    `${capitalize(anchor)} Studio`,
    `Casa ${capitalize(anchor)}`,
  ];

  const nameOptions: StoreNameOption[] = baseNames.map((name, idx) => ({
    name,
    slug: toSlug(name),
    rationale: [
      "Nombre corto y memorable. Funciona bien como marca en redes y dominio.",
      "Agrega el sufijo 'Studio' para posicionamiento profesional y contemporáneo.",
      "Prefijo 'Casa' sugiere curaduría y atención al cliente personalizada.",
    ][idx],
  }));

  const storeDescription =
    `${capitalize(industry)} con foco en calidad y experiencia del cliente. ` +
    `Seleccionamos cada pieza para ofrecer productos confiables, con envíos a todo el país y atención personalizada. ` +
    `Nuestra propuesta está pensada para quienes valoran materiales, diseño y un proceso de compra simple.`;

  const categories: StoreCategorySuggestion[] = buildCategoriesFor(industry);

  const welcomeCopy = {
    headline: `Descubrí ${nameOptions[0].name}`,
    subheadline: `Una selección cuidada de ${industry.toLowerCase()} para vos.`,
    shortGreeting: `Bienvenido/a a ${nameOptions[0].name}. Recorré nuestra colección a tu ritmo.`,
  };

  const tokensUsed =
    approxTokens(desc) +
    approxTokens(storeDescription) +
    approxTokens(welcomeCopy.headline + welcomeCopy.subheadline + welcomeCopy.shortGreeting);

  return {
    nameOptions,
    storeDescription,
    categories,
    welcomeCopy,
    tokensUsed,
  };
}

function inferIndustry(desc: string): string {
  const lower = desc.toLowerCase();
  const map: { keys: string[]; label: string }[] = [
    { keys: ["ropa", "indumentaria", "moda", "remera", "pantalón", "vestido"], label: "Indumentaria" },
    { keys: ["cosmética", "belleza", "skincare", "maquillaje", "perfume"], label: "Cosmética y belleza" },
    { keys: ["tecnología", "gadget", "electrónica", "accesorio tech"], label: "Tecnología" },
    { keys: ["hogar", "decoración", "mueble", "deco"], label: "Hogar y deco" },
    { keys: ["libro", "editorial", "papelería"], label: "Libros y papelería" },
    { keys: ["café", "gastronomía", "alimento", "comida"], label: "Alimentos y bebidas" },
    { keys: ["salud", "wellness", "fitness", "deporte"], label: "Salud y bienestar" },
    { keys: ["niño", "bebé", "infantil"], label: "Infantil" },
  ];
  for (const m of map) if (m.keys.some((k) => lower.includes(k))) return m.label;
  return "Productos de marca";
}

function buildCategoriesFor(industry: string): StoreCategorySuggestion[] {
  const presets: Record<string, StoreCategorySuggestion[]> = {
    Indumentaria: [
      { title: "Novedades", handle: "novedades", description: "Las últimas incorporaciones de la temporada." },
      { title: "Más vendidos", handle: "mas-vendidos", description: "Los favoritos de nuestros clientes." },
      { title: "Básicos", handle: "basicos", description: "Prendas esenciales para armar tu guardarropa." },
      { title: "Accesorios", handle: "accesorios", description: "Complementos para completar tu look." },
    ],
    "Cosmética y belleza": [
      { title: "Skincare", handle: "skincare", description: "Rutinas para cada tipo de piel." },
      { title: "Maquillaje", handle: "maquillaje", description: "Productos que realzan tu belleza natural." },
      { title: "Fragancias", handle: "fragancias", description: "Perfumes seleccionados." },
      { title: "Novedades", handle: "novedades", description: "Últimos lanzamientos." },
    ],
  };
  return (
    presets[industry] ?? [
      { title: "Novedades", handle: "novedades", description: "Últimas incorporaciones al catálogo." },
      { title: "Más vendidos", handle: "mas-vendidos", description: "Los productos preferidos por nuestros clientes." },
      { title: "Destacados", handle: "destacados", description: "Selección editorial de la tienda." },
    ]
  );
}

// ─── Capability 2: Product sheet ───

async function generateProductSheet(input: ProductSheetInput): Promise<ProductSheetSuggestion> {
  await delay(700);

  const raw = input.rawName.trim();
  if (!raw) throw new Error("El nombre del producto no puede estar vacío.");

  const baseName = raw.replace(/\s+/g, " ").trim();
  // SEO title: capitalized + descriptor, capped at 70 chars
  const descriptor = input.industryHint ? ` — ${input.industryHint}` : "";
  let seoTitle = `${baseName}${descriptor}`;
  if (seoTitle.length > 70) seoTitle = seoTitle.slice(0, 67).trimEnd() + "...";

  const tone = input.brandTone?.trim() || "claro y directo";

  const description =
    `**${baseName}** pensado para quienes buscan calidad real y una experiencia de compra simple.\n\n` +
    `Este producto se diseñó cuidando cada detalle: materiales, terminaciones y presentación. ` +
    `Ideal para uso diario o como regalo.\n\n` +
    `**¿Por qué elegirlo?**\n` +
    `- Calidad verificada en cada unidad.\n` +
    `- Envíos a todo el país.\n` +
    `- Atención personalizada ante cualquier consulta.\n\n` +
    `_Completá la descripción con tus propios beneficios y especificaciones técnicas antes de publicar._ ` +
    `_Tono sugerido: ${tone}._`;

  // Category suggestion: try to match existing ones, else propose a generic one.
  let categorySuggestion = "Destacados";
  if (input.existingCategories && input.existingCategories.length > 0) {
    const lower = baseName.toLowerCase();
    const match = input.existingCategories.find((c) => lower.includes(c.toLowerCase()));
    categorySuggestion = match ?? input.existingCategories[0];
  }

  // Tags: deterministic extraction
  const words = baseName
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));
  const baseTags = Array.from(new Set(words)).slice(0, 6);
  const generic = ["nuevo", "destacado", "envío a todo el país"];
  const tags = Array.from(new Set([...baseTags, ...generic])).slice(0, 8);

  const tokensUsed = approxTokens(seoTitle + description + categorySuggestion + tags.join(" "));

  return {
    seoTitle,
    description,
    categorySuggestion,
    tags,
    tokensUsed,
    // NOTE: no price field. Merchant must set the price manually with real cost data.
  };
}

const STOPWORDS = new Set([
  "para",
  "con",
  "sin",
  "por",
  "del",
  "las",
  "los",
  "una",
  "uno",
  "que",
  "sobre",
  "entre",
  "hasta",
  "desde",
]);

// ─── Capability 4: Marketing copy ───

async function generateMarketingCopy(input: MarketingCopyInput): Promise<MarketingCopySuggestion> {
  await delay(600);

  const title = input.productTitle.trim();
  if (!title) throw new Error("El título del producto es obligatorio.");

  const tone = input.brandTone?.trim() || "cercano";
  const brand = input.brandName?.trim();
  const price = typeof input.productPrice === "number" ? input.productPrice : null;
  const offer = input.offer?.trim();

  const priceFragment = price !== null ? ` · $${price.toLocaleString("es-AR")}` : "";
  const offerFragment = offer ? ` ${offer}.` : "";
  const brandSignature = brand ? ` — ${brand}` : "";

  const variants: MarketingCopyVariant[] = [];

  switch (input.channel) {
    case "social_instagram":
      variants.push(
        makeSocial(
          `${title}${brandSignature}.\n\nPensado para el día a día${priceFragment}.${offerFragment}\n\n¿Lo querés? Dejanos un "mío" en comentarios.`,
          tone,
          baseHashtags(title, brand)
        ),
        makeSocial(
          `Nuevo en ${brand ?? "nuestra tienda"}: **${title}**.\n\nLo seleccionamos porque cumple lo que promete.${offerFragment} Link en bio.`,
          tone,
          baseHashtags(title, brand)
        )
      );
      break;
    case "social_facebook":
      variants.push(
        makeSocial(
          `${title}${priceFragment}.${offerFragment}\n\nEnvíos a todo el país. Consultanos por mensaje privado.`,
          tone,
          baseHashtags(title, brand)
        ),
        makeSocial(
          `Buscás ${title.toLowerCase()}?\n\nLo tenemos disponible${priceFragment}. Hacé click y conocé los detalles.`,
          tone,
          baseHashtags(title, brand)
        )
      );
      break;
    case "email_subject":
      variants.push(
        {
          channel: input.channel,
          text: `${title} — ya disponible${offer ? ` (${offer})` : ""}`,
          characterCount: title.length + (offer ? offer.length + 4 : 0) + 19,
        },
        {
          channel: input.channel,
          text: `Novedad: ${title}${brand ? ` en ${brand}` : ""}`,
          characterCount: title.length + (brand?.length ?? 0) + 12,
        },
        {
          channel: input.channel,
          text: offer ? `${offer} en ${title}` : `Conocé ${title}`,
          characterCount: (offer ? offer.length + 4 : 9) + title.length,
        }
      );
      break;
    case "email_body":
      variants.push({
        channel: input.channel,
        text:
          `Hola,\n\n` +
          `Queríamos contarte que **${title}** ya está disponible en ${brand ?? "nuestra tienda"}.${priceFragment}\n\n` +
          (offer ? `**${offer}**\n\n` : "") +
          `Si querés conocer más detalles, podés verlo haciendo click en el siguiente enlace.\n\n` +
          `Gracias por acompañarnos,\n${brand ?? "El equipo"}.`,
        characterCount: 0,
      });
      variants[variants.length - 1].characterCount = variants[variants.length - 1].text.length;
      break;
  }

  const tokensUsed = variants.reduce((acc, v) => acc + approxTokens(v.text), 0);

  return { variants, tokensUsed };
}

function makeSocial(text: string, _tone: string, hashtags: string[]): MarketingCopyVariant {
  return {
    channel: "social_instagram",
    text,
    characterCount: text.length,
    hashtags,
  };
}

function baseHashtags(title: string, brand?: string): string[] {
  const fromTitle = title
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w))
    .slice(0, 3)
    .map((w) => `#${w.replace(/[^a-z0-9]/g, "")}`)
    .filter((h) => h.length > 1);
  const generic = ["#nuevo", "#envioatodoelpais"];
  const brandTag = brand ? [`#${toSlug(brand).replace(/-/g, "")}`] : [];
  return Array.from(new Set([...brandTag, ...fromTitle, ...generic])).slice(0, 6);
}

// ─── Export ───

export const MockBuilderProvider: AIBuilderProvider = {
  id: "mock",
  suggestStoreIdentity,
  generateProductSheet,
  generateMarketingCopy,
};
