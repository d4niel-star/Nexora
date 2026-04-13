"use server";

import { prisma } from "@/lib/db/prisma";
import { getDefaultStore } from "@/lib/store-engine/queries";
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

// MOCK: simulate fetching products from a provider
export async function getMockProviderExternalProductsAction(providerId: string) {
  // In a real scenario, this would call provider.fetchProducts()
  return [
    {
      externalId: "ext-1001",
      title: "Auriculares Inalámbricos Premium Z9",
      description: "Auriculares con cancelación de ruido activa 40dB y 30hs de batería.",
      cost: 12000,
      suggestedPrice: 25000,
      stock: 45,
      category: "Electrónica",
      imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800"
    },
    {
      externalId: "ext-1002",
      title: "Reloj Inteligente Fit Tracker",
      description: "Monitoreo cardíaco, pasos, calorías y notificaciones.",
      cost: 8500,
      suggestedPrice: 19999,
      stock: 120,
      category: "Electrónica",
      imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800"
    },
    {
      externalId: "ext-1003",
      title: "Lámpara de Escritorio LED Minimalista",
      description: "Lámpara regulable, cuerpo de aluminio, diseño nórdico.",
      cost: 6000,
      suggestedPrice: 15499,
      stock: 30,
      category: "Hogar",
      imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&q=80&w=800"
    }
  ];
}

export async function importProductAction(connectionId: string, externalData: any) {
  const store = await getDefaultStore();
  if (!store) throw new Error("No active store");

  const connection = await prisma.providerConnection.findUnique({
    where: { id: connectionId, storeId: store.id },
    include: { provider: true }
  });
  if (!connection) throw new Error("Connection not found");

  // Create or Update ProviderProduct
  let providerProd = await prisma.providerProduct.findUnique({
    where: { providerId_externalId: { providerId: connection.providerId, externalId: externalData.externalId } }
  });

  if (!providerProd) {
    providerProd = await prisma.providerProduct.create({
      data: {
        providerId: connection.providerId,
        externalId: externalData.externalId,
        title: externalData.title,
        description: externalData.description,
        cost: externalData.cost,
        suggestedPrice: externalData.suggestedPrice || null,
        stock: externalData.stock,
        category: externalData.category,
        imagesJson: JSON.stringify([externalData.imageUrl]),
      }
    });
  }

  // Create CatalogMirrorProduct (if not exists)
  let mirror = await prisma.catalogMirrorProduct.findUnique({
    where: { storeId_providerProductId: { storeId: store.id, providerProductId: providerProd.id } }
  });

  if (mirror) {
    throw new Error("Producto ya importado.");
  }

  // 1. Create Internal Product
  const internalProduct = await prisma.product.create({
    data: {
      storeId: store.id,
      handle: `${providerProd.externalId}-${Date.now()}`,
      title: providerProd.title,
      description: providerProd.description,
      status: "draft", // Start as draft mirror
      category: providerProd.category,
      supplier: connection.provider.name,
      cost: providerProd.cost,
      price: providerProd.suggestedPrice || (providerProd.cost * 1.5), // Apply 50% margin if no suggested
      featuredImage: externalData.imageUrl,
    }
  });

  // 2. Create standard internal variant
  await prisma.productVariant.create({
    data: {
      productId: internalProduct.id,
      title: "Default Title",
      price: internalProduct.price,
      stock: providerProd.stock,
      sku: `PROV-${providerProd.externalId}`,
      isDefault: true
    }
  });

  // 3. Create Mirror linked to Internal Product
  mirror = await prisma.catalogMirrorProduct.create({
    data: {
      storeId: store.id,
      providerConnectionId: connection.id,
      providerProductId: providerProd.id,
      internalProductId: internalProduct.id,
      importStatus: "imported",
      marginRule: "suggested",
      finalPrice: internalProduct.price,
    }
  });

  // Log Observability
  await prisma.systemEvent.create({
    data: {
      storeId: store.id,
      entityType: "product",
      entityId: internalProduct.id,
      eventType: "product_imported",
      source: "sourcing_module",
      message: `Producto importado de ${connection.provider.name}`,
      metadataJson: JSON.stringify({ externalId: externalData.externalId }),
      severity: "info"
    }
  });

  revalidatePath("/admin/sourcing");
  return mirror;
}
