import { prisma } from "@/lib/db/prisma";

// ─── Job Queries (read-side) ──────────────────────────────────────────
// Powers the Operations Center dashboard.

export interface JobSummary {
  total: number;
  pending: number;
  running: number;
  succeeded24h: number;
  failed24h: number;
  dead24h: number;
  cancelled24h: number;
}

export interface JobRow {
  id: string;
  type: string;
  status: string;
  storeId: string | null;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  runAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  correlationId: string | null;
  createdAt: string;
}

export async function getJobSummary(storeId?: string): Promise<JobSummary> {
  const last24h = new Date(Date.now() - 86_400_000);
  const where = storeId ? { storeId } : {};

  const [total, pending, running, succeeded24h, failed24h, dead24h, cancelled24h] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.count({ where: { ...where, status: "pending" } }),
    prisma.job.count({ where: { ...where, status: "running" } }),
    prisma.job.count({ where: { ...where, status: "succeeded", finishedAt: { gte: last24h } } }),
    prisma.job.count({ where: { ...where, status: "failed", updatedAt: { gte: last24h } } }),
    prisma.job.count({ where: { ...where, status: "dead", finishedAt: { gte: last24h } } }),
    prisma.job.count({ where: { ...where, status: "cancelled", finishedAt: { gte: last24h } } }),
  ]);

  return { total, pending, running, succeeded24h, failed24h, dead24h, cancelled24h };
}

export interface ListJobsOptions {
  storeId?: string;
  status?: string;
  type?: string;
  limit?: number;
}

export async function listJobs(opts: ListJobsOptions = {}): Promise<JobRow[]> {
  const where: Record<string, unknown> = {};
  if (opts.storeId) where.storeId = opts.storeId;
  if (opts.status) where.status = opts.status;
  if (opts.type) where.type = opts.type;

  const rows = await prisma.job.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    take: opts.limit ?? 50,
    select: {
      id: true,
      type: true,
      status: true,
      storeId: true,
      attempts: true,
      maxAttempts: true,
      lastError: true,
      runAt: true,
      startedAt: true,
      finishedAt: true,
      durationMs: true,
      correlationId: true,
      createdAt: true,
    },
  });

  return rows.map((r) => ({
    ...r,
    runAt: r.runAt.toISOString(),
    startedAt: r.startedAt?.toISOString() ?? null,
    finishedAt: r.finishedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}
