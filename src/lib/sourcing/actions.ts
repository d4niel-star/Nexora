"use server";

import { prisma } from "@/lib/db/prisma";
import { getDefaultStore } from "@/lib/store-engine/queries";
import { getAdminStoreId } from "@/lib/store-engine/actions";
import { normalizeSlug } from "@/lib/store-engine/slug";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import {
  fetchSupplierProducts,
  parseSourcingCsv,
  type SourcingImportSource,
  type SupplierProductInput,
} from "./import-parsers";
import { resolveCatalogFromUrl } from "./catalog-resolver";
import { LEGACY_SEEDED_PROVIDER_CODES } from "./constants";

type ImportableSource = Extract<SourcingImportSource, "csv" | "feed" | "api">;

function parseImagesJson(imagesJson: string | null): string[] {
  try {
    const parsed = JSON.parse(imagesJson || "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function providerCodeForStore(storeId: string, sourceType: ImportableSource): string {
  return `store_${storeId}_${sourceType}_real_import`.replace(/[^a-zA-Z0-9_]/g, "_");
}

function sourceLabelFromUrl(sourceType: ImportableSource, sourceUrl?: string): string {
  if (!sourceUrl) return sourceType === "csv" ? "Import CSV manual" : "Fuente externa";
  try {
    const host = new URL(sourceUrl).host;
    return sourceType === "api" ? `API ${host}` : `Catálogo ${host}`;
  } catch {
    return sourceType === "api" ? "API proveedor" : "Catálogo proveedor";
  }
}

function categoriesFromProducts(products: SupplierProductInput[]): string | null {
  const categories = Array.from(
    new Set(products.map((product) => product.category).filter((category): category is string => Boolean(category))),
  );
  return categories.length > 0 ? categories.slice(0, 8).join(", ") : null;
}

async function getAvailableImportedProductHandle(
  tx: Prisma.TransactionClient,
  storeId: string,
  title: string,
  externalId: string,
): Promise<string> {
  const fallback = `proveedor-${externalId || Date.now().toString(36)}`;
  const base = (normalizeSlug(title) || normalizeSlug(fallback) || `producto-${Date.now().toString(36)}`).slice(0, 80);
  let handle = base;
  let suffix = 2;

  while (await tx.product.findUnique({ where: { storeId_handle: { storeId, handle } }, select: { id: true } })) {
    handle = `${base}-${suffix}`;
    suffix += 1;
  }

  return handle;
}

async function importParsedProductsForStore(input: {
  storeId: string;
  sourceType: ImportableSource;
  sourceLabel: string;
  sourceUrl?: string;
  products: SupplierProductInput[];
  selectedExternalIds: string[];
}) {
  const { checkFeatureAccess } = await import("@/lib/billing/service");
  const gate = await checkFeatureAccess(input.storeId, "sourcing_advanced");
  if (!gate.allowed) {
    throw new Error(gate.reason || "Tu plan no permite sourcing avanzado.");
  }

  const selectedSet = new Set(input.selectedExternalIds);
  const selectedProducts = input.products.filter((product) => selectedSet.has(product.externalId));
  const missingExternalIds = input.selectedExternalIds.filter(
    (externalId) => !input.products.some((product) => product.externalId === externalId),
  );

  if (selectedProducts.length === 0) {
    throw new Error("Selecciona al menos un producto valido para importar.");
  }

  if (missingExternalIds.length > 0) {
    throw new Error(`Hay productos seleccionados que ya no existen en la fuente: ${missingExternalIds.join(", ")}`);
  }

  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const provider = await tx.sourcingProvider.upsert({
      where: { code: providerCodeForStore(input.storeId, input.sourceType) },
      create: {
        code: providerCodeForStore(input.storeId, input.sourceType),
        name: input.sourceLabel,
        description: input.sourceUrl
          ? `Productos importados desde una fuente real: ${input.sourceUrl}`
          : "Productos importados desde un archivo CSV cargado por el dueno.",
        integrationType: input.sourceType,
        categories: categoriesFromProducts(input.products),
        status: "active",
      },
      update: {
        name: input.sourceLabel,
        description: input.sourceUrl
          ? `Productos importados desde una fuente real: ${input.sourceUrl}`
          : "Productos importados desde un archivo CSV cargado por el dueno.",
        integrationType: input.sourceType,
        categories: categoriesFromProducts(input.products),
        status: "active",
      },
    });

    const connection = await tx.providerConnection.upsert({
      where: {
        storeId_providerId: {
          storeId: input.storeId,
          providerId: provider.id,
        },
      },
      create: {
        storeId: input.storeId,
        providerId: provider.id,
        status: "active",
        configJson: JSON.stringify({
          sourceType: input.sourceType,
          sourceUrl: input.sourceUrl ?? null,
          lastRealImportAt: now.toISOString(),
        }),
        lastSyncedAt: input.sourceUrl ? now : null,
      },
      update: {
        status: "active",
        configJson: JSON.stringify({
          sourceType: input.sourceType,
          sourceUrl: input.sourceUrl ?? null,
          lastRealImportAt: now.toISOString(),
        }),
        lastSyncedAt: input.sourceUrl ? now : undefined,
      },
      include: { provider: true },
    });

    let importedCount = 0;
    let skippedExistingCount = 0;

    for (const product of selectedProducts) {
      const providerProduct = await tx.providerProduct.upsert({
        where: {
          providerId_externalId: {
            providerId: provider.id,
            externalId: product.externalId,
          },
        },
        create: {
          providerId: provider.id,
          externalId: product.externalId,
          title: product.title,
          description: product.description,
          imagesJson: JSON.stringify(product.imageUrls),
          category: product.category,
          cost: product.cost,
          suggestedPrice: product.suggestedPrice,
          stock: product.stock,
          leadTimeMinDays: product.leadTimeMinDays,
          leadTimeMaxDays: product.leadTimeMaxDays,
          variantsJson: JSON.stringify(product.variants),
          rawJson: JSON.stringify(product.raw),
        },
        update: {
          title: product.title,
          description: product.description,
          imagesJson: JSON.stringify(product.imageUrls),
          category: product.category,
          cost: product.cost,
          suggestedPrice: product.suggestedPrice,
          stock: product.stock,
          leadTimeMinDays: product.leadTimeMinDays,
          leadTimeMaxDays: product.leadTimeMaxDays,
          variantsJson: JSON.stringify(product.variants),
          rawJson: JSON.stringify(product.raw),
        },
      });

      const existingMirror = await tx.catalogMirrorProduct.findUnique({
        where: {
          storeId_providerProductId: {
            storeId: input.storeId,
            providerProductId: providerProduct.id,
          },
        },
      });

      if (existingMirror) {
        skippedExistingCount += 1;
        continue;
      }

      const defaultVariant = product.variants[0];
      const finalPrice = defaultVariant?.price ?? product.suggestedPrice ?? product.cost;
      const handle = await getAvailableImportedProductHandle(tx, input.storeId, product.title, product.externalId);

      const internalProduct = await tx.product.create({
        data: {
          storeId: input.storeId,
          handle,
          title: product.title,
          description: product.description,
          status: "draft",
          category: product.category,
          supplier: connection.provider.name,
          cost: product.cost,
          price: finalPrice,
          featuredImage: product.imageUrls[0] ?? null,
          isPublished: false,
          isFeatured: false,
        },
      });

      if (product.imageUrls.length > 0) {
        await tx.productImage.createMany({
          data: product.imageUrls.map((url, index) => ({
            productId: internalProduct.id,
            url,
            alt: product.title,
            sortOrder: index,
          })),
        });
      }

      const variantsToCreate = product.variants.length > 0
        ? product.variants
        : [{ title: "Default", sku: product.externalId, price: finalPrice, stock: product.stock }];

      for (const [index, variant] of variantsToCreate.entries()) {
        const createdVariant = await tx.productVariant.create({
          data: {
            productId: internalProduct.id,
            title: variant.title,
            price: variant.price,
            stock: variant.stock,
            sku: variant.sku,
            isDefault: index === 0,
          },
        });

        await tx.stockMovement.create({
          data: {
            storeId: input.storeId,
            productId: internalProduct.id,
            variantId: createdVariant.id,
            type: "sourcing_import",
            quantityDelta: variant.stock,
            reason: `Importacion real desde ${connection.provider.name}`,
            metadataJson: JSON.stringify({
              sourceType: input.sourceType,
              externalId: product.externalId,
              variantSku: variant.sku,
            }),
          },
        });
      }

      await tx.catalogMirrorProduct.create({
        data: {
          storeId: input.storeId,
          providerConnectionId: connection.id,
          providerProductId: providerProduct.id,
          internalProductId: internalProduct.id,
          importStatus: "imported",
          marginRule: product.suggestedPrice ? "supplier_suggested" : "cost_as_price",
          finalPrice,
          syncStatus: "in_sync",
        },
      });

      importedCount += 1;
    }

    const job = await tx.providerSyncJob.create({
      data: {
        storeId: input.storeId,
        providerConnectionId: connection.id,
        type: `${input.sourceType}_product_import`,
        status: "completed",
        startedAt: now,
        completedAt: new Date(),
        payloadJson: JSON.stringify({
          sourceType: input.sourceType,
          sourceUrl: input.sourceUrl ?? null,
          selectedProducts: selectedProducts.length,
          parsedProducts: input.products.length,
        }),
        resultJson: JSON.stringify({
          imported: importedCount,
          skippedExisting: skippedExistingCount,
        }),
      },
    });

    await tx.storeOnboarding.updateMany({
      where: { storeId: input.storeId },
      data: { hasImportedProduct: importedCount > 0 },
    });

    await tx.systemEvent.create({
      data: {
        storeId: input.storeId,
        entityType: "sourcing_import",
        entityId: job.id,
        eventType: "sourcing_products_imported",
        source: "sourcing_module",
        message: `Importacion real finalizada desde ${input.sourceLabel}`,
        metadataJson: JSON.stringify({
          sourceType: input.sourceType,
          imported: importedCount,
          skippedExisting: skippedExistingCount,
        }),
        severity: "info",
      },
    });

    return {
      providerName: connection.provider.name,
      importedCount,
      skippedExistingCount,
      jobId: job.id,
    };
  });

  revalidatePath("/admin/sourcing");
  revalidatePath("/admin/catalog");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/store");

  return { success: true, ...result };
}

