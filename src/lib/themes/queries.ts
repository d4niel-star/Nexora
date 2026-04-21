// ─── Store Template — current state queries ─────────────────────────────

import { prisma } from "@/lib/db/prisma";
import { findTemplateById, STORE_TEMPLATES } from "./templates";
import type { StoreTemplate } from "@/types/store-templates";

export interface CurrentThemeState {
  /** The StoreTheme.activeTheme string ("minimal" | "bold" | "classic")
   *  or null if no StoreTheme row exists yet. */
  themeStyle: string | null;
  /** If the most recently-applied template has an id that matches one
   *  in the built-in registry, we return its metadata so the UI can
   *  show "tema actual: Bold Commerce". Merchant-authored or AI blocks
   *  don't match anything — we just report themeStyle. */
  appliedTemplate: StoreTemplate | null;
  /** Primary/secondary branding snapshot, if set. */
  primaryColor: string | null;
  secondaryColor: string | null;
  fontFamily: string | null;
  /** Block summary: total count and a breakdown by `source`. Merchants
   *  see this to understand what a re-apply would and wouldn't touch. */
  blocks: {
    total: number;
    bySource: Record<string, number>;
  };
}

// SystemEvent metadata key we persist when applying a template so the
// "tema actual" chip can be derived without adding a DB column.
const TEMPLATE_APPLY_EVENT = "store_template_applied";

export async function getCurrentThemeState(storeId: string): Promise<CurrentThemeState> {
  const [theme, branding, blocks, lastApply] = await Promise.all([
    prisma.storeTheme.findUnique({
      where: { storeId },
      select: { activeTheme: true },
    }),
    prisma.storeBranding.findUnique({
      where: { storeId },
      select: { primaryColor: true, secondaryColor: true, fontFamily: true },
    }),
    prisma.storeBlock.findMany({
      where: { storeId, pageType: "home" },
      select: { source: true },
    }),
    prisma.systemEvent.findFirst({
      where: { storeId, eventType: TEMPLATE_APPLY_EVENT },
      orderBy: { createdAt: "desc" },
      select: { metadataJson: true },
    }),
  ]);

  const bySource: Record<string, number> = {};
  for (const b of blocks) {
    bySource[b.source] = (bySource[b.source] ?? 0) + 1;
  }

  let appliedTemplate: StoreTemplate | null = null;
  if (lastApply?.metadataJson) {
    try {
      const meta = JSON.parse(lastApply.metadataJson);
      if (typeof meta?.templateId === "string") {
        appliedTemplate = findTemplateById(meta.templateId);
      }
    } catch {
      appliedTemplate = null;
    }
  }

  return {
    themeStyle: theme?.activeTheme ?? null,
    appliedTemplate,
    primaryColor: branding?.primaryColor ?? null,
    secondaryColor: branding?.secondaryColor ?? null,
    fontFamily: branding?.fontFamily ?? null,
    blocks: {
      total: blocks.length,
      bySource,
    },
  };
}

export function listBuiltInTemplates(): ReadonlyArray<StoreTemplate> {
  return STORE_TEMPLATES;
}

export const TEMPLATE_APPLY_EVENT_TYPE = TEMPLATE_APPLY_EVENT;
