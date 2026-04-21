// ─── Theme categories ───────────────────────────────────────────────────
//
// Maps the `industry` field on StoreTemplate to a display category. This
// gives the gallery a clean grouping mechanism without adding a new field
// to the template schema. Unknown industries fall back to "General".

import type { StoreTemplate } from "@/types/store-templates";

export interface ThemeCategory {
  /** Machine key, kebab-case. */
  id: string;
  /** Display label in the gallery. */
  label: string;
  /** Short description shown below the category header. */
  description: string;
}

export const THEME_CATEGORIES: readonly ThemeCategory[] = [
  {
    id: "moda",
    label: "Moda",
    description: "Diseños para indumentaria, calzado y accesorios.",
  },
  {
    id: "belleza",
    label: "Belleza y cuidado personal",
    description: "Estética editorial para marcas de skincare, cosmética y bienestar.",
  },
  {
    id: "tecnologia",
    label: "Tecnología",
    description: "Layouts orientados a electrónica, gadgets y accesorios tech.",
  },
  {
    id: "conversion",
    label: "Conversión y retail",
    description: "Estructuras optimizadas para ventas rápidas y alto volumen.",
  },
  {
    id: "minimal",
    label: "Minimal y generalista",
    description: "Bases neutras que funcionan para cualquier rubro.",
  },
  {
    id: "editorial",
    label: "Editorial y marca",
    description: "Narrativa de marca en primer plano. Ideal para lifestyle y branding.",
  },
];

/** Map industry strings to category IDs. */
const INDUSTRY_TO_CATEGORY: Record<string, string> = {
  "Uso general": "minimal",
  "Cualquier catálogo": "minimal",
  "Retail y consumo masivo": "conversion",
  "Cuidado personal · Belleza · Lifestyle": "belleza",
  "Indumentaria y Moda": "moda",
  "Moda y accesorios": "moda",
  "Electrónica y Tecnología": "tecnologia",
  "Tecnología y gadgets": "tecnologia",
  "Editorial · Lifestyle": "editorial",
  "Belleza y cosmética": "belleza",
};

export function getCategoryForTemplate(template: StoreTemplate): string {
  return INDUSTRY_TO_CATEGORY[template.industry] ?? "minimal";
}

export function getCategoryById(id: string): ThemeCategory | undefined {
  return THEME_CATEGORIES.find((c) => c.id === id);
}

/** Group templates by category, preserving category order. Returns only
 *  categories that have at least one template. */
export function groupTemplatesByCategory(
  templates: readonly StoreTemplate[],
): Array<{ category: ThemeCategory; templates: StoreTemplate[] }> {
  const map = new Map<string, StoreTemplate[]>();
  for (const tpl of templates) {
    const catId = getCategoryForTemplate(tpl);
    const bag = map.get(catId) ?? [];
    bag.push(tpl);
    map.set(catId, bag);
  }

  const result: Array<{ category: ThemeCategory; templates: StoreTemplate[] }> = [];
  for (const cat of THEME_CATEGORIES) {
    const items = map.get(cat.id);
    if (items && items.length > 0) {
      result.push({ category: cat, templates: items });
    }
  }
  return result;
}
