import { prisma } from "@/lib/db/prisma";
import { fetchSupplierProducts } from "@/lib/sourcing/import-parsers";
import { LEGACY_SEEDED_PROVIDER_CODES } from "@/lib/sourcing/constants";

interface SyncOptions {
  jobId: string;
  storeId: string;
  providerConnectionId: string;
}

interface ProviderConnectionConfig {
  sourceType?: "feed" | "api" | "csv";
  sourceUrl?: string | null;
}

function parseConnectionConfig(configJson: string | null): ProviderConnectionConfig {
  if (!configJson) return {};
  try {
    const parsed = JSON.parse(configJson) as ProviderConnectionConfig;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function runInventorySyncJob({ jobId, storeId, providerConnectionId }: SyncOptions) {
  await prisma.providerSyncJob.update({
    where: { id: jobId },
    data: { status: "running", startedAt: new Date() },
  });

  try {
    const connection = await prisma.providerConnection.findUnique({
      where: { id: providerConnectionId },
      include: {
        provider: true,
      },
    });

    if (!connection || connection.storeId !== storeId) {
      throw new Error("Conexion de proveedor invalida o fuera del tenant activo.");
    }
    if (LEGACY_SEEDED_PROVIDER_CODES.includes(connection.provider.code)) {
      throw new Error("Esta conexion pertenece a datos legacy y no puede sincronizarse como fuente real.");
    }

    const config = parseConnectionConfig(connection.configJson);
    if ((config.sourceType !== "feed" && config.sourceType !== "api") || !config.sourceUrl) {
      throw new Error("Esta conexion no tiene una fuente externa real configurada para sincronizar.");
    }

    const preview = await fetchSupplierProducts({
      sourceType: config.sourceType,
      url: config.sourceUrl,
    });

    if (preview.products.length === 0) {
      throw new Error(
        preview.errors[0]?.message || "La fuente respondio, pero no trajo productos validos para sincronizar.",
      );
    }

    let providerProductsChanged = 0;
    let mirrorsMarkedOutOfSync = 0;

    for (const product of preview.products) {
      const existing = await prisma.providerProduct.findUnique({
        where: {
          providerId_externalId: {
            providerId: connection.providerId,
            externalId: product.externalId,
          },
        },
      });

      const changed = Boolean(
        existing &&
          (existing.cost !== product.cost ||
            existing.stock !== product.stock ||
            existing.suggestedPrice !== product.suggestedPrice ||
            existing.title !== product.title),
      );

      const providerProduct = await prisma.providerProduct.upsert({
        where: {
          providerId_externalId: {
            providerId: connection.providerId,
            externalId: product.externalId,
          },
        },
        create: {
          providerId: connection.providerId,
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

      if (changed) {
        providerProductsChanged += 1;
        const updateResult = await prisma.catalogMirrorProduct.updateMany({
          where: {
            storeId,
            providerProductId: providerProduct.id,
          },
          data: {
            syncStatus: "out_of_sync",
          },
        });
        mirrorsMarkedOutOfSync += updateResult.count;
      }
    }

    await prisma.providerConnection.update({
      where: { id: connection.id },
      data: { lastSyncedAt: new Date(), status: "active" },
    });

    await prisma.providerSyncJob.update({
      where: { id: jobId },
      data: {
        status: "completed",
        completedAt: new Date(),
        resultJson: JSON.stringify({
          fetchedProducts: preview.products.length,
          providerProductsChanged,
          mirrorsMarkedOutOfSync,
        }),
      },
    });

    await prisma.systemEvent.create({
      data: {
        storeId,
        entityType: "provider_sync_job",
        entityId: jobId,
        eventType: "provider_sync_completed",
        source: "sourcing_worker",
        message: `Sync real finalizado desde ${connection.provider.name}.`,
        severity: "info",
        metadataJson: JSON.stringify({
          sourceType: config.sourceType,
          sourceUrl: config.sourceUrl,
          fetchedProducts: preview.products.length,
          providerProductsChanged,
          mirrorsMarkedOutOfSync,
        }),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido en sync de proveedor.";

    await prisma.providerSyncJob.update({
      where: { id: jobId },
      data: {
        status: "failed",
        failedAt: new Date(),
        lastError: message,
        retryCount: { increment: 1 },
      },
    });

    await prisma.systemEvent.create({
      data: {
        storeId,
        entityType: "provider_sync_job",
        entityId: jobId,
        eventType: "provider_sync_failed",
        source: "sourcing_worker",
        message: `Sync entrante fallo: ${message}`,
        severity: "error",
      },
    });
  }
}
