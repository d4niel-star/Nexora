// ─── Store Template runtime validation ──────────────────────────────────
//
// Pure, dependency-free schema check. Every field that gets persisted is
// verified against the exact shape the storefront renderer expects, so
// an imported template can never introduce a blockType we don't know how
// to render or a colour string that breaks CSS.
//
// We deliberately do NOT use a validator library for this: the checks
// are narrow, explicit, and the error messages need to point at the
// specific field that failed — which is easier to control by hand.
//
// Accepted block types are the exhaustive switch cases of
// StoreSectionRenderer. Keep these in sync if a new section lands.

import type {
  StoreTemplate,
  TemplateBlock,
  TemplateBranding,
  TemplateNavGroup,
  StoreTemplateExport,
} from "@/types/store-templates";

const ACCEPTED_BLOCK_TYPES = new Set([
  "hero",
  "benefits",
  "featured_products",
  "featured_categories",
  "testimonials",
  "faq",
  "newsletter",
]);

const ACCEPTED_THEME_STYLES = new Set(["minimal", "bold", "classic"]);

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export interface ValidationResult<T> {
  ok: boolean;
  value?: T;
  errors: string[];
}

function err(bag: string[], path: string, msg: string): void {
  bag.push(`${path}: ${msg}`);
}

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function isNonEmptyString(x: unknown): x is string {
  return typeof x === "string" && x.trim().length > 0;
}

function validateBranding(
  value: unknown,
  errors: string[],
  path: string,
): TemplateBranding | null {
  if (!isPlainObject(value)) {
    err(errors, path, "debe ser un objeto");
    return null;
  }
  const { primaryColor, secondaryColor, fontFamily, tone } = value as Record<string, unknown>;
  if (typeof primaryColor !== "string" || !HEX_COLOR.test(primaryColor)) {
    err(errors, `${path}.primaryColor`, "debe ser un hex #RRGGBB");
  }
  if (typeof secondaryColor !== "string" || !HEX_COLOR.test(secondaryColor)) {
    err(errors, `${path}.secondaryColor`, "debe ser un hex #RRGGBB");
  }
  if (!isNonEmptyString(fontFamily)) {
    err(errors, `${path}.fontFamily`, "requerido");
  }
  if (!isNonEmptyString(tone)) {
    err(errors, `${path}.tone`, "requerido");
  }
  if (errors.some((e) => e.startsWith(path))) return null;
  return {
    primaryColor: (primaryColor as string).toLowerCase(),
    secondaryColor: (secondaryColor as string).toLowerCase(),
    fontFamily: fontFamily as string,
    tone: tone as string,
  };
}

function validateBlock(
  value: unknown,
  errors: string[],
  path: string,
): TemplateBlock | null {
  if (!isPlainObject(value)) {
    err(errors, path, "debe ser un objeto");
    return null;
  }
  const { blockType, settings, isVisible } = value as Record<string, unknown>;
  if (typeof blockType !== "string" || !ACCEPTED_BLOCK_TYPES.has(blockType)) {
    err(
      errors,
      `${path}.blockType`,
      `valor no soportado (${typeof blockType === "string" ? `"${blockType}"` : typeof blockType}). Aceptados: ${[...ACCEPTED_BLOCK_TYPES].join(", ")}`,
    );
    return null;
  }
  if (!isPlainObject(settings)) {
    err(errors, `${path}.settings`, "debe ser un objeto");
    return null;
  }
  if (typeof isVisible !== "undefined" && typeof isVisible !== "boolean") {
    err(errors, `${path}.isVisible`, "debe ser boolean o estar ausente");
  }
  return {
    blockType: blockType as TemplateBlock["blockType"],
    settings: settings as Record<string, unknown>,
    isVisible: typeof isVisible === "boolean" ? isVisible : true,
  };
}

function validateNavGroup(
  value: unknown,
  errors: string[],
  path: string,
): TemplateNavGroup | null {
  if (!isPlainObject(value)) {
    err(errors, path, "debe ser un objeto");
    return null;
  }
  const { group, items } = value as Record<string, unknown>;
  if (!isNonEmptyString(group)) {
    err(errors, `${path}.group`, "requerido");
    return null;
  }
  if (!Array.isArray(items)) {
    err(errors, `${path}.items`, "debe ser un array");
    return null;
  }
  const outItems: Array<{ label: string; href: string }> = [];
  items.forEach((raw, idx) => {
    if (!isPlainObject(raw)) {
      err(errors, `${path}.items[${idx}]`, "debe ser un objeto");
      return;
    }
    const { label, href } = raw as Record<string, unknown>;
    if (!isNonEmptyString(label)) err(errors, `${path}.items[${idx}].label`, "requerido");
    if (!isNonEmptyString(href)) err(errors, `${path}.items[${idx}].href`, "requerido");
    if (isNonEmptyString(label) && isNonEmptyString(href)) {
      outItems.push({ label, href });
    }
  });
  return { group, items: outItems };
}

