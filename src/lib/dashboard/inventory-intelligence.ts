import { prisma } from "@/lib/db/prisma";

// ─── Inventory Intelligence ───────────────────────────────────────────
// Heuristic-based inventory health analysis. No AI — just math.

export interface InventoryItem {
  id: string;
  title: string;
  stock: number;
  avgDailySales: number;
  daysRemaining: number | null;
  risk: "critical" | "warning" | "healthy";
}

export interface InventoryIntelligence {
  totalSKUs: number;
  outOfStock: number;
  criticalStock: number; // <7 days remaining
  warningStock: number; // 7-21 days remaining
  healthyStock: number;
  topMovers: InventoryItem[];
  deadInventory: InventoryItem[]; // No sales in 30d, stock > 0
  replenishmentNeeded: InventoryItem[]; // Critical items
}

export async function getInventoryIntelligence(storeId: string): Promise<InventoryIntelligence> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  // Get all products with stock info via variants
  const products = await prisma.product.findMany({
    where: { storeId, status: "published" },
    select: {
      id: true,
      title: true,
      variants: { select: { stock: true } },
    },
  });

  // Get sales per product in last 30 days
  const recentItems = await prisma.orderItem.findMany({
    where: {
      order: {
        storeId,
        status: { in: ["paid", "shipped", "delivered", "completed"] },
        createdAt: { gte: thirtyDaysAgo },
      },
      productId: { not: null },
    },
    select: { productId: true, quantity: true },
  });

  // Aggregate sales by product
  const salesMap = new Map<string, number>();
  for (const item of recentItems) {
    if (!item.productId) continue;
    salesMap.set(item.productId, (salesMap.get(item.productId) || 0) + item.quantity);
  }

  // Analyze each product
  const analyzed: InventoryItem[] = products.map((p) => {
    const stock = p.variants.reduce((sum, v) => sum + v.stock, 0);
    const totalSold = salesMap.get(p.id) || 0;
    const avgDailySales = totalSold / 30;
    const daysRemaining = avgDailySales > 0 ? Math.floor(stock / avgDailySales) : (stock > 0 ? null : 0);

    let risk: "critical" | "warning" | "healthy" = "healthy";
    if (stock === 0) {
      risk = "critical";
    } else if (daysRemaining !== null && daysRemaining < 7) {
      risk = "critical";
    } else if (daysRemaining !== null && daysRemaining < 21) {
      risk = "warning";
    }

    return {
      id: p.id,
      title: p.title,
      stock,
      avgDailySales: Math.round(avgDailySales * 10) / 10,
      daysRemaining,
      risk,
    };
  });

  const outOfStock = analyzed.filter((i) => i.stock === 0).length;
  const criticalStock = analyzed.filter((i) => i.risk === "critical" && i.stock > 0).length;
  const warningStock = analyzed.filter((i) => i.risk === "warning").length;
  const healthyStock = analyzed.filter((i) => i.risk === "healthy").length;

  // Top movers: highest avg daily sales with stock > 0
  const topMovers = analyzed
    .filter((i) => i.avgDailySales > 0 && i.stock > 0)
    .sort((a, b) => b.avgDailySales - a.avgDailySales)
    .slice(0, 5);

  // Dead inventory: has stock but zero sales in 30d
  const deadInventory = analyzed
    .filter((i) => i.stock > 0 && i.avgDailySales === 0)
    .sort((a, b) => b.stock - a.stock)
    .slice(0, 5);

  // Replenishment needed: critical items with sales velocity
  const replenishmentNeeded = analyzed
    .filter((i) => i.risk === "critical" && i.avgDailySales > 0)
    .sort((a, b) => (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0))
    .slice(0, 5);

  return {
    totalSKUs: products.length,
    outOfStock,
    criticalStock,
    warningStock,
    healthyStock,
    topMovers,
    deadInventory,
    replenishmentNeeded,
  };
}
