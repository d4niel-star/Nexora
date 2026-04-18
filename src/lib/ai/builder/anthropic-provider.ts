// ─── Anthropic Builder Provider ───
// Real implementation using Claude Sonnet 4 via @anthropic-ai/sdk.
// Drop-in replacement for MockBuilderProvider — zero changes to server actions,
// credit gating, or business logic required.
//
// Setup:
//   1. npm install @anthropic-ai/sdk
//   2. Set ANTHROPIC_API_KEY in .env.local
//   3. Set AI_PROVIDER_DEFAULT=anthropic in .env.local
//   4. In your app bootstrap (e.g. src/lib/ai/bootstrap.ts):
//      import { registerBuilderProvider } from "@/lib/ai/builder/provider";
//      import { AnthropicBuilderProvider } from "@/lib/ai/builder/anthropic-provider";
//      registerBuilderProvider(AnthropicBuilderProvider);

import Anthropic from "@anthropic-ai/sdk";
import type { AIBuilderProvider } from "./provider";
import type {
  StoreIdentityInput,
  StoreIdentitySuggestion,
  ProductSheetInput,
  ProductSheetSuggestion,
  MarketingCopyInput,
  MarketingCopySuggestion,
  MarketingCopyVariant,
} from "./types";

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 2048;

/**
 * Structured error thrown by the Anthropic provider. Maps upstream HTTP errors
 * to clear Spanish messages so the UI can surface actionable info to the owner
 * instead of a cryptic SDK error.
 */
export class AIBuilderError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "missing_api_key"
      | "unauthorized"
      | "rate_limited"
      | "provider_unavailable"
      | "invalid_response"
      | "unknown",
    public readonly retryable: boolean = false,
    public readonly httpStatus?: number,
  ) {
    super(message);
    this.name = "AIBuilderError";
  }
}

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AIBuilderError(
      "ANTHROPIC_API_KEY no está configurada. Agregala a .env.local y reiniciá el servidor.",
      "missing_api_key",
      false,
    );
  }
  return new Anthropic({ apiKey });
}

/** Maps any thrown error (SDK, network, generic) to a structured AIBuilderError. */
function normalizeError(err: unknown): AIBuilderError {
  if (err instanceof AIBuilderError) return err;

  // Anthropic SDK errors expose .status and .message
  const anyErr = err as { status?: number; message?: string; name?: string };
  const status = typeof anyErr?.status === "number" ? anyErr.status : undefined;
  const msg = anyErr?.message ?? "Error desconocido del proveedor de IA";

  if (status === 401 || status === 403) {
    return new AIBuilderError(
      "La API key de Anthropic es inválida o está revocada. Revisá ANTHROPIC_API_KEY en tu configuración.",
      "unauthorized",
      false,
      status,
    );
  }
  if (status === 429) {
    return new AIBuilderError(
      "Anthropic reporta límite de uso alcanzado. Esperá unos minutos y volvé a intentar.",
      "rate_limited",
      true,
      status,
    );
  }
  if (status && status >= 500) {
    return new AIBuilderError(
      "Anthropic no está disponible momentaneamente. Volvé a intentar en unos segundos.",
      "provider_unavailable",
      true,
      status,
    );
  }
  return new AIBuilderError(msg, "unknown", false, status);
}

function countTokensApprox(text: string): number {
  return Math.ceil(text.length / 4);
}

async function callClaude(
  client: Anthropic,
  systemPrompt: string,
  userPrompt: string,
): Promise<{ text: string; tokensUsed: number }> {
  let response: Anthropic.Messages.Message;
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
  } catch (err) {
    throw normalizeError(err);
  }

  const firstBlock = response.content[0];
  const text = firstBlock && firstBlock.type === "text" ? firstBlock.text : "";

  const tokensUsed =
    (response.usage?.input_tokens ?? countTokensApprox(systemPrompt + userPrompt)) +
    (response.usage?.output_tokens ?? countTokensApprox(text));

  return { text, tokensUsed };
}

function parseJSON<T>(raw: string, fallback: T): T {
  try {
    const clean = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    return JSON.parse(clean) as T;
  } catch {
    // The upstream caller receives the fallback and decides what to do.
    // We deliberately do not log the raw text to avoid leaking prompt content.
    return fallback;
  }
}

// ─── Capability 1: Store identity ───

async function suggestStoreIdentity(
  input: StoreIdentityInput
): Promise<StoreIdentitySuggestion> {
  const client = getClient();
  const locale = input.locale ?? "es-AR";

  const system = `Sos un experto en branding y marketing para e-commerce en ${locale}.
Tu tarea es generar identidad de marca para una tienda online a partir de una descripción libre.
Respondés ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin markdown extra.
Nunca inventés precios ni información de productos específicos.`;

  const user = `Descripción del negocio: "${input.description}"
${input.industryHint ? `Industria: ${input.industryHint}` : ""}

Generá un JSON con esta estructura exacta:
{
  "nameOptions": [
    { "name": string, "slug": string, "rationale": string },
    { "name": string, "slug": string, "rationale": string },
    { "name": string, "slug": string, "rationale": string }
  ],
  "storeDescription": string,
  "categories": [
    { "title": string, "handle": string, "description": string }
  ],
  "welcomeCopy": {
    "headline": string,
    "subheadline": string,
    "shortGreeting": string
  }
}

Reglas:
- nameOptions: exactamente 3 opciones creativas, memorables y apropiadas para ${locale}
- slug: url-safe, sin espacios, sin tildes, todo minúsculas
- storeDescription: párrafo profesional de 2-3 oraciones
- categories: entre 3 y 6 categorías relevantes al negocio
- welcomeCopy: tono cálido y directo en español rioplatense
- Todo el texto en español`;

  const { text, tokensUsed } = await callClaude(client, system, user);

  const parsed = parseJSON<Omit<StoreIdentitySuggestion, "tokensUsed">>(text, {
    nameOptions: [],
    storeDescription: "",
    categories: [],
    welcomeCopy: { headline: "", subheadline: "", shortGreeting: "" },
  });

  return { ...parsed, tokensUsed };
}

