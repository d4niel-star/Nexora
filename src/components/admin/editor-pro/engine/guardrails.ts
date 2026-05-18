// ─── Visual Editor Pro — Guardrails ──────────────────────────────────────────
//
// Prevents merchants from creating broken layouts or inaccessible content.
// All validation is client-side and advisory (shows warnings, blocks dangerous saves).

export interface GuardrailResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

// ─── Text length limits ──────────────────────────────────────────────────────

const TEXT_LIMITS: Record<string, number> = {
  headline: 120,
  subheadline: 200,
  title: 80,
  subtitle: 160,
  description: 300,
  buttonLabel: 30,
  primaryActionLabel: 30,
  secondaryActionLabel: 30,
  question: 150,
  answer: 500,
  name: 60,
  text: 400,
};

// ─── Safe value ranges ───────────────────────────────────────────────────────

const SAFE_RANGES: Record<string, { min: number; max: number }> = {
  rating: { min: 1, max: 5 },
  sortOrder: { min: 0, max: 100 },
};

// ─── Validate block settings ─────────────────────────────────────────────────

export function validateBlockSettings(
  blockType: string,
  settings: Record<string, unknown>,
): GuardrailResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Text length validation
  for (const [key, value] of Object.entries(settings)) {
    if (typeof value === "string" && TEXT_LIMITS[key]) {
      if (value.length > TEXT_LIMITS[key]) {
        warnings.push(`"${key}" excede el límite de ${TEXT_LIMITS[key]} caracteres (tiene ${value.length}).`);
      }
    }
    if (typeof value === "number" && SAFE_RANGES[key]) {
      const range = SAFE_RANGES[key];
      if (value < range.min || value > range.max) {
        errors.push(`"${key}" debe estar entre ${range.min} y ${range.max}.`);
      }
    }
  }

  // Block-specific validation
  if (blockType === "hero") {
    if (!settings.headline || (settings.headline as string).trim().length === 0) {
      warnings.push("El hero necesita un titular para ser efectivo.");
    }
  }

  if (blockType === "benefits") {
    const benefits = settings.benefits;
    if (Array.isArray(benefits) && benefits.length > 8) {
      warnings.push("Más de 8 beneficios puede sobrecargar la sección.");
    }
  }

  if (blockType === "testimonials") {
    const items = settings.testimonials;
    if (Array.isArray(items)) {
      items.forEach((t: { rating?: number }, i) => {
        if (t.rating !== undefined && (t.rating < 1 || t.rating > 5)) {
          errors.push(`Testimonio ${i + 1}: rating inválido.`);
        }
      });
    }
  }

  if (blockType === "faq") {
    const questions = settings.questions;
    if (Array.isArray(questions) && questions.length > 20) {
      warnings.push("Más de 20 preguntas puede dificultar la navegación.");
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

// ─── URL sanitization ────────────────────────────────────────────────────────

export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  // Block javascript: and data: URIs
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return "";
  // Allow relative paths, absolute paths, and http(s)
  if (/^(https?:\/\/|\/|#)/.test(trimmed) || !trimmed.includes(":")) return trimmed;
  return "";
}

// ─── CSS injection prevention (for custom class fields) ──────────────────────

export function sanitizeClassName(input: string): string {
  // Only allow safe CSS class characters
  return input.replace(/[^a-zA-Z0-9\s_-]/g, "").trim();
}

// ─── Section count limits ────────────────────────────────────────────────────

export const MAX_SECTIONS = 12;

export function canAddSection(currentCount: number): boolean {
  return currentCount < MAX_SECTIONS;
}
