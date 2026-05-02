// ─── Shared pagination helpers ──────────────────────────────────────────
// Used by both orders and catalog paginated queries. Tiny, no over-design.

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

/** Parse a positive integer from a URL searchParam value. */
export function parsePositiveInt(
  value: string | string[] | undefined | null,
  fallback: number,
): number {
  if (value === null || value === undefined) return fallback;
  const raw = typeof value === "string" ? value : value[0];
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Clamp pageSize to [1, MAX_PAGE_SIZE]. */
export function clampPageSize(size: number): number {
  return Math.max(1, Math.min(size, MAX_PAGE_SIZE));
}

/** Build pagination metadata from total + current page + pageSize. */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function buildPaginationMeta(
  total: number,
  page: number,
  pageSize: number,
): PaginationMeta {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  // Clamp page to valid range
  const safePage = Math.max(1, Math.min(page, pageCount));
  return {
    page: safePage,
    pageSize,
    total,
    pageCount,
    hasNextPage: safePage < pageCount,
    hasPreviousPage: safePage > 1,
  };
}

/** Compute Prisma skip from page + pageSize. */
export function pageToSkip(page: number, pageSize: number): number {
  return (Math.max(1, page) - 1) * pageSize;
}