/** Validate a StoreTemplate payload. Returns a clean typed value when
 *  `ok` is true. On failure, `errors` enumerates every path that is
 *  wrong — we collect them all instead of short-circuiting to help the
 *  merchant fix the payload in one pass. */
export function validateStoreTemplate(input: unknown): ValidationResult<StoreTemplate> {
  const errors: string[] = [];

  if (!isPlainObject(input)) {
    return { ok: false, errors: ["root: debe ser un objeto JSON"] };
  }

  const {
    id,
    name,
    description,
    industry,
    themeStyle,
    branding,
    homeBlocks,
    footerNavigation,
    version,
  } = input as Record<string, unknown>;

  if (!isNonEmptyString(id)) err(errors, "id", "requerido");
  if (!isNonEmptyString(name)) err(errors, "name", "requerido");
  if (!isNonEmptyString(description)) err(errors, "description", "requerido");
  if (!isNonEmptyString(industry)) err(errors, "industry", "requerido");
  if (typeof themeStyle !== "string" || !ACCEPTED_THEME_STYLES.has(themeStyle)) {
    err(
      errors,
      "themeStyle",
      `valor no soportado. Aceptados: ${[...ACCEPTED_THEME_STYLES].join(", ")}`,
    );
  }
  if (version !== 1) {
    err(errors, "version", "sólo se acepta version=1 en esta release");
  }

  const brandingValue = validateBranding(branding, errors, "branding");

  if (!Array.isArray(homeBlocks) || homeBlocks.length === 0) {
    err(errors, "homeBlocks", "debe ser un array con al menos un bloque");
  }
  const blocksOut: TemplateBlock[] = [];
  if (Array.isArray(homeBlocks)) {
    homeBlocks.forEach((raw, idx) => {
      const parsed = validateBlock(raw, errors, `homeBlocks[${idx}]`);
      if (parsed) blocksOut.push(parsed);
    });
  }

  const navOut: TemplateNavGroup[] = [];
  if (typeof footerNavigation !== "undefined") {
    if (!Array.isArray(footerNavigation)) {
      err(errors, "footerNavigation", "si se envía, debe ser un array");
    } else {
      footerNavigation.forEach((raw, idx) => {
        const parsed = validateNavGroup(raw, errors, `footerNavigation[${idx}]`);
        if (parsed) navOut.push(parsed);
      });
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    errors: [],
    value: {
      id: id as string,
      name: name as string,
      description: description as string,
      industry: industry as string,
      themeStyle: themeStyle as StoreTemplate["themeStyle"],
      branding: brandingValue!,
      homeBlocks: blocksOut,
      footerNavigation: navOut.length > 0 ? navOut : undefined,
      version: 1,
    },
  };
}

/** Validate the export envelope (wraps a StoreTemplate). */
export function validateStoreTemplateExport(
  input: unknown,
): ValidationResult<StoreTemplateExport> {
  if (!isPlainObject(input)) {
    return { ok: false, errors: ["root: debe ser un objeto JSON"] };
  }
  const { kind, source } = input as Record<string, unknown>;
  if (kind !== "nexora.store-template") {
    return {
      ok: false,
      errors: [
        `kind: se esperaba "nexora.store-template" (obtenido ${JSON.stringify(kind)}). Sólo aceptamos templates exportados desde Nexora.`,
      ],
    };
  }
  const inner = validateStoreTemplate(source);
  if (!inner.ok) return { ok: false, errors: inner.errors };
  return {
    ok: true,
    errors: [],
    value: {
      kind: "nexora.store-template",
      exportedAt:
        typeof (input as Record<string, unknown>).exportedAt === "string"
          ? ((input as Record<string, unknown>).exportedAt as string)
          : new Date().toISOString(),
      source: inner.value!,
    },
  };
}

/** Safely parse a JSON string into either a bare template or an export
 *  envelope, returning a validated template either way. */
export function parseTemplatePayload(rawText: string): ValidationResult<StoreTemplate> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch (e) {
    return {
      ok: false,
      errors: [`JSON inválido: ${(e as Error).message}`],
    };
  }

  // If it looks like an export envelope, validate that shape first.
  if (isPlainObject(parsed) && (parsed as Record<string, unknown>).kind === "nexora.store-template") {
    const envelope = validateStoreTemplateExport(parsed);
    if (!envelope.ok) return { ok: false, errors: envelope.errors };
    return { ok: true, errors: [], value: envelope.value!.source };
  }

  return validateStoreTemplate(parsed);
}
