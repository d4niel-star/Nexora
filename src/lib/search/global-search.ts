"use server";

import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/rbac/guard";
import { roleHasPermission } from "@/lib/rbac/permissions";
import { requireRateLimit } from "@/lib/rate-limit";
import { logSystemEvent } from "@/lib/observability/audit";
import { score } from "./ranking";
import { MAX_HITS_PER_TYPE, MAX_QUERY_LENGTH, type SearchEntityType, type SearchHit, type SearchResult } from "./types";

// ─── Global Search Engine (Phase 7D.1) ───────────────────────────────
// Deterministic search across orders, customers, products, variants,
// inventory, staff, jobs and audit events. No vector DB. No AI. Pure
// SQL `contains`/`startsWith` queries with a small in-memory ranker.
//
// Multi-tenant safety: every per-source query is `storeId`-scoped.
// RBAC: top-level requirePermission gates the whole operation; per-type
// gates skip sources the role can't read.
// Rate limit: 30/min per actor (Ctrl+K can fire often during quick-nav).
// Audit: a single `global_search_used` event per request, with the
// query + result count (PII trimmed).

const PER_SOURCE_TAKE = 12; // wider than MAX_HITS_PER_TYPE so ranker can re-sort

export interface GlobalSearchInput {
  query: string;
  /** Optionally restrict to a single entity type (deep links). */
  type?: SearchEntityType;
}

