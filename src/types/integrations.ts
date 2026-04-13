export type IntegrationStatus = "connected" | "pending" | "disconnected" | "error" | "verifying" | "syncing" | "paused";
export type IntegrationHealth = "operational" | "degraded" | "critical";
export type IntegrationCategory = "channel" | "payment" | "supplier" | "logistics" | "tracking";
export type LogSeverity = "info" | "warning" | "error" | "critical";
export type LogStatus = "success" | "failed" | "pending";

export interface Integration {
  id: string;
  name: string;
  category: IntegrationCategory;
  status: IntegrationStatus;
  health: IntegrationHealth;
  description: string;
  account: string | null;
  lastSync: string | null;
  lastEvent: string | null;
  productsSynced: number | null;
  webhookStatus: IntegrationStatus | null;
  recentIncidents: number;
  eventsToday: number | null;
}

export interface IntegrationLog {
  id: string;
  integrationId: string;
  integrationName: string;
  event: string;
  severity: LogSeverity;
  status: LogStatus;
  timestamp: string;
  reference: string | null;
  details: string;
}

export interface IntegrationsSummary {
  totalActive: number;
  totalAlerts: number;
  totalDisconnected: number;
  lastGlobalSync: string;
  paymentsOperational: number;
  suppliersActive: number;
  recentErrors: number;
  channelsConnected: number;
}
