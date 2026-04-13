import { prisma } from "@/lib/db/prisma";

export type EventSeverity = "info" | "warn" | "error" | "critical";

export interface LogEventParams {
  storeId?: string;
  entityType: string;
  entityId?: string;
  eventType: string;
  severity?: EventSeverity;
  source: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Registra un evento centralizado del sistema en la base de datos de manera resiliente.
 * No interrumpe (throttles errors) la ejecución de la función principal.
 */
export async function logSystemEvent(params: LogEventParams) {
  try {
    await prisma.systemEvent.create({
      data: {
        storeId: params.storeId || null,
        entityType: params.entityType,
        entityId: params.entityId || null,
        eventType: params.eventType,
        severity: params.severity || "info",
        source: params.source,
        message: params.message,
        metadataJson: params.metadata ? JSON.stringify(params.metadata) : null,
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
