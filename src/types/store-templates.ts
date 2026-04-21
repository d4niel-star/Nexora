// ─── Store Template types ───────────────────────────────────────────────
//
// A StoreTemplate in Nexora is NOT a skin or a captured screenshot. It is
// a typed, serialisable payload that describes — using exactly the same
// primitives the storefront already renders — the starting point a store
// should have:
//
//   · themeStyle           — maps 1:1 to the existing StoreTheme.activeTheme
//                            enum ("minimal" | "bold" | "classic").
//   · branding             — the exact columns of StoreBranding.
//   · homeBlocks           — an ordered list of block descriptors. Each
//                            entry matches the shape the existing
//                            StoreSectionRenderer can render (blockType +
//                            settings object). Unknown blockType values
//                            are rejected by the importer.
//   · footerNavigation     — optional groups seeded on StoreNavigation.
//
// Applying a template writes the same rows that a published store already
// persists. There is no parallel rendering path, no forked schema, no
// hidden engine. A merchant who applies a template can keep editing
// every piece of it from /admin/store?tab=... as always, because the
// result lives in StoreBlock / StoreBranding / StoreTheme.
//
// The `source` column on StoreBlock identifies template-origin blocks as
// "template" (distinct from "ai" and "manual"), so re-applying a
// template can safely replace its own blocks without touching blocks the
// merchant authored manually.

import type { BlockType } from "./store-engine";

export type ThemeStyleKey = "minimal" | "bold" | "classic";

export interface TemplateBranding {
  /** 6- or 7-char hex. Accepts "#RRGGBB" only. */
  primaryColor: string;
  secondaryColor: string;
  /** Font family name available in the storefront stack. */
  fontFamily: string;
  /** Free-form copy tone hint. Stored on StoreBranding.tone. */
  tone: string;
}

export interface TemplateBlock {
  /** Must be one of the BlockType values the StoreSectionRenderer knows
   *  how to render. The importer rejects any other value. */
  blockType: BlockType;
  /** Opaque settings object. Validated field-by-field per blockType via
   *  the existing validateBlockSettings helper before persistence. */
  settings: Record<string, unknown>;
  isVisible?: boolean;
}

export interface TemplateNavItem {
  label: string;
  href: string;
}

export interface TemplateNavGroup {
  /** Group key used on StoreNavigation.group. Typical values: "header",
   *  "footer_shop", "footer_support". */
  group: string;
  items: TemplateNavItem[];
}

export interface StoreTemplate {
  /** Machine id — stable, lowercase, kebab-case. Used as the audit
   *  pointer for "which template is currently applied". */
  id: string;
  /** Human-readable name shown in the gallery. */
  name: string;
  /** One-sentence description of the commercial intent. */
  description: string;
  /** Industry hint — shown as a chip on the gallery card. Not used for
   *  logic; purely a scanning aid for the merchant. */
  industry: string;
  /** Visual direction hint, 1:1 with StoreTheme.activeTheme. */
  themeStyle: ThemeStyleKey;
  branding: TemplateBranding;
  /** Ordered, sortOrder is derived from array position. */
  homeBlocks: TemplateBlock[];
  footerNavigation?: TemplateNavGroup[];
  /** Bumped when the template payload changes in a breaking way. The
   *  importer refuses unknown versions. */
  version: 1;
}

/** Export envelope: what exportStoreTemplate returns and what
 *  importStoreTemplate accepts. Keeps a tiny bit of metadata so the
 *  merchant knows what they exported. */
export interface StoreTemplateExport {
  kind: "nexora.store-template";
  exportedAt: string;
  source: StoreTemplate;
}
