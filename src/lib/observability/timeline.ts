import { prisma } from "@/lib/db/prisma";

// ─── Audit Timeline Queries ──────────────────────────────────────────
// Server-only. Powers /admin/operations/timeline.
//
// Filters (all optional):
//   - severity: info | warn | error | critical
//   - eventType: substring match
//   - actorId: exact
//   - correlationId: exact (for tracing a grouped operation)
//   - entityType: exact
//   - dateFrom / dateTo: ISO strings
//
// Pagination: cursor-based on `createdAt + id` (id breaks ties), so
// the timeline can grow without OFFSET pain.

export interface TimelineFilters {
  storeId?: string;
  severity?: "info" | "warn" | "error" | "critical";
  eventType?: string;
  actorId?: string;
  correlationId?: string;
  entityType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  // Cursor: createdAt + id of the last row from the previous page
  cursorCreatedAt?: Date;
  cursorId?: string;
}

export interface TimelineRow {
  id: string;
  storeId: string | null;
  entityType: string;
  entityId: string | null;
  eventType: string;
  severity: string;
  source: string;
  message: string;
  actorId: string | null;
  actorRole: string | null;
  correlationId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

// ─── Metadata sanitization ───
// Removes obviously sensitive keys before returning to the client.
// Belt-and-suspenders: producers should also avoid logging these.
const SENSITIVE_KEY_RE = /(token|secret|password|authorization|api[_-]?key|cookie|session|raw[_-]?ip)/i;

function sanitizeMetadata(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const scrubbed = scrub(parsed);
    return (scrubbed && typeof scrubbed === "object" && !Array.isArray(scrubbed))
      ? (scrubbed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[depth-limit]";
  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_RE.test(k)) {
        out[k] = "[redacted]";
      } else {
        out[k] = scrub(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}

export async function listTimelineEvents(filters: TimelineFilters = {}): Promise<{ rows: TimelineRow[]; nextCursor: { createdAt: string; id: string } | null }> {
  const limit = Math.min(Math.max(filters.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

  const where: Record<string, unknown> = {};
  if (filters.storeId) where.storeId = filters.storeId;
  if (filters.severity) where.severity = filters.severity;
  if (filters.actorId) where.actorId = filters.actorId;
  if (filters.correlationId) where.correlationId = filters.correlationId;
  if (filters.entityType) where.entityType = filters.entityType;
  if (filters.eventType) where.eventType = { contains: filters.eventType, mode: "insensitive" };
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {
      ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
      ...(filters.dateTo ? { lte: filters.dateTo } : {}),
    };
  }

  // Cursor: rows STRICTLY older than the cursor pair
  if (filters.cursorCreatedAt && filters.cursorId) {
    where.OR = [
      { createdAt: { lt: filters.cursorCreatedAt } },
      { AND: [{ createdAt: filters.cursorCreatedAt }, { id: { lt: filters.cursorId } }] },
    ];
  }

  const rows = await prisma.systemEvent.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1, // fetch one extra to know if there's a next page
  });

  const hasMore = rows.length > limit;
  const sliced = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = sliced[sliced.length - 1];

  return {
    rows: sliced.map((r) => ({
      id: r.id,
      storeId: r.storeId,
      entityType: r.entityType,
      entityId: r.entityId,
      eventType: r.eventType,
      severity: r.severity,
      source: r.source,
      message: r.message,
      actorId: r.actorId,
      actorRole: r.actorRole,
      correlationId: r.correlationId,
      metadata: sanitizeMetadata(r.metadataJson),
      createdAt: r.createdAt.toISOString(),
    })),
    nextCursor: hasMore && lastRow ? { createdAt: lastRow.createdAt.toISOString(), id: lastRow.id } : null,
  };
}
