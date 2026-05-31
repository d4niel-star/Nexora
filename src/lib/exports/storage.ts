import { prisma } from "@/lib/db/prisma";

// ─── Export Storage (Phase 7D.4) ─────────────────────────────────────
// Inline-blob storage for export artifacts. CSV body lives in the
// `csvContent` text column. Hard cap at MAX_BYTES so a runaway export
// can't blow up the row size beyond Postgres' practical text-column
// comfort zone (~1 GB theoretical, ~32 MB practical for fast queries).
//
// When we need to scale beyond per-store SMB volumes, swap this module
// for a S3/GCS adapter — every callsite uses these helpers, no caller
// touches `csvContent` directly.

export const MAX_BYTES = 32 * 1024 * 1024; // 32 MB practical cap
export const MAX_ROWS = 100_000;            // hard row cap per export
export const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function createPendingArtifact(input: {
  storeId: string;
  type: string;
  filename: string;
  createdById: string;
}): Promise<{ id: string }> {
  const expiresAt = new Date(Date.now() + TTL_MS);
  const row = await prisma.exportArtifact.create({
    data: {
      storeId: input.storeId,
      type: input.type,
      filename: input.filename,
      status: "pending",
      createdById: input.createdById,
      expiresAt,
    },
    select: { id: true },
  });
  return { id: row.id };
}

export async function attachJobIdToArtifact(artifactId: string, jobId: string): Promise<void> {
  await prisma.exportArtifact.update({
    where: { id: artifactId },
    data: { jobId },
  });
}

export async function writeArtifactReady(input: {
  artifactId: string;
  csv: string;
  rowCount: number;
}): Promise<void> {
  if (input.csv.length > MAX_BYTES) {
    throw new Error(`Export size ${input.csv.length} bytes exceeds cap ${MAX_BYTES}`);
  }
  await prisma.exportArtifact.update({
    where: { id: input.artifactId },
    data: {
      status: "ready",
      csvContent: input.csv,
      fileSize: input.csv.length,
      rowCount: input.rowCount,
      readyAt: new Date(),
    },
  });
}

export async function writeArtifactFailed(artifactId: string, error: string): Promise<void> {
  await prisma.exportArtifact.update({
    where: { id: artifactId },
    data: {
      status: "failed",
      errorMessage: error.slice(0, 500),
      readyAt: new Date(),
    },
  });
}

export async function getArtifactForDownload(artifactId: string, storeId: string): Promise<
  | { ok: true; filename: string; csv: string; type: string }
  | { ok: false; reason: "not_found" | "expired" | "not_ready" | "unauthorized" }
> {
  const artifact = await prisma.exportArtifact.findFirst({
    where: { id: artifactId, storeId },
  });
  if (!artifact) return { ok: false, reason: "not_found" };
  if (artifact.expiresAt <= new Date()) return { ok: false, reason: "expired" };
  if (artifact.status !== "ready" || !artifact.csvContent) {
    return { ok: false, reason: "not_ready" };
  }
  return {
    ok: true,
    filename: artifact.filename,
    csv: artifact.csvContent,
    type: artifact.type,
  };
}

export async function markDownloaded(artifactId: string): Promise<void> {
  await prisma.exportArtifact.update({
    where: { id: artifactId },
    data: {
      downloadedAt: new Date(),
      downloadCount: { increment: 1 },
    },
  });
}

/** Sweep: mark expired and clear blob. Called by a cron / job worker. */
export async function expireOldArtifacts(): Promise<{ expired: number }> {
  const now = new Date();
  const result = await prisma.exportArtifact.updateMany({
    where: { expiresAt: { lt: now }, status: { in: ["ready", "failed", "pending"] } },
    data: { status: "expired", csvContent: null },
  });
  return { expired: result.count };
}
