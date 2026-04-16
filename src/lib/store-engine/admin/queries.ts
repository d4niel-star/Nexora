import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";

/**
 * Fetches KPI metrics for the admin dashboard from the active store.
 */
export async function getDashboardMetrics() {
  const store = await getCurrentStore();

  if (!store) {
    return {
      storeName: "Sin tienda",
      storeSlug: "",
      totalRevenue: 0,
      totalOrders: 0,
      newOrders: 0,
      totalProducts: 0,
      publishedProducts: 0,
      totalCustomers: 0,
      pendingShipments: 0,
    };
  }

  // Aggregate orders
  const orderStats = await prisma.order.aggregate({
    where: { storeId: store.id },
    _sum: { total: true },
    _count: true,
  });

  const newOrders = await prisma.order.count({
    where: { storeId: store.id, status: "new" },
  });

  const pendingShipments = await prisma.order.count({
    where: {
      storeId: store.id,
      status: { in: ["new", "paid", "processing"] },
      paymentStatus: "pending",
    },
  });

  // Product counts
  const totalProducts = await prisma.product.count({
    where: { storeId: store.id },
  });

  const publishedProducts = await prisma.product.count({
    where: { storeId: store.id, isPublished: true },
  });

  // Unique customers (by email)
  const uniqueEmails = await prisma.order.findMany({
    where: { storeId: store.id },
    select: { email: true },
    distinct: ["email"],
  });

  return {
    storeName: store.name,
    storeSlug: store.slug,
    totalRevenue: orderStats._sum.total ?? 0,
    totalOrders: orderStats._count,
    newOrders,
    totalProducts,
    publishedProducts,
    totalCustomers: uniqueEmails.length,
    pendingShipments,
  };
}

/**
 * Fetches the active store info for the admin topbar.
 */
export async function getActiveStoreInfo() {
  const store = await getCurrentStore();

  return store ?? { id: "", name: "Sin tienda", slug: "" };
}
