"use server";

// ─── AI Builder Server Actions ───
// Thin orchestration layer: auth → credit gate → provider call → refund on error.
// No data is persisted or applied without an explicit confirmation action from the merchant.

import { getDefaultStore } from "@/lib/store-engine/queries";
import { consumeCredits, refundCredits } from "@/lib/billing/service";
import { CREDIT_COSTS } from "@/lib/billing/plans";
import { prisma } from "@/lib/db/prisma";
import { logSystemEvent } from "@/lib/observability/audit";

import { getBuilderProvider, registerBuilderProvider } from "./provider";
import { MockBuilderProvider } from "./mock-provider";
import { analyzeCatalog } from "./catalog-analyzer";

import type {
  StoreIdentityInput,
  StoreIdentitySuggestion,
  ProductSheetInput,
  ProductSheetSuggestion,
  MarketingCopyInput,
  MarketingCopySuggestion,
  CatalogAnalysisReport,
} from "./types";

// Register the mock provider by default. Swap to a real provider without touching actions.
registerBuilderProvider(MockBuilderProvider);

// ─── Capability 1: Store identity suggestion ───

export async function suggestStoreIdentityAction(
  input: StoreIdentityInput
): Promise<StoreIdentitySuggestion> {
  const store = await getDefaultStore();
  if (!store) throw new Error("No se encontró tienda activa.");

  if (!input.description || input.description.trim().length < 20) {
    throw new Error("La descripción debe tener al menos 20 caracteres.");
  }

  const spent = await consumeCredits(store.id, "ai_store_identity");
  if (!spent.success) {
    throw new Error(spent.reason || "Créditos insuficientes.");
  }

  const provider = getBuilderProvider();
  try {
    const result = await provider.suggestStoreIdentity(input);
    await logSystemEvent({
      storeId: store.id,
      entityType: "ai_builder",
      eventType: "ai_store_identity_generated",
      severity: "info",
      source: "ai_builder",
      message: `Identidad de tienda generada (${result.nameOptions.length} opciones)`,
      metadata: { provider: provider.id, tokensUsed: result.tokensUsed },
    });
    return result;
  } catch (err: any) {
    await refundCredits(store.id, CREDIT_COSTS.ai_store_identity, "ai_store_identity_failed");
    throw new Error("Fallo la generación. Créditos reembolsados. " + err.message);
  }
}

// ─── Capability 2: Product sheet generation ───

export async function generateProductSheetAction(
  input: ProductSheetInput
): Promise<ProductSheetSuggestion> {
  const store = await getDefaultStore();
  if (!store) throw new Error("No se encontró tienda activa.");

  if (!input.rawName || input.rawName.trim().length < 3) {
    throw new Error("El nombre del producto debe tener al menos 3 caracteres.");
  }

  const spent = await consumeCredits(store.id, "ai_product_sheet");
  if (!spent.success) throw new Error(spent.reason || "Créditos insuficientes.");

  // Enrich input with store context (categories + branding tone)
  let existingCategories: string[] | undefined;
  let brandTone: string | undefined;
  try {
    const collections = await prisma.collection.findMany({
      where: { storeId: store.id },
      select: { title: true },
      take: 20,
    });
    existingCategories = collections.map((c) => c.title);
    const branding = await prisma.storeBranding.findUnique({ where: { storeId: store.id } });
    brandTone = branding?.tone ?? undefined;
  } catch {
    // non-fatal — continue without context
  }

  const provider = getBuilderProvider();
  try {
    const result = await provider.generateProductSheet({
      ...input,
      existingCategories: input.existingCategories ?? existingCategories,
      brandTone: input.brandTone ?? brandTone,
    });
    return result;
  } catch (err: any) {
    await refundCredits(store.id, CREDIT_COSTS.ai_product_sheet, "ai_product_sheet_failed");
    throw new Error("Fallo la generación. Créditos reembolsados. " + err.message);
  }
}

// ─── Capability 3: Catalog analysis (deterministic, no AI) ───

export async function analyzeCatalogAction(): Promise<CatalogAnalysisReport> {
  const store = await getDefaultStore();
  if (!store) throw new Error("No se encontró tienda activa.");
  // No credit gate: this is deterministic analysis of real data, not AI.
  return analyzeCatalog(store.id);
}

// ─── Capability 4: Marketing copy generation ───

export async function generateMarketingCopyAction(
  input: MarketingCopyInput
): Promise<MarketingCopySuggestion> {
  const store = await getDefaultStore();
  if (!store) throw new Error("No se encontró tienda activa.");

  if (!input.productTitle || input.productTitle.trim().length < 2) {
    throw new Error("El título del producto es obligatorio.");
  }

  const spent = await consumeCredits(store.id, "ai_marketing_copy");
  if (!spent.success) throw new Error(spent.reason || "Créditos insuficientes.");

  // Enrich with brand context when caller did not provide it
  let brandTone = input.brandTone;
  let brandName = input.brandName;
  if (!brandTone || !brandName) {
    try {
      const branding = await prisma.storeBranding.findUnique({ where: { storeId: store.id } });
      brandTone = brandTone ?? branding?.tone ?? undefined;
      brandName = brandName ?? store.name;
    } catch {
      // non-fatal
    }
  }

  const provider = getBuilderProvider();
  try {
    const result = await provider.generateMarketingCopy({
      ...input,
      brandTone,
      brandName,
    });
    return result;
  } catch (err: any) {
    await refundCredits(store.id, CREDIT_COSTS.ai_marketing_copy, "ai_marketing_copy_failed");
    throw new Error("Fallo la generación. Créditos reembolsados. " + err.message);
  }
}

// ─── Confirmation-aware apply actions ───
// These actions PERSIST AI-suggested data to the store. They require explicit
// merchant confirmation (caller must pass a committed suggestion object).
// No "auto-apply" path exists.

export async function applyProductSheetToProductAction(
  productId: string,
  sheet: { seoTitle: string; description: string; tags: string[] }
): Promise<{ success: true }> {
  const store = await getDefaultStore();
  if (!store) throw new Error("No se encontró tienda activa.");

  // Guard: product belongs to this store
  const product = await prisma.product.findFirst({
    where: { id: productId, storeId: store.id },
    select: { id: true },
  });
  if (!product) throw new Error("Producto no encontrado en esta tienda.");

  await prisma.product.update({
    where: { id: productId },
    data: {
      title: sheet.seoTitle,
      description: sheet.description,
      // NOTE: we do NOT touch price. Merchant must set price manually.
    },
  });

  await logSystemEvent({
    storeId: store.id,
    entityType: "product",
    entityId: productId,
    eventType: "ai_product_sheet_applied",
    severity: "info",
    source: "ai_builder",
    message: `Ficha IA aplicada al producto (tags: ${sheet.tags.join(", ")})`,
  });

  return { success: true };
}
