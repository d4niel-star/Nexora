"use server";

/**
 * Per-store, per-user, per-assistant memory + deliberation telemetry.
 * Validates session on every call — client passes scope only for UX hints;
 * authoritative IDs come from getCurrentUser().
 */

import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { logSystemEvent } from "@/lib/observability/audit";
import { MEMORY_TTL_DAYS } from "@/lib/assistants/memory/payload";
import type { DeliberationMeta, TraceNote } from "@/lib/ai-core";
import {
  compactDeliberationMeta,
  sanitizeDeliberationTraceForStorage,
} from "./telemetry/nexora-deliberation-log";

const memoryTtlMs = () => MEMORY_TTL_DAYS * 24 * 60 * 60 * 1000;

export type NexoraAssistantId = "global" | "editor";

export interface MemoryRowDTO {
  payloadJson: string;
  summaryLine: string;
  updatedAt: string;
}

async function getVerifiedScope(expectedStoreId: string, expectedUserId: string) {
  const user = await getCurrentUser();
  if (!user || user.id !== expectedUserId) return null;
  if (!user.storeId || user.storeId !== expectedStoreId) return null;
  return { user, storeId: user.storeId };
}

export async function loadNexoraAssistantMemory(
  storeId: string,
  userId: string,
  assistantId: NexoraAssistantId,
): Promise<MemoryRowDTO | null> {
  const scope = await getVerifiedScope(storeId, userId);
  if (!scope) return null;
  const row = await prisma.nexoraAssistantMemory.findUnique({
    where: {
      storeId_userId_assistantId: { storeId: scope.storeId, userId, assistantId },
    },
  });
  if (!row) return null;
  if (row.expiresAt && row.expiresAt < new Date()) {
    try {
      await prisma.nexoraAssistantMemory.delete({
        where: { id: row.id },
      });
    } catch {
      /* ignore */
    }
    return null;
  }
  return {
    payloadJson: row.payloadJson,
    summaryLine: row.summaryLine,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function saveNexoraAssistantMemory(
  storeId: string,
  userId: string,
  assistantId: NexoraAssistantId,
  payloadJson: string,
  summaryLine: string,
): Promise<{ ok: boolean }> {
  const scope = await getVerifiedScope(storeId, userId);
  if (!scope) return { ok: false };
  if (payloadJson.length > 120_000) return { ok: false };
  const line = summaryLine.slice(0, 500);
  const expiresAt = new Date(Date.now() + memoryTtlMs());
  await prisma.nexoraAssistantMemory.upsert({
    where: {
      storeId_userId_assistantId: { storeId: scope.storeId, userId, assistantId },
    },
    create: {
      storeId: scope.storeId,
      userId,
      assistantId,
      payloadJson,
      summaryLine: line,
      expiresAt,
    },
    update: { payloadJson, summaryLine: line, updatedAt: new Date(), expiresAt },
  });
  return { ok: true };
}

export async function logNexoraDeliberation(
  storeId: string,
  userId: string,
  meta: DeliberationMeta,
  trace: TraceNote[],
): Promise<void> {
  const scope = await getVerifiedScope(storeId, userId);
  if (!scope) return;
  const safeTrace = sanitizeDeliberationTraceForStorage(trace);
  const flat = compactDeliberationMeta(meta);
  await logSystemEvent({
    storeId: scope.storeId,
    entityType: "ai_assistant",
    entityId: `${meta.assistant}:${userId.slice(0, 8)}`,
    eventType: "nexora_deliberation",
    source: "nexora_assistant",
    message: `assistant=${meta.assistant} kind=${meta.replyKind} ${meta.durationMs}ms branch=${meta.pipeline.branch}`,
    metadata: {
      ...flat,
      userIdPrefix: userId.slice(0, 8),
      trace: safeTrace,
    },
  });
}