// ─── Capability 2: Product sheet ───

async function generateProductSheet(
  input: ProductSheetInput
): Promise<ProductSheetSuggestion> {
  const client = getClient();

  const system = `Sos un experto en copywriting para e-commerce en español rioplatense.
Generás fichas de producto persuasivas y optimizadas para SEO.
Respondés ÚNICAMENTE con un objeto JSON válido, sin texto adicional.
NUNCA incluís precios en tu respuesta. El campo "price" no existe en tu output.`;

  const user = `Producto: "${input.rawName}"
${input.industryHint ? `Industria: ${input.industryHint}` : ""}
${input.brandTone ? `Tono de marca: ${input.brandTone}` : ""}
${input.existingCategories?.length ? `Categorías existentes: ${input.existingCategories.join(", ")}` : ""}

Generá un JSON con esta estructura exacta:
{
  "seoTitle": string,
  "description": string,
  "categorySuggestion": string,
  "tags": string[]
}

Reglas:
- seoTitle: máximo 70 caracteres, incluí keyword principal
- description: 3 a 5 párrafos en markdown, persuasivo, sin inventar especificaciones técnicas que no conozcas
- categorySuggestion: elegí la mejor categoría de las existentes o proponé una nueva si no hay match
- tags: entre 5 y 10 tags de búsqueda relevantes, en minúsculas
- NUNCA incluyas precio ni campo "price"
- Todo el texto en español rioplatense`;

  const { text, tokensUsed } = await callClaude(client, system, user);

  const parsed = parseJSON<Omit<ProductSheetSuggestion, "tokensUsed">>(text, {
    seoTitle: input.rawName,
    description: "",
    categorySuggestion: "Destacados",
    tags: [],
  });

  // Guardrail: asegurar que no haya precio aunque el modelo lo invente
  const safe = { ...parsed } as Record<string, unknown>;
  delete safe["price"];

  return { ...(safe as Omit<ProductSheetSuggestion, "tokensUsed">), tokensUsed };
}

// ─── Capability 4: Marketing copy ───

async function generateMarketingCopy(
  input: MarketingCopyInput
): Promise<MarketingCopySuggestion> {
  const client = getClient();

  const channelInstructions: Record<string, string> = {
    social_instagram: "2 variantes para Instagram. Tono visual, emojis permitidos, máx 300 chars cada una. Incluí hashtags relevantes (5-6).",
    social_facebook: "2 variantes para Facebook. Tono más informativo, sin exceso de emojis, máx 400 chars cada una.",
    email_subject: "3 variantes de asunto de email. Máx 60 chars cada una. Sin emojis. Directo al punto.",
    email_body: "1 variante de cuerpo de email. Estructura: saludo, propuesta de valor, CTA. Tono profesional pero cercano.",
  };

  const system = `Sos un experto en marketing digital para e-commerce en español rioplatense.
Generás copy de marketing auténtico y efectivo.
Respondés ÚNICAMENTE con un objeto JSON válido, sin texto adicional.
Solo usás el precio si te lo proveen. Nunca inventás precios ni promociones.`;

  const user = `Producto: "${input.productTitle}"
${input.productDescription ? `Descripción: "${input.productDescription}"` : ""}
${input.productPrice !== undefined ? `Precio real: $${input.productPrice.toLocaleString("es-AR")}` : "Sin precio (no lo menciones)"}
${input.brandTone ? `Tono de marca: ${input.brandTone}` : ""}
${input.brandName ? `Nombre de marca: ${input.brandName}` : ""}
${input.offer ? `Promoción activa: ${input.offer}` : ""}
Canal: ${input.channel}
Instrucciones: ${channelInstructions[input.channel]}

Generá un JSON con esta estructura exacta:
{
  "variants": [
    {
      "channel": "${input.channel}",
      "text": string,
      "characterCount": number,
      "hashtags": string[] // solo para canales social_, omitir para email_
    }
  ]
}

Todo el texto en español rioplatense.`;

  const { text, tokensUsed } = await callClaude(client, system, user);

  const parsed = parseJSON<{ variants: Omit<MarketingCopyVariant, never>[] }>(
    text,
    { variants: [] }
  );

  // Recalcular characterCount real y asegurar channel correcto
  const variants: MarketingCopyVariant[] = parsed.variants.map((v) => ({
    ...v,
    channel: input.channel,
    characterCount: v.text?.length ?? 0,
  }));

  return { variants, tokensUsed };
}

// ─── Export ───

export const AnthropicBuilderProvider: AIBuilderProvider = {
  id: "anthropic",
  suggestStoreIdentity,
  generateProductSheet,
  generateMarketingCopy,
};
