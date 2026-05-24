import { prisma } from "@/lib/db/prisma";
import { resolveJobHandler, getJobTimeoutMs, PermanentJobError } from "./types";
import { logSystemEvent } from "@/lib/observability/logger";
import { withTimeout, TimeoutError } from "@/lib/resilience/timeout";

// ─── Job Queue ───────────────────────────────────────────────────────
// Postgres-backed durable queue. Producers call enqueueJob(); workers
// (cron + on-demand) call runDueJobs() to drain pending work.
//
// Design choices:
//   - Idempotency: (type, idempotencyKey) is unique. Re-enqueueing the
//     same key is a no-op (returns existing job).
//   - Locking: cooperative — claim updates lockedBy/lockedAt atomically
//     via updateMany() with a status="pending" filter, so two concurrent
//     workers cannot both acquire the same job.
//   - Retry: exponential backoff with jitter. After maxAttempts we mark
//     the job as "dead" rather than "failed" so it's filterable in the
//     Operations Center for human review.
//   - Observability: every transition writes a SystemEvent for the
//     audit trail.

const MAX_PAYLOAD_BYTES = 32 * 1024; // 32 KB
const DEFAULT_MAX_ATTEMPTS = 5;

export interface EnqueueJobInput {
  type: string;
  payload?: Record<string, unknown>;
  storeId?: string | null;
  runAt?: Date;
  priority?: number;
  maxAttempts?: number;
  idempotencyKey?: string;
  correlationId?: string;
  actorId?: string;
}

export async function enqueueJob(input: EnqueueJobInput): Promise<{ id: string; deduped: boolean }> {
  const payloadJson = JSON.stringify(input.payload ?? {});
  if (payloadJson.length > MAX_PAYLOAD_BYTES) {
    throw new Error(`Job payload too large (>${MAX_PAYLOAD_BYTES} bytes)`);
  }

  // Idempotency short-circuit
  if (input.idempotencyKey) {
    const existing = await prisma.job.findUnique({
      where: { type_idempotencyKey: { type: input.type, idempotencyKey: input.idempotencyKey } },
      select: { id: true },
    });
    if (existing) return { id: existing.id, deduped: true };
  }

  const job = await prisma.job.create({
    data: {
      type: input.type,
      payload: payloadJson,
      storeId: input.storeId ?? null,
      runAt: input.runAt ?? new Date(),
      priority: input.priority ?? 100,
      maxAttempts: input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
      idempotencyKey: input.idempotencyKey ?? null,
      correlationId: input.correlationId ?? null,
      actorId: input.actorId ?? null,
    },
    select: { id: true },
  });

  await logSystemEvent({
    storeId: input.storeId ?? null,
    entityType: "job",
    entityId: job.id,
    eventType: "job_enqueued",
    severity: "info",
    source: "job_queue",
    message: `Job ${input.type} enqueued`,
    correlationId: input.correlationId,
    actorId: input.actorId,
    metadata: { type: input.type },
  });

  return { id: job.id, deduped: false };
}

// ─── Run due jobs ───
// Pulls up to `limit` pending jobs whose runAt has passed and executes
// each one inline. Designed to be called from a cron handler (every
// minute or so). Workers write jobs as succeeded/failed; failures get
// rescheduled with backoff or moved to "dead" after maxAttempts.
const BACKOFF_BASE_MS = 30 * 1000; // 30s
const BACKOFF_MAX_MS = 60 * 60 * 1000; // 1h

function computeBackoff(attempts: number): number {
  // Exponential with jitter: base * 2^(attempts-1), capped, +/- 20%.
  const exp = Math.min(BACKOFF_BASE_MS * Math.pow(2, Math.max(0, attempts - 1)), BACKOFF_MAX_MS);
  const jitter = exp * (0.8 + Math.random() * 0.4);
  return Math.floor(jitter);
}

export interface RunDueJobsOptions {
  limit?: number;
  workerId?: string;
}

