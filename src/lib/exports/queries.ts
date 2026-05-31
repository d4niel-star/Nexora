import { prisma } from "@/lib/db/prisma";

// ─── Export Queries (Phase 7D.4) ─────────────────────────────────────
// Read-only views over ExportArtifact for the Operations Center exports
// tab. We don't return `csvContent` — that's only fetched at download
// time via the dedicated route.

export interface ExportRow {
  id: string;
  type: string;
  status: string;
  filename: string;
  rowCount: number;
  fileSize: number;
  errorMessage: string | null;
  createdById: string;
  createdByName: string | null;
  createdAt: string;
  readyAt: string | null;
  expiresAt: string;
  downloadedAt: string | null;
  downloadCount: number;
  jobId: string | null;
}

export async function listRecentExports(storeId: string, limit = 50): Promise<ExportRow[]> {
  const rows = await prisma.exportArtifact.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" },
    take: Math.min(200, Math.max(1, limit)),
  });

  const userIds = Array.from(new Set(rows.map((r) => r.createdById)));
  const users = userIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    status: r.status,
    filename: r.filename,
    rowCount: r.rowCount,
    fileSize: r.fileSize,
    errorMessage: r.errorMessage,
    createdById: r.createdById,
    createdByName: userMap.get(r.createdById)?.name ?? userMap.get(r.createdById)?.email ?? null,
    createdAt: r.createdAt.toISOString(),
    readyAt: r.readyAt?.toISOString() ?? null,
    expiresAt: r.expiresAt.toISOString(),
    downloadedAt: r.downloadedAt?.toISOString() ?? null,
    downloadCount: r.downloadCount,
    jobId: r.jobId,
  }));
}
