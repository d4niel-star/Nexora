// ─── AI Image Generator Service ──────────────────────────────────────────
// Generates hero/store images using Google Gemini Imagen 3 via @google/genai.
// Falls back gracefully to curated Unsplash images when generation is unavailable.
//
// Architecture:
//   1. Accept mood, category, style prompt in Spanish
//   2. Build an English image generation prompt optimized for Imagen 3
//   3. Call client.models.generateImages() → get PNG bytes
//   4. Persist to public/uploads/stores/[storeId]/hero/
//   5. Return local URL + source: "generated"
//
// Fallback:
//   If GEMINI_API_KEY is missing, rate limited, or generation fails:
//   → Return curated Unsplash image + source: "curated"
//   → Never lie about the source

import { GoogleGenAI } from "@google/genai";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";
import {
  HERO_IMAGE_LIBRARY,
  IMAGE_MOOD_MAP,
  IMAGE_CATEGORY_MAP,
  type HeroImageOption,
} from "@/lib/copilot/vocabulary";

// ─── Types ──────────────────────────────────────────────────────────────

export interface ImageGenerationRequest {
  mood: string;          // e.g. "premium", "luxury", "minimalista"
  category: string;      // e.g. "fashion", "beauty", "tech"
  styleHints: string[];  // e.g. ["beige", "negro", "elegante"]
  targetBlock: string;   // e.g. "hero"
  originalText: string;  // user's original request
}

export interface ImageGenerationResult {
  url: string;                // public URL of the image
  source: "generated" | "curated";
  alt: string;                // description of the image
  prompt?: string;            // the prompt used (only for generated)
  mood: string;
  category: string;
  error?: string;             // if fallback, what went wrong
}

// ─── Prompt builder ─────────────────────────────────────────────────────

const MOOD_PROMPTS: Record<string, string> = {
  premium: "luxury premium high-end sophisticated elegant",
  luxury: "ultra-luxury opulent refined exclusive high-fashion",
  comercial: "commercial modern clean professional polished",
  moderno: "modern contemporary sleek cutting-edge fresh",
  calido: "warm inviting cozy natural soft lighting golden hour",
  tecnico: "technical precise futuristic digital clean dark",
  minimalista: "minimalist clean simple uncluttered white space zen",
  sobrio: "understated sober muted tones refined subtle",
  oscuro: "dark moody dramatic noir shadowy cinematic",
  aspiracional: "aspirational dreamy ethereal breathtaking stunning",
  natural: "organic natural earthy rustic authentic botanical",
};

const CATEGORY_PROMPTS: Record<string, string> = {
  fashion: "fashion clothing apparel textiles garments runway",
  beauty: "beauty skincare cosmetics serums elegance self-care",
  tech: "technology software digital innovation gadgets circuit",
  food: "food gourmet cuisine culinary plating restaurant gastronomy",
  nature: "nature landscape outdoor scenic panoramic",
  lifestyle: "lifestyle aspirational living modern home",
  interior: "interior design architecture space decor home",
  corporate: "corporate office business professional workspace",
  hospitality: "hotel lobby hospitality travel luxury resort",
  minimal: "minimal abstract clean texture geometric",
  dark: "abstract dark gradient texture moody",
};

const STYLE_HINT_MAP: Record<string, string> = {
  beige: "beige cream warm tones",
  negro: "dark black deep shadows",
  oscuro: "dark moody low-key",
  claro: "bright light airy",
  dorado: "gold metallic accents",
  elegante: "elegant refined polished",
  aspiracional: "aspirational premium dreamy",
  editorial: "editorial magazine high-fashion",
  rustico: "rustic organic raw textured",
};

function buildImagePrompt(req: ImageGenerationRequest): string {
  const parts: string[] = [];

  // Base style from mood
  const moodStyle = MOOD_PROMPTS[req.mood] ?? MOOD_PROMPTS["premium"];
  parts.push(moodStyle);

  // Category context
  const catStyle = CATEGORY_PROMPTS[req.category] ?? "";
  if (catStyle) parts.push(catStyle);

  // Style hints from user text
  for (const hint of req.styleHints) {
    const mapped = STYLE_HINT_MAP[hint];
    if (mapped) parts.push(mapped);
  }

  // Compose final prompt — Imagen 3 works best with descriptive English prompts
  const stylePart = parts.join(", ");

  // Target-specific composition
  let composition = "";
  if (req.targetBlock === "hero" || req.targetBlock === "banner") {
    composition = "Wide panoramic banner format, suitable for website hero background. Centered composition with space for text overlay. High resolution, professional photography quality.";
  } else {
    composition = "Professional product photography, high resolution.";
  }

  return `${stylePart}. ${composition} Photorealistic, 4K quality, no text, no watermarks, no logos, no faces, no people looking at camera.`;
}

