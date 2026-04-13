import { prisma } from "@/lib/db/prisma";
import { detectOutOfSyncListings } from "@/lib/channels/sync";

interface SyncOptions {
  jobId: string;
  storeId: string;
  providerConnectionId: string;
}

export async function runInventorySyncJob({ jobId, storeId, providerConnectionId }: SyncOptions) {
  await prisma.providerSyncJob.update({
    where: { id: jobId },
    data: { status: "running", startedAt: new Date() }
  });

  try {
    const connection = await prisma.providerConnection.findUnique({
      where: { id: providerConnectionId },
      include: { 
         provider: true,
         catalogMirrors: {
           include: {
              providerProduct: true,
              internalProduct: {
                 include: { variants: true }
              }
           }
         }
      }
    });

    if (!connection) throw new Error("Conexión de proveedor inválida");

    // MOCK PROVIDER BEHAVIOR: Simulate receiving a raw payload from provider.
    // In a real world, this would call HTTP GET to the supplier's external REST API.
    // We will simulate that one product dropped stock randomly and increased cost by 5%.
    
    let productsUpdatedCount = 0;

    for (const mirror of connection.catalogMirrors) {
      if (!mirror.internalProduct) continue;
      
      const rawProd = mirror.providerProduct;
      const internalProd = mirror.internalProduct;
      const primaryVariant = internalProd.variants[0];

      if (!primaryVariant) continue;

      // Simulate Supplier Diff
      const newSupplierStock = Math.max(0, rawProd.stock - Math.floor(Math.random() * 3));
      const newSupplierCost = typeof rawProd.cost === "number" ? rawProd.cost * 1.05 : 0; // 5% inflation simulation

      let hasDiff = false;
      const updateData: any = {};
      
      // Stock diff
      if (newSupplierStock !== rawProd.stock) {
        hasDiff = true;
        updateData.stock = newSupplierStock;
      }
      
      // Cost diff
      if (newSupplierCost !== rawProd.cost) {
        hasDiff = true;
        updateData.cost = newSupplierCost;
      }

      if (hasDiff) {
        // Update raw ProviderProduct
        await prisma.providerProduct.update({
          where: { id: rawProd.id },
          data: updateData
        });

        // RE-PRICING AND MARGIN RULE ENGINE
        // Standard implementation implies taking cost + marginRule
        let newFinalPrice = internalProd.price;
        if (updateData.cost !== undefined && mirror.marginRule) {
           const [type, val] = mirror.marginRule.split(":");
           const marginVal = parseFloat(val);
           if (type === "fixed_percent") {
              newFinalPrice = updateData.cost * (1 + (marginVal / 100));
           } else if (type === "fixed_amount") {
              newFinalPrice = updateData.cost + marginVal;
           }
        }

        // Apply diff to Mirror
        await prisma.catalogMirrorProduct.update({
          where: { id: mirror.id },
          data: {
             finalPrice: newFinalPrice,
             syncStatus: "in_sync",
             updatedAt: new Date()
          }
        });

        // Apply diff to Internal Catalog 
        // 🚨 IMPORTANT: This mutates the internal unified catalog automatically (stock and calculated price)
        await prisma.productVariant.update({
           where: { id: primaryVariant.id },
           data: { stock: updateData.stock !== undefined ? updateData.stock : primaryVariant.stock }
        });

        if (newFinalPrice !== internalProd.price) {
           await prisma.product.update({
              where: { id: internalProd.id },
              data: { price: newFinalPrice } // Reflect repricing immediately
           });
           await prisma.productVariant.update({
              where: { id: primaryVariant.id },
              data: { price: newFinalPrice } // Reflect repricing explicitly in default checkout variant
           });
        }
        
        productsUpdatedCount++;
      }
    }

    // Determine impact on channel listings.
    // If the internal price or stock changed, detectOutOfSyncListings will catch it and flag "out_of_sync".
    await detectOutOfSyncListings(storeId);

    // Finalize Job Correctly
    await prisma.providerSyncJob.update({
      where: { id: jobId },
      data: {
        status: "completed",
        completedAt: new Date(),
        resultJson: JSON.stringify({ updatedItems: productsUpdatedCount })
      }
    });

    // Audit Log
    await prisma.systemEvent.create({
      data: {
        storeId,
        entityType: "provider_sync_job",
        entityId: jobId,
        eventType: "provider_sync_completed",
        source: "sourcing_worker",
        message: `Sync entrante finalizado. ${productsUpdatedCount} item(s) de proveedor impactados.`,
        severity: "info",
      }
    });

  } catch (error: any) {
    await prisma.providerSyncJob.update({
      where: { id: jobId },
      data: {
        status: "failed",
        failedAt: new Date(),
        lastError: error.message,
        retryCount: { increment: 1 }
      }
    });

    await prisma.systemEvent.create({
      data: {
        storeId,
        entityType: "provider_sync_job",
        entityId: jobId,
        eventType: "provider_sync_failed",
        source: "sourcing_worker",
        message: `Sync entrante falló: ${error.message}`,
        severity: "error",
      }
    });
  }
}