export async function runGlobalSearch(input: GlobalSearchInput): Promise<SearchResult> {
  // Top gate: any role with at least catalog.read can use the palette.
  // Per-source RBAC below masks types the role isn't allowed to read.
  const actor = await requirePermission("catalog.read");

  await requireRateLimit({
    key: `global_search:user:${actor.userId}`,
    limit: 30,
    windowMs: 60_000,
    route: "search.global",
    actorId: actor.userId,
    storeId: actor.storeId,
  });

  const raw = (input.query ?? "").trim();
  const q = raw.slice(0, MAX_QUERY_LENGTH).toLowerCase();
  const empty: SearchResult = {
    query: raw,
    groups: { order: [], customer: [], product: [], variant: [], staff: [], job: [], event: [], inventory: [] },
    totalHits: 0,
    truncated: false,
  };
  if (q.length < 2) return empty;

  // Per-type RBAC. Roles without `staff.read` won't see staff hits;
  // roles without `jobs.view` won't see jobs/events; etc.
  const can = {
    orders: roleHasPermission(actor.role, "orders.read"),
    customers: roleHasPermission(actor.role, "customers.read"),
    products: roleHasPermission(actor.role, "catalog.read"),
    inventory: roleHasPermission(actor.role, "inventory.read"),
    staff: roleHasPermission(actor.role, "staff.read"),
    jobs: roleHasPermission(actor.role, "operations.read"),
    events: roleHasPermission(actor.role, "operations.read"),
  };

  // If the caller passed a type filter, mask everything else.
  const enabled = (t: keyof typeof can): boolean =>
    (input.type ? input.type === t || (input.type === "variant" && t === "products") : true) && can[t];

  const now = Date.now();
  const ageMs = (d: Date | null | undefined) => (d ? now - d.getTime() : undefined);

  const [orders, customers, products, variants, inventory, staff, jobs, events] = await Promise.all([
    enabled("orders") ? prisma.order.findMany({
      where: {
        storeId: actor.storeId,
        OR: [
          { orderNumber: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, orderNumber: true, email: true, firstName: true, lastName: true, status: true, total: true, currency: true, createdAt: true },
      take: PER_SOURCE_TAKE,
      orderBy: { createdAt: "desc" },
    }) : Promise.resolve([]),

    enabled("customers") ? prisma.order.findMany({
      where: {
        storeId: actor.storeId,
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
        ],
      },
      // Distinct by email — emulates a Customer aggregate
      distinct: ["email"],
      select: { email: true, firstName: true, lastName: true, createdAt: true },
      take: PER_SOURCE_TAKE,
      orderBy: { createdAt: "desc" },
    }) : Promise.resolve([]),

    enabled("products") ? prisma.product.findMany({
      where: {
        storeId: actor.storeId,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { handle: { contains: q, mode: "insensitive" } },
          { category: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, title: true, handle: true, isPublished: true, price: true, updatedAt: true },
      take: PER_SOURCE_TAKE,
      orderBy: { updatedAt: "desc" },
    }) : Promise.resolve([]),

    enabled("products") ? prisma.productVariant.findMany({
      where: {
        product: { storeId: actor.storeId },
        OR: [
          { sku: { contains: q, mode: "insensitive" } },
          { title: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, sku: true, title: true, price: true, productId: true, product: { select: { title: true } }, updatedAt: true },
      take: PER_SOURCE_TAKE,
      orderBy: { updatedAt: "desc" },
    }) : Promise.resolve([]),

    enabled("inventory") ? prisma.localInventory.findMany({
      where: {
        storeId: actor.storeId,
        OR: [
          { variant: { sku: { contains: q, mode: "insensitive" } } },
          { variant: { title: { contains: q, mode: "insensitive" } } },
          { variant: { product: { title: { contains: q, mode: "insensitive" } } } },
        ],
      },
      select: { id: true, stock: true, lowStockThreshold: true, variant: { select: { id: true, sku: true, title: true, productId: true, product: { select: { title: true } } } }, updatedAt: true },
      take: PER_SOURCE_TAKE,
      orderBy: { updatedAt: "desc" },
    }) : Promise.resolve([]),

    enabled("staff") ? prisma.staffMember.findMany({
      where: {
        storeId: actor.storeId,
        user: { OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ] },
      },
      select: { id: true, role: true, status: true, user: { select: { id: true, name: true, email: true } }, createdAt: true },
      take: PER_SOURCE_TAKE,
    }) : Promise.resolve([]),

    enabled("jobs") ? prisma.job.findMany({
      where: {
        storeId: actor.storeId,
        OR: [
          { type: { contains: q, mode: "insensitive" } },
          { id: { equals: q } },
          { idempotencyKey: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, type: true, status: true, attempts: true, runAt: true, createdAt: true, idempotencyKey: true },
      take: PER_SOURCE_TAKE,
      orderBy: { createdAt: "desc" },
    }) : Promise.resolve([]),

    enabled("events") ? prisma.systemEvent.findMany({
      where: {
        storeId: actor.storeId,
        OR: [
          { eventType: { contains: q, mode: "insensitive" } },
          { entityId: { contains: q, mode: "insensitive" } },
          { message: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, eventType: true, entityType: true, entityId: true, severity: true, message: true, createdAt: true },
      take: PER_SOURCE_TAKE,
      orderBy: { createdAt: "desc" },
    }) : Promise.resolve([]),
  ]);

  // ─── Build hits ─────────────────────────────────────────────────────
  const rawHits: SearchHit[] = [];

  for (const o of orders) {
    rawHits.push({
      type: "order", id: o.id,
      title: `#${o.orderNumber}`,
      subtitle: `${o.firstName ?? ""} ${o.lastName ?? ""} · ${o.email}`.trim(),
      meta: `${o.status} · ${o.currency} ${o.total.toFixed(2)}`,
      href: `/admin/orders/${o.id}`,
      score: score({
        type: "order",
        primary: o.orderNumber,
        secondaries: [o.email, `${o.firstName ?? ""} ${o.lastName ?? ""}`],
        query: q,
        recencyMs: ageMs(o.createdAt),
      }),
    });
  }

  for (const c of customers) {
    const name = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
    rawHits.push({
      type: "customer", id: c.email,
      title: name || c.email,
      subtitle: c.email,
      href: `/admin/customers/${encodeURIComponent(c.email)}`,
      score: score({ type: "customer", primary: c.email, secondaries: [name], query: q, recencyMs: ageMs(c.createdAt) }),
    });
  }

  for (const p of products) {
    rawHits.push({
      type: "product", id: p.id,
      title: p.title,
      subtitle: p.handle,
      meta: p.isPublished ? `Publicado · $${p.price.toFixed(2)}` : `Borrador · $${p.price.toFixed(2)}`,
      href: `/admin/products/${p.id}`,
      score: score({ type: "product", primary: p.title, secondaries: [p.handle ?? ""], query: q, recencyMs: ageMs(p.updatedAt) }),
    });
  }

  for (const v of variants) {
    rawHits.push({
      type: "variant", id: v.id,
      title: `${v.product.title} — ${v.title}`,
      subtitle: v.sku ? `SKU ${v.sku}` : "Sin SKU",
      meta: `$${v.price.toFixed(2)}`,
      href: `/admin/products/${v.productId}`,
      score: score({ type: "variant", primary: v.sku ?? v.title, secondaries: [v.product.title, v.title], query: q, recencyMs: ageMs(v.updatedAt) }),
    });
  }

  for (const li of inventory) {
    const lowFlag = li.stock <= li.lowStockThreshold;
    rawHits.push({
      type: "inventory", id: li.id,
      title: `${li.variant.product.title} — ${li.variant.title}`,
      subtitle: li.variant.sku ? `SKU ${li.variant.sku}` : undefined,
      meta: `Stock ${li.stock}${lowFlag ? " · BAJO" : ""}`,
      href: `/admin/products/${li.variant.productId}`,
      score: score({ type: "inventory", primary: li.variant.sku ?? li.variant.title, secondaries: [li.variant.product.title], query: q, recencyMs: ageMs(li.updatedAt) }),
    });
  }

  for (const s of staff) {
    rawHits.push({
      type: "staff", id: s.user.id,
      title: s.user.name ?? s.user.email,
      subtitle: s.user.email,
      meta: `${s.role} · ${s.status}`,
      href: `/admin/staff`,
      score: score({ type: "staff", primary: s.user.email, secondaries: [s.user.name ?? ""], query: q, recencyMs: ageMs(s.createdAt) }),
    });
  }

  for (const j of jobs) {
    rawHits.push({
      type: "job", id: j.id,
      title: j.type,
      subtitle: j.idempotencyKey ?? j.id,
      meta: `${j.status} · intento ${j.attempts}`,
      href: `/admin/operations/jobs?id=${j.id}`,
      score: score({ type: "job", primary: j.type, secondaries: [j.idempotencyKey ?? "", j.id], query: q, recencyMs: ageMs(j.createdAt) }),
    });
  }

  for (const e of events) {
    rawHits.push({
      type: "event", id: e.id,
      title: e.eventType,
      subtitle: e.message ?? e.entityId ?? "",
      meta: `${e.severity} · ${e.entityType}`,
      href: `/admin/operations/timeline?event=${e.id}`,
      score: score({ type: "event", primary: e.eventType, secondaries: [e.message ?? "", e.entityId ?? ""], query: q, recencyMs: ageMs(e.createdAt) }),
    });
  }

  // ─── Group + cap ─────────────────────────────────────────────────
  const groups: Record<SearchEntityType, SearchHit[]> = {
    order: [], customer: [], product: [], variant: [], staff: [], job: [], event: [], inventory: [],
  };
  for (const h of rawHits.sort((a, b) => b.score - a.score)) {
    if (groups[h.type].length < MAX_HITS_PER_TYPE) groups[h.type].push(h);
  }
  const totalHits = (Object.values(groups) as SearchHit[][]).reduce((s, arr) => s + arr.length, 0);
  const truncated = rawHits.length > totalHits;

  // Audit — single event per query. Truncate the query in metadata so a
  // pasted PII payload doesn't end up in audit logs.
  await logSystemEvent({
    storeId: actor.storeId,
    entityType: "search",
    eventType: "global_search_used",
    severity: "info",
    source: "admin_panel",
    message: `Búsqueda global: ${totalHits} resultados`,
    actorId: actor.userId,
    actorRole: actor.role,
    metadata: {
      queryLength: q.length,
      // Store only the first 16 chars of the query so we can tell what
      // people search for without persisting full PII tokens.
      queryPreview: q.slice(0, 16),
      totalHits,
      types: Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.length])),
    },
  }).catch(() => undefined);

  return { query: raw, groups, totalHits, truncated };
}
