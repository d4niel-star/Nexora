import { prisma } from "@/lib/db/prisma";

// ─── Rate Limiting ───────────────────────────────────────────────────
// Postgres-backed fixed-window counter. Designed for sensitive admin
// endpoints (refunds, exports, automation triggers) where Redis would
// be overkill. Race-tolerant via upsert + atomic decrement.
//
// Usage:
//   const ok = await checkRateLimit({
//     key: `refund:user:${userId}`,
//     limit: 10,
//     windowMs: 60_000,
//   });
//   if (!ok.allowed) throw new Error("Rate limited. Retry in " + ok.retryAfterMs);

export interface RateLimitInput {
  key: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterMs: number;
}

export async function checkRateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  const now = new Date();
  const newReset = new Date(now.getTime() + input.windowMs);

  // Atomic upsert: if bucket exists and is in-window, increment.
  // If bucket is expired, reset.
  const existing = await prisma.rateLimitBucket.findUnique({ where: { key: input.key } });

  if (!existing || existing.resetAt <= now) {
    // First request in window — create or reset
    await prisma.rateLimitBucket.upsert({
      where: { key: input.key },
      create: { key: input.key, count: 1, resetAt: newReset },
      update: { count: 1, resetAt: newReset },
    });
    return {
      allowed: true,
      remaining: input.limit - 1,
      resetAt: newReset,
      retryAfterMs: 0,
    };
  }

  if (existing.count >= input.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterMs: existing.resetAt.getTime() - now.getTime(),
    };
  }

  // Race-tolerant increment
  const updated = await prisma.rateLimitBucket.update({
    where: { key: input.key },
    data: { count: { increment: 1 } },
    select: { count: true, resetAt: true },
  });

  return {
    allowed: updated.count <= input.limit,
    remaining: Math.max(0, input.limit - updated.count),
    resetAt: updated.resetAt,
    retryAfterMs: updated.count > input.limit ? updated.resetAt.getTime() - now.getTime() : 0,
  };
}

/**
 * Throwing variant for use as a guard at the top of a server action.
 * Throws RateLimitError if the limit is exceeded.
 */
export async function requireRateLimit(input: RateLimitInput): Promise<void> {
  const result = await checkRateLimit(input);
  if (!result.allowed) {
    throw new RateLimitError(input.key, result.retryAfterMs);
  }
}

export class RateLimitError extends Error {
  retryAfterMs: number;
  bucketKey: string;
  constructor(key: string, retryAfterMs: number) {
    super(`Rate limit exceeded for ${key}. Retry after ${Math.ceil(retryAfterMs / 1000)}s`);
    this.name = "RateLimitError";
    this.bucketKey = key;
    this.retryAfterMs = retryAfterMs;
  }
}
