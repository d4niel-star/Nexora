import { prisma } from "@/lib/db/prisma";
import { createHash } from "node:crypto";

export type EventSeverity = "info" | "warn" | "error" | "critical";

export interface LogEventParams {
  storeId?: string | null;
  entityType: string;
  entityId?: string | null;
  eventType: string;
  severity?: EventSeverity;
  source: string;
  message: string;
  metadata?: Record<string, unknown>;
  // ─── Phase 7A: enterprise audit trail ───
  actorId?: string | null;
  actorRole?: string | null;
  correlationId?: string | null;
  requestId?: string | null;
  /** Raw IP — hashed before persistence. Never stored as plaintext. */
  ip?: string | null;
}

const MAX_METADATA_BYTES = 8 * 1024;
const MAX_MESSAGE_LEN = 500;

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

/**
 * Registra un evento centralizado del sistema en la base de datos de manera resiliente.
 * No interrumpe (throttles errors) la ejecución de la función principal.
 */
export async function logSystemEvent(params: LogEventParams) {
  try {
    let metadataJson: string | null = null;
    if (params.metadata) {
      const serialized = JSON.stringify(params.metadata);
      metadataJson = serialized.length > MAX_METADATA_BYTES
        ? JSON.stringify({ truncated: true, original_size: serialized.length })
        : serialized;
    }

    await prisma.systemEvent.create({
      data: {
        storeId: params.storeId ?? null,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        eventType: params.eventType,
        severity: params.severity || "info",
        source: params.source,
        message: params.message.slice(0, MAX_MESSAGE_LEN),
        metadataJson,
        // Phase 7A audit trail
        actorId: params.actorId ?? null,
        actorRole: params.actorRole ?? null,
        correlationId: params.correlationId ?? null,
        requestId: params.requestId ?? null,
        ipHash: params.ip ? hashIp(params.ip) : null,
      }
    });

    // Si es error o critico, asegurarnos de que quede en stdout de los logs de infra
    if (params.severity === "error" || params.severity === "critical") {
      console.error(`[AUDIT:${params.eventType}] ${params.message}`, params.metadata);
    } else if (process.env.ENABLE_VERBOSE_AUDIT === "true") {
      console.log(`[AUDIT:${params.eventType}] ${params.message}`);
    }
  } catch (err) {
    // Failsafe: nunca romper un flujo de ecommerce por que el audit file falló
    console.error("[Observability Failsafe] Error registrando logSystemEvent", err);
  }
}