// ─── Image generation ───────────────────────────────────────────────────

async function getGenAIClient(): Promise<GoogleGenAI | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

async function generateWithImagen(
  client: GoogleGenAI,
  prompt: string,
): Promise<Buffer | null> {
  try {
    const response = await client.models.generateImages({
      model: "imagen-3.0-generate-002",
      prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: "16:9",
      },
    });

    // The SDK returns generatedImages array with inlineData
    const images = response.generatedImages;
    if (!images || images.length === 0) return null;

    const imageData = images[0].image?.imageBytes;
    if (!imageData) return null;

    return Buffer.from(imageData, "base64");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[image-generator] Imagen generation failed:", msg);
    return null;
  }
}

// ─── Persistence ────────────────────────────────────────────────────────

async function persistImage(
  imageBuffer: Buffer,
  storeId: string,
): Promise<string> {
  const storeDir = join(
    process.cwd(),
    "public",
    "uploads",
    "stores",
    storeId,
    "hero",
  );
  const fileName = `hero-${Date.now()}-${randomBytes(4).toString("hex")}.png`;
  const absolutePath = join(storeDir, fileName);

  await mkdir(storeDir, { recursive: true });
  await writeFile(absolutePath, imageBuffer);

  return `/uploads/stores/${storeId}/hero/${fileName}`;
}

// ─── Curated fallback ──────────────────────────────────────────────────

function pickCuratedImage(
  mood: string,
  category: string,
): HeroImageOption {
  let candidates = HERO_IMAGE_LIBRARY;

  // Filter by mood
  if (mood) {
    const moodMatches = candidates.filter((img) => img.mood === mood);
    if (moodMatches.length > 0) candidates = moodMatches;
  }

  // Filter by category
  if (category) {
    const catMatches = candidates.filter((img) => img.category === category);
    if (catMatches.length > 0) candidates = catMatches;
  }

  if (candidates.length === 0) candidates = HERO_IMAGE_LIBRARY;

  const randomIdx = Math.floor(Math.random() * candidates.length);
  return candidates[randomIdx];
}

// ─── Resolve mood/category from text ────────────────────────────────────

export function resolveImageParams(text: string): {
  mood: string;
  category: string;
  styleHints: string[];
} {
  const normalized = text.toLowerCase().trim();

  // Resolve mood
  let mood = "premium";
  const sortedMoods = Object.entries(IMAGE_MOOD_MAP).sort(
    (a, b) => b[0].length - a[0].length,
  );
  for (const [keyword, m] of sortedMoods) {
    if (normalized.includes(keyword)) {
      mood = m;
      break;
    }
  }

  // Resolve category
  let category = "lifestyle";
  const sortedCats = Object.entries(IMAGE_CATEGORY_MAP).sort(
    (a, b) => b[0].length - a[0].length,
  );
  for (const [keyword, c] of sortedCats) {
    if (normalized.includes(keyword)) {
      category = c;
      break;
    }
  }

  // Extract style hints
  const styleHints: string[] = [];
  const hintKeywords = [
    "beige", "negro", "oscuro", "claro", "dorado", "elegante",
    "aspiracional", "editorial", "rustico", "minimalista",
  ];
  for (const hint of hintKeywords) {
    if (normalized.includes(hint)) styleHints.push(hint);
  }

  return { mood, category, styleHints };
}

// ─── Main entry point ──────────────────────────────────────────────────

export async function generateOrSelectImage(
  req: ImageGenerationRequest,
  storeId: string | null,
): Promise<ImageGenerationResult> {
  const prompt = buildImagePrompt(req);

  // ── Path 1: Try real generation with Imagen 3 ──────────────────────
  const client = await getGenAIClient();

  if (client) {
    const imageBuffer = await generateWithImagen(client, prompt);

    if (imageBuffer && storeId) {
      try {
        const url = await persistImage(imageBuffer, storeId);
        return {
          url,
          source: "generated",
          alt: `Imagen generada con IA — ${req.mood} ${req.category}`,
          prompt,
          mood: req.mood,
          category: req.category,
        };
      } catch (err) {
        console.error("[image-generator] Persist failed:", err);
        // Fall through to curated fallback
      }
    } else if (imageBuffer && !storeId) {
      // No store ID — can't persist. Fall through to curated.
      console.warn("[image-generator] Image generated but no storeId for persistence");
    }
  }

  // ── Path 2: Curated fallback (honest) ──────────────────────────────
  const curated = pickCuratedImage(req.mood, req.category);

  const noKeyReason = !client
    ? "GEMINI_API_KEY no configurada"
    : undefined;
  const errorDetail = noKeyReason ?? "generación no disponible temporalmente";

  return {
    url: curated.url,
    source: "curated",
    alt: curated.alt,
    mood: curated.mood,
    category: curated.category,
    error: errorDetail,
  };
}