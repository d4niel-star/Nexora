import { prisma } from "@/lib/db/prisma";

// ─── Customer Task Queries (Phase 7D.3) ──────────────────────────────
// Read-only views over CustomerTask. The /admin/customers/tasks page
// composes overdue + due-today + upcoming + completed slices.

export interface TaskRow {
  id: string;
  customerEmail: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueAt: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  assignedToEmail: string | null;
  createdById: string;
  createdAt: string;
  completedAt: string | null;
}

const PER_BUCKET_LIMIT = 50;

export async function listTasksForCustomer(storeId: string, customerEmail: string): Promise<TaskRow[]> {
  const email = customerEmail.trim().toLowerCase();
  const tasks = await prisma.customerTask.findMany({
    where: { storeId, customerEmail: email },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  return enrich(tasks);
}

export interface TaskBuckets {
  overdue: TaskRow[];
  dueToday: TaskRow[];
  upcoming: TaskRow[];
  unscheduled: TaskRow[];
  completed: TaskRow[];
  cancelled: TaskRow[];
  counts: {
    overdue: number;
    dueToday: number;
    upcoming: number;
    unscheduled: number;
    completed: number;
    cancelled: number;
  };
}

interface BucketFilters {
  storeId: string;
  /** When set, restrict to tasks assigned to this user. */
  assignedToId?: string;
}

export async function getTaskBuckets(filters: BucketFilters): Promise<TaskBuckets> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const baseWhere: Record<string, unknown> = { storeId: filters.storeId };
  if (filters.assignedToId) baseWhere.assignedToId = filters.assignedToId;

  const [overdue, dueToday, upcoming, unscheduled, completed, cancelled] = await Promise.all([
    prisma.customerTask.findMany({
      where: { ...baseWhere, status: "open", dueAt: { lt: startOfDay } },
      orderBy: { dueAt: "asc" },
      take: PER_BUCKET_LIMIT,
    }),
    prisma.customerTask.findMany({
      where: { ...baseWhere, status: "open", dueAt: { gte: startOfDay, lt: endOfDay } },
      orderBy: { dueAt: "asc" },
      take: PER_BUCKET_LIMIT,
    }),
    prisma.customerTask.findMany({
      where: { ...baseWhere, status: "open", dueAt: { gte: endOfDay } },
      orderBy: { dueAt: "asc" },
      take: PER_BUCKET_LIMIT,
    }),
    prisma.customerTask.findMany({
      where: { ...baseWhere, status: "open", dueAt: null },
      orderBy: { createdAt: "desc" },
      take: PER_BUCKET_LIMIT,
    }),
    prisma.customerTask.findMany({
      where: { ...baseWhere, status: "completed" },
      orderBy: { completedAt: "desc" },
      take: PER_BUCKET_LIMIT,
    }),
    prisma.customerTask.findMany({
      where: { ...baseWhere, status: "cancelled" },
      orderBy: { cancelledAt: "desc" },
      take: PER_BUCKET_LIMIT,
    }),
  ]);

  const all = [...overdue, ...dueToday, ...upcoming, ...unscheduled, ...completed, ...cancelled];
  const enriched = await enrich(all);
  const byId = new Map(enriched.map((r) => [r.id, r]));
  const pluck = (rows: typeof overdue) => rows.map((r) => byId.get(r.id)!).filter(Boolean);

  return {
    overdue: pluck(overdue),
    dueToday: pluck(dueToday),
    upcoming: pluck(upcoming),
    unscheduled: pluck(unscheduled),
    completed: pluck(completed),
    cancelled: pluck(cancelled),
    counts: {
      overdue: overdue.length,
      dueToday: dueToday.length,
      upcoming: upcoming.length,
      unscheduled: unscheduled.length,
      completed: completed.length,
      cancelled: cancelled.length,
    },
  };
}

async function enrich(tasks: Array<{
  id: string; customerEmail: string; title: string; description: string | null;
  status: string; priority: string; dueAt: Date | null; assignedToId: string | null;
  createdById: string; createdAt: Date; completedAt: Date | null;
}>): Promise<TaskRow[]> {
  const userIds = Array.from(new Set(tasks.map((t) => t.assignedToId).filter((id): id is string => Boolean(id))));
  const users = userIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  return tasks.map((t) => {
    const u = t.assignedToId ? userMap.get(t.assignedToId) : null;
    return {
      id: t.id,
      customerEmail: t.customerEmail,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      dueAt: t.dueAt?.toISOString() ?? null,
      assignedToId: t.assignedToId,
      assignedToName: u?.name ?? null,
      assignedToEmail: u?.email ?? null,
      createdById: t.createdById,
      createdAt: t.createdAt.toISOString(),
      completedAt: t.completedAt?.toISOString() ?? null,
    };
  });
}
