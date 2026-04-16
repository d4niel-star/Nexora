"use server";

import { prisma } from "@/lib/db/prisma";
import { getDefaultStore } from "@/lib/store-engine/queries";
import { getAdminStoreId } from "@/lib/store-engine/actions";
import { revalidatePath } from "next/cache";
import { seedProviders } from "./seed";

export async function getProvidersAction() {
  await seedProviders();
  return prisma.sourcingProvider.findMany({
    orderBy: { name: "asc" }
  });
}

export async function getConnectedProvidersAction() {
  const store = await getDefaultStore();
  if (!store) throw new Error("No active store");

  return prisma.providerConnection.findMany({
    where: { storeId: store.id },
    include: { provider: true },
    orderBy: { createdAt: "desc" }
  });
}

export async function connectProviderAction(providerId: string) {
  const store = await getDefaultStore();
  if (!store) throw new Error("No active store");

  const existing = await prisma.providerConnection.findUnique({
    where: {
      storeId_providerId: {
        storeId: store.id,
        providerId
      }
    }
  });

  if (existing) {
    if (existing.status !== "active") {
      await prisma.providerConnection.update({
        where: { id: existing.id },
        data: { status: "active", updatedAt: new Date() }
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
      configJson: "{}"
    }
  });

  // Log observabilidad
  await prisma.systemEvent.create({
    data: {
      storeId: store.id,
      entityType: "sourcing",
      entityId: providerId,
      eventType: "provider_connected",
      source: "admin_panel",
      message: "Proveedor conectado exitosamente",
      severity: "info"
    }
  });

  revalidatePath("/admin/sourcing");
}

export async function disconnectProviderAction(providerConnectionId: string) {
  const store = await getDefaultStore();
  if (!store) throw new Error("No active store");

  await prisma.providerConnection.delete({
    where: { id: providerConnectionId, storeId: store.id }
  });

  revalidatePath("/admin/sourcing");
}

export async function getImportedProductsAction() {
  const store = await getDefaultStore();
  if (!store) throw new Error("No active store");

  return prisma.catalogMirrorProduct.findMany({
    where: { storeId: store.id },
    include: {
      providerProduct: true,
      internalProduct: true,
      providerConnection: {
        include: {
          provider: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function getProviderExternalProductsAction(providerId: string) {
  // We fetch standard seeded/synced ProviderProducts from the DB
  const rawProducts = await prisma.providerProduct.findMany({
    where: { providerId },
    orderBy: { createdAt: "desc" },
    take: 50 // Limit to first 50 for UI
  });

  // Map to the format the UI expects, parsing imagesJson
  return rawProducts.map(p => {
    let images = [];
    try { images = JSON.parse(p.imagesJson || "[]"); } catch (e) {}
    
    return {
      id: p.id,
      externalId: p.externalId,
      title: p.title,
      description: p.description,
      cost: p.cost,
      suggestedPrice: p.suggestedPrice || null,
      stock: p.stock,
      category: p.category,
      imageUrl: images[0] || null
    };
  });
}

export async function importProductAction(connectionId: string, providerProductId: string) {
  const storeId = await getAdminStoreId();
  if (!storeId) throw new Error("No active store session");

  const connection = await prisma.providerConnection.findUnique({
    where: { id: connectionId, storeId },
    include: { provider: true }
  });
  if (!connection) throw new Error("Provider connection not found or access denied");

  return await prisma.$transaction(async (tx) => {
    // 1. Validar existencia real del producto del proveedor en la DB local
    const providerProd = await tx.providerProduct.findUnique({
      where: { id: providerProductId }
    });

    if (!providerProd) {
       throw new Error("El producto del proveedor no existe de forma local.");
    }
    if (providerProd.providerId !== connection.providerId) {
       throw new Error("Violación de integridad: El producto no pertenece al proveedor de esta conexión.");
    }

    // 2. Check if already imported (Idempotencia Fuerte)
    let mirror = await tx.catalogMirrorProduct.findUnique({
      where: { storeId_providerProductId: { storeId, providerProductId: providerProd.id } }
    });

    if (mirror) {
      return { success: false, existing: true, message: "Este producto ya se encuentra en tu catálogo espejo." };
    }

    let images = [];
    try { images = JSON.parse(providerProd.imagesJson || "[]") } catch(e) {}
    const firstImage = images[0] || null;

    // 3. Create Internal Product
    const internalProduct = await tx.product.create({
      data: {
        storeId,
        handle: `${providerProd.externalId}-${Date.now()}`,
        title: providerProd.title,
        description: providerProd.description,
        status: "draft", // Start as draft so user can review before publishing
        category: providerProd.category,
        supplier: connection.provider.name,
        cost: providerProd.cost,
        price: providerProd.suggestedPrice || (providerProd.cost * 1.5), // Default 50% margin
        featuredImage: firstImage,
      }
    });

    // 4. Create standard internal variant
    const variantId = await tx.productVariant.create({
      data: {
        productId: internalProduct.id,
        title: "Default Title",
        price: internalProduct.price,
        stock: providerProd.stock,
        sku: `PROV-${providerProd.externalId}`,
        isDefault: true
      }
    });

    // 5. Create Mirror linked to Internal Product
    mirror = await tx.catalogMirrorProduct.create({
      data: {
        storeId,
        providerConnectionId: connection.id,
        providerProductId: providerProd.id,
        internalProductId: internalProduct.id,
        importStatus: "imported",
        marginRule: "suggested",
        finalPrice: internalProduct.price,
      }
    });
    
    // 6. Record StockMovement
    await tx.stockMovement.create({
      data: {
         storeId,
         productId: internalProduct.id,
         variantId: variantId.id,
         type: "initial_seed",
         quantityDelta: providerProd.stock,
         reason: "Importación inicial desde proveedor de sourcing"
      }
    });

    // 7. Log Observability
    await tx.systemEvent.create({
      data: {
        storeId,
        entityType: "product",
        entityId: internalProduct.id,
        eventType: "product_imported",
        source: "sourcing_module",
        message: `Producto importado de ${connection.provider.name}`,
        metadataJson: JSON.stringify({ externalId: providerProd.externalId, catalogMirrorId: mirror.id }),
        severity: "info"
      }
    });

    revalidatePath("/admin/sourcing");
    revalidatePath("/admin/catalog");
    revalidatePath("/admin/inventory");
    
    return { success: true, mirror };
  });
}
