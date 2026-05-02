import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";

// ─── Stock Movement History ─────────────────────────────────────────────
//
// Paginated query for stock movements visible in the admin inventory.
// Always filters by storeId for tenant isolation.

export interface StockMovementRow {
  id: string;
  createdAt: string;
  type: string;
  typeLabel: string;
  quantityDelta: number;
  reason: string | null;
  orderId: string | null;
  product: { id: string; title: string };
  variant: { id: string; title: string };
}

export interface StockMovementPageResult {
  movements: StockMovementRow[];
  total: number;
  page: number;
  pageSize: number;
}

const TYPE_LABELS: Record<string, string> = {
  sale: "Venta",
  manual_adjustment: "Ajuste manual",
  refund_restore: "Restauración (reembolso)",
  cancellation_restore: "Restauración (cancelación)",
  sourcing_import: "Importación proveedor",
  sync_update: "Sincronización",
};

export async function getStockMovementHistory(options?: {
  page?: number;
  pageSize?: number;
  type?: string;
  query?: string;
}): Promise<StockMovementPageResult> {
  const store = await getCurrentStore();
  if (!store) return { movements: [], total: 0, page: 1, pageSize: 20 };

  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, options?.pageSize ?? 20));

  const where: Record<string, unknown> = { storeId: store.id };
  if (options?.type && options.type !== "all") {
    where.type = options.type;
  }
  if (options?.query) {
    const q = options.query.trim();
    if (q) {
      where.product = { title: { contains: q, mode: "insensitive" } };
    }
  }

  const [total, rows] = await Promise.all([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        product: { select: { id: true, title: true } },
        variant: { select: { id: true, title: true } },
      },
    }),
  ]);

  return {
    movements: rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      type: r.type,
      typeLabel: TYPE_LABELS[r.type] ?? r.type,
      quantityDelta: r.quantityDelta,
      reason: r.reason,
      orderId: r.orderId,
      product: { id: r.product.id, title: r.product.title },
      variant: { id: r.variant.id, title: r.variant.title },
    })),
    total,
    page,
    pageSize,
  };
}
