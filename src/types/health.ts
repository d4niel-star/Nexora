// ─── Health Center Multicanal v1 Types ───

export type HealthStatus = "healthy" | "degraded" | "critical" | "unknown";
export type HealthSeverity = "critical" | "high" | "normal" | "info";

export interface ConnectionHealthEntry {
  id: string;
  type: "ad_platform" | "provider";
  name: string;
  platform: string;
  rawStatus: string;
  health: HealthStatus;
  tokenStatus: "ok" | "expiring_soon" | "expired" | "no_token";
  lastActivity: string | null;
  lastError: string | null;
}

export interface HealthSignal {
  id: string;
  severity: HealthSeverity;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
}

export interface ListingSyncSummary {
  total: number;
  published: number;
  synced: number;
  outOfSync: number;
  syncError: number;
  publishFailed: number;
}

export interface HealthCenterData {
  connections: ConnectionHealthEntry[];
  signals: HealthSignal[];
  listings: ListingSyncSummary;
  overallHealth: HealthStatus;
  generatedAt: string;
}