export async function getProvidersAction() {
  return prisma.sourcingProvider.findMany({
    where: {
      code: { notIn: LEGACY_SEEDED_PROVIDER_CODES },
    },
    orderBy: { name: "asc" },
  });
}

export async function getConnectedProvidersAction() {
  const store = await getDefaultStore();
  if (!store) throw new Error("No active store");

  return prisma.providerConnection.findMany({
    where: {
      storeId: store.id,
      provider: { code: { notIn: LEGACY_SEEDED_PROVIDER_CODES } },
    },
    include: { provider: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function connectProviderAction(providerId: string) {
  const store = await getDefaultStore();
  if (!store) throw new Error("No active store");

  const { checkFeatureAccess } = await import("@/lib/billing/service");
  const gate = await checkFeatureAccess(store.id, "sourcing_advanced");
  if (!gate.allowed) {
    throw new Error(gate.reason || "Tu plan no permite sourcing avanzado.");
  }

  const provider = await prisma.sourcingProvider.findUnique({
    where: { id: providerId },
    select: { code: true },
  });
  if (!provider || LEGACY_SEEDED_PROVIDER_CODES.includes(provider.code)) {
    throw new Error("Este proveedor no pertenece a una fuente real disponible.");
  }

  const existing = await prisma.providerConnection.findUnique({
    where: {
      storeId_providerId: {
        storeId: store.id,
        providerId,
      },
    },
  });

  if (existing) {
    if (existing.status !== "active") {
      await prisma.providerConnection.update({
        where: { id: existing.id },
        data: { status: "active", updatedAt: new Date() },
      });
    }
    revalidatePath("/admin/sourcing");
    return;
  }

  await prisma.providerConnection.create({
    data: {
      storeId: store.id,
      providerId,
      status: "active",
      configJson: "{}",
    },
  });

  await prisma.systemEvent.create({
    data: {
      storeId: store.id,
      entityType: "sourcing",
      entityId: providerId,
      eventType: "provider_connected",
      source: "admin_panel",
      message: "Proveedor conectado exitosamente",
      severity: "info",
    },
  });

  revalidatePath("/admin/sourcing");
}

export async function disconnectProviderAction(providerConnectionId: string) {
  const store = await getDefaultStore();
  if (!store) throw new Error("No active store");

  // Clean up mirrors and sync jobs for this connection
  await prisma.$transaction(async (tx) => {
    await tx.catalogMirrorProduct.deleteMany({
      where: { storeId: store.id, providerConnectionId },
    });
    await tx.providerSyncJob.deleteMany({
      where: { storeId: store.id, providerConnectionId },
    });
    await tx.providerConnection.delete({
      where: { id: providerConnectionId, storeId: store.id },
    });
  });

  revalidatePath("/admin/sourcing");
  revalidatePath("/admin/catalog");
}

/**
 * Fully deletes a provider connection and all associated data:
 * - CatalogMirrorProduct records (does NOT delete the internal products)
 * - ProviderSyncJob records
 * - ProviderProduct records for this provider
 * - The ProviderConnection itself
 * - If no other store uses this provider, the SourcingProvider record too
 *
 * The internal products that were previously imported remain in the catalog
 * so the merchant doesn't lose inventory data.
 */
export async function deleteProviderAction(providerConnectionId: string) {
  const store = await getDefaultStore();
  if (!store) throw new Error("No active store");

  const connection = await prisma.providerConnection.findUnique({
    where: { id: providerConnectionId, storeId: store.id },
    include: { provider: true },
  });

  if (!connection) throw new Error("Conexión de proveedor no encontrada.");
  if (LEGACY_SEEDED_PROVIDER_CODES.includes(connection.provider.code)) {
    throw new Error("Este proveedor no se puede eliminar.");
  }

  await prisma.$transaction(async (tx) => {
    // 1. Delete mirrors
    await tx.catalogMirrorProduct.deleteMany({
      where: { storeId: store.id, providerConnectionId },
    });

    // 2. Delete sync jobs
    await tx.providerSyncJob.deleteMany({
      where: { storeId: store.id, providerConnectionId },
    });

    // 3. Delete the connection
    await tx.providerConnection.delete({
      where: { id: providerConnectionId },
    });

    // 4. Check if any other connection uses this provider
    const otherConnections = await tx.providerConnection.count({
      where: { providerId: connection.providerId },
    });

    if (otherConnections === 0) {
      // 5. Delete all provider products
      await tx.providerProduct.deleteMany({
        where: { providerId: connection.providerId },
      });

      // 6. Delete the provider itself
      await tx.sourcingProvider.delete({
        where: { id: connection.providerId },
      });
    }

    // 7. Log the event
    await tx.systemEvent.create({
      data: {
        storeId: store.id,
        entityType: "sourcing",
        entityId: connection.providerId,
        eventType: "provider_deleted",
        source: "admin_panel",
        message: `Proveedor eliminado: ${connection.provider.name}`,
        severity: "info",
      },
    });
  });

  revalidatePath("/admin/sourcing");
  revalidatePath("/admin/catalog");
}

export async function getImportedProductsAction() {
  const store = await getDefaultStore();
  if (!store) throw new Error("No active store");

  return prisma.catalogMirrorProduct.findMany({
    where: {
      storeId: store.id,
      providerConnection: {
        provider: { code: { notIn: LEGACY_SEEDED_PROVIDER_CODES } },
      },
    },
    include: {
      providerProduct: true,
      internalProduct: true,
      providerConnection: {
        include: {
          provider: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProviderExternalProductsAction(providerId: string) {
  const rawProducts = await prisma.providerProduct.findMany({
    where: {
      providerId,
      provider: { code: { notIn: LEGACY_SEEDED_PROVIDER_CODES } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return rawProducts.map((product) => {
    const images = parseImagesJson(product.imagesJson);

    return {
      id: product.id,
      externalId: product.externalId,
      title: product.title,
      description: product.description,
      cost: product.cost,
      suggestedPrice: product.suggestedPrice || null,
      stock: product.stock,
      category: product.category,
      imageUrl: images[0] || null,
    };
  });
}

export async function importProductAction(connectionId: string, providerProductId: string) {
  const storeId = await getAdminStoreId();
  if (!storeId) throw new Error("No active store session");

  const { checkFeatureAccess } = await import("@/lib/billing/service");
  const gate = await checkFeatureAccess(storeId, "sourcing_advanced");
  if (!gate.allowed) {
    throw new Error(gate.reason || "Tu plan no permite sourcing avanzado.");
  }

  const connection = await prisma.providerConnection.findUnique({
    where: { id: connectionId, storeId },
    include: { provider: true },
  });
  if (!connection) throw new Error("Provider connection not found or access denied");
  if (LEGACY_SEEDED_PROVIDER_CODES.includes(connection.provider.code)) {
    throw new Error("Este proveedor fue creado por datos legacy y no se puede importar como fuente real.");
  }

  return prisma.$transaction(async (tx) => {
    const providerProduct = await tx.providerProduct.findUnique({
      where: { id: providerProductId },
    });

    if (!providerProduct) {
      throw new Error("El producto del proveedor no existe de forma local.");
    }
    if (providerProduct.providerId !== connection.providerId) {
      throw new Error("El producto no pertenece al proveedor de esta conexion.");
    }

    let mirror = await tx.catalogMirrorProduct.findUnique({
      where: { storeId_providerProductId: { storeId, providerProductId: providerProduct.id } },
    });

    if (mirror) {
      return { success: false, existing: true, message: "Este producto ya se encuentra en tu catalogo espejo." };
    }

    const images = parseImagesJson(providerProduct.imagesJson);
    const firstImage = images[0] || null;
    const handle = await getAvailableImportedProductHandle(tx, storeId, providerProduct.title, providerProduct.externalId);
    const finalPrice = providerProduct.suggestedPrice ?? providerProduct.cost;

    const internalProduct = await tx.product.create({
      data: {
        storeId,
        handle,
        title: providerProduct.title,
        description: providerProduct.description,
        status: "draft",
        category: providerProduct.category,
        supplier: connection.provider.name,
        cost: providerProduct.cost,
        price: finalPrice,
        featuredImage: firstImage,
      },
    });

    const variant = await tx.productVariant.create({
      data: {
        productId: internalProduct.id,
        title: "Default",
        price: internalProduct.price,
        stock: providerProduct.stock,
        sku: `PROV-${providerProduct.externalId}`,
        isDefault: true,
      },
    });

    mirror = await tx.catalogMirrorProduct.create({
      data: {
        storeId,
        providerConnectionId: connection.id,
        providerProductId: providerProduct.id,
        internalProductId: internalProduct.id,
        importStatus: "imported",
        marginRule: providerProduct.suggestedPrice ? "supplier_suggested" : "cost_as_price",
        finalPrice: internalProduct.price,
      },
    });

    await tx.stockMovement.create({
      data: {
        storeId,
        productId: internalProduct.id,
        variantId: variant.id,
        type: "sourcing_import",
        quantityDelta: providerProduct.stock,
        reason: "Importacion real desde proveedor de sourcing",
      },
    });

    await tx.systemEvent.create({
      data: {
        storeId,
        entityType: "product",
        entityId: internalProduct.id,
        eventType: "product_imported",
        source: "sourcing_module",
        message: `Producto importado de ${connection.provider.name}`,
        metadataJson: JSON.stringify({ externalId: providerProduct.externalId, catalogMirrorId: mirror.id }),
        severity: "info",
      },
    });

    revalidatePath("/admin/sourcing");
    revalidatePath("/admin/catalog");
    revalidatePath("/admin/inventory");

    return { success: true, mirror };
  });
}

export async function previewCsvImportAction(csvText: string) {
  if (csvText.length > 1_000_000) {
    throw new Error("El CSV supera el tamano maximo permitido para preview.");
  }
  return parseSourcingCsv(csvText);
}

export async function importCsvProductsAction(csvText: string, selectedExternalIds: string[]) {
  const storeId = await getAdminStoreId();
  if (!storeId) throw new Error("No active store session");
  if (csvText.length > 1_000_000) {
    throw new Error("El CSV supera el tamano maximo permitido para importar.");
  }

  const preview = parseSourcingCsv(csvText);
  return importParsedProductsForStore({
    storeId,
    sourceType: "csv",
    sourceLabel: "Import CSV manual",
    products: preview.products,
    selectedExternalIds,
  });
}

// ─── URL catalog import is powered by the catalog-resolver ────────────
// It accepts generic store URLs (not only CSV/XML/JSON feeds) and tries
// multiple extractors in a budgeted pipeline. The raw SourcingImportPreview
// already carries detection metadata + diagnostics; the UI surfaces them.

export async function previewFeedImportAction(feedUrl: string) {
  const resolution = await resolveCatalogFromUrl({ url: feedUrl.trim() });
  return resolution.preview;
}

export async function importFeedProductsAction(feedUrl: string, selectedExternalIds: string[]) {
  const storeId = await getAdminStoreId();
  if (!storeId) throw new Error("No active store session");

  const sourceUrl = feedUrl.trim();
  const resolution = await resolveCatalogFromUrl({ url: sourceUrl });
  if (resolution.preview.products.length === 0) {
    const firstError = resolution.preview.errors[0]?.message;
    throw new Error(firstError || "No se pudo extraer un catálogo utilizable desde esta URL.");
  }

  return importParsedProductsForStore({
    storeId,
    sourceType: "feed",
    sourceLabel: sourceLabelFromUrl("feed", sourceUrl),
    sourceUrl,
    products: resolution.preview.products,
    selectedExternalIds,
  });
}

export async function previewApiImportAction(apiUrl: string, apiKey?: string) {
  return fetchSupplierProducts({
    sourceType: "api",
    url: apiUrl.trim(),
    apiKey: apiKey?.trim() || undefined,
  });
}

export async function importApiProductsAction(apiUrl: string, selectedExternalIds: string[], apiKey?: string) {
  const storeId = await getAdminStoreId();
  if (!storeId) throw new Error("No active store session");

  const sourceUrl = apiUrl.trim();
  const preview = await fetchSupplierProducts({
    sourceType: "api",
    url: sourceUrl,
    apiKey: apiKey?.trim() || undefined,
  });

  return importParsedProductsForStore({
    storeId,
    sourceType: "api",
    sourceLabel: sourceLabelFromUrl("api", sourceUrl),
    sourceUrl,
    products: preview.products,
    selectedExternalIds,
  });
}