export async function runDueJobs(opts: RunDueJobsOptions = {}): Promise<{ processed: number; succeeded: number; failed: number }> {
  const limit = opts.limit ?? 10;
  const workerId = opts.workerId ?? `worker-${process.pid}-${Date.now()}`;
  const now = new Date();

  // Fetch candidate jobs (not yet locked, due, pending or retrying)
  const candidates = await prisma.job.findMany({
    where: {
      status: { in: ["pending"] },
      runAt: { lte: now },
      lockedBy: null,
    },
    orderBy: [{ priority: "asc" }, { runAt: "asc" }],
    take: limit,
    select: { id: true },
  });

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (const { id } of candidates) {
    // Cooperative claim — only one worker wins this transition.
    const claim = await prisma.job.updateMany({
      where: { id, status: "pending", lockedBy: null },
      data: { status: "running", lockedBy: workerId, lockedAt: now, startedAt: now },
    });
    if (claim.count === 0) continue; // raced; another worker took it

    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) continue;

    processed += 1;
    const startMs = Date.now();
    const handler = resolveJobHandler(job.type);

    let result: { ok: boolean; error?: string; permanent?: boolean; metadata?: Record<string, unknown> };
    try {
      if (!handler) {
        // No handler registered → permanent failure (no retry).
        result = { ok: false, error: `No handler registered for type: ${job.type}`, permanent: true };
      } else {
        const payloadObj = safeParse(job.payload);
        const timeoutMs = getJobTimeoutMs(job.type);
        result = await withTimeout(
          handler({
            jobId: job.id,
            type: job.type,
            storeId: job.storeId,
            payload: payloadObj,
            attempts: job.attempts + 1,
            correlationId: job.correlationId,
          }),
          timeoutMs,
          `job:${job.type}`,
        );
      }
    } catch (err) {
      if (err instanceof PermanentJobError) {
        result = { ok: false, error: err.message, permanent: true };
      } else if (err instanceof TimeoutError) {
        // Timeouts are transient — they get retried.
        result = { ok: false, error: `Timed out after ${err.timeoutMs}ms`, permanent: false };
      } else {
        result = { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    }

    const durationMs = Date.now() - startMs;
    const newAttempts = job.attempts + 1;

    if (result.ok) {
      succeeded += 1;
      await prisma.job.update({
        where: { id },
        data: {
          status: "succeeded",
          attempts: newAttempts,
          finishedAt: new Date(),
          durationMs,
          lockedBy: null,
          lockedAt: null,
          lastError: null,
        },
      });
      await logSystemEvent({
        storeId: job.storeId,
        entityType: "job",
        entityId: job.id,
        eventType: "job_succeeded",
        severity: "info",
        source: "job_queue",
        message: `Job ${job.type} succeeded in ${durationMs}ms`,
        correlationId: job.correlationId,
        metadata: { type: job.type, attempts: newAttempts, durationMs },
      });
    } else {
      failed += 1;
      // Permanent failures (validation, missing handler) skip retries and
      // go straight to dead so they show up in the Operations Center for
      // human review.
      const dead = result.permanent === true || newAttempts >= job.maxAttempts;
      const nextRunAt = dead ? null : new Date(Date.now() + computeBackoff(newAttempts));
      await prisma.job.update({
        where: { id },
        data: {
          status: dead ? "dead" : "pending",
          attempts: newAttempts,
          finishedAt: dead ? new Date() : null,
          durationMs,
          lockedBy: null,
          lockedAt: null,
          lastError: (result.error ?? "unknown error").slice(0, 500),
          runAt: nextRunAt ?? job.runAt,
          nextAttempt: nextRunAt,
        },
      });
      await logSystemEvent({
        storeId: job.storeId,
        entityType: "job",
        entityId: job.id,
        eventType: dead ? "job_dead" : "job_failed",
        severity: dead ? "error" : "warn",
        source: "job_queue",
        message: dead
          ? `Job ${job.type} dead after ${newAttempts} attempts: ${result.error}`
          : `Job ${job.type} failed (attempt ${newAttempts}/${job.maxAttempts}): ${result.error}`,
        correlationId: job.correlationId,
        metadata: { type: job.type, attempts: newAttempts, durationMs, error: result.error },
      });
    }
  }

  return { processed, succeeded, failed };
}

// ─── Manual operations ───

export async function retryJob(jobId: string): Promise<void> {
  await prisma.job.update({
    where: { id: jobId },
    data: { status: "pending", runAt: new Date(), lockedBy: null, lockedAt: null, nextAttempt: null },
  });
}

export async function cancelJob(jobId: string): Promise<void> {
  await prisma.job.update({
    where: { id: jobId },
    data: { status: "cancelled", finishedAt: new Date(), lockedBy: null, lockedAt: null },
  });
}

function safeParse(s: string): Record<string, unknown> {
  try { return JSON.parse(s) as Record<string, unknown>; } catch { return {}; }
}
