export type TicketStatus = "open" | "in_progress" | "pending" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "critical";

export interface Ticket {
  id: string;
  subject: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
}

export type HelpArticleStatus = "published" | "draft" | "archived";

export interface HelpArticle {
  id: string;
  title: string;
  category: string;
  readTime: string;
  status: HelpArticleStatus;
  lastUpdated: string;
}

export type SystemStatusType = "operational" | "degraded" | "incident" | "maintenance";

export interface SystemModule {
  id: string;
  name: string;
  status: SystemStatusType;
}

export interface SystemStatusInfo {
  overallStatus: SystemStatusType;
  lastIncident: string;
  modules: SystemModule[];
  history: string;
}

export type GuideLevel = "beginner" | "intermediate" | "advanced";

export interface Guide {
  id: string;
  title: string;
  category: string;
  level: GuideLevel;
  duration: string;
  status: "published" | "draft";
}

export interface ContactChannel {
  id: string;
  type: "email" | "chat" | "phone";
  name: string;
  description: string;
  availability: string;
  sla: string;
  value: string;
}

export type ActivitySeverity = "info" | "warning" | "error" | "critical";

export interface SupportActivity {
  id: string;
  type: string;
  description: string;
  severity: ActivitySeverity;
  timestamp: string;
  referenceId: string;
}

export interface SupportSummary {
  openTickets: number;
  resolvedTickets: number;
  avgResponseTime: string;
  overallSystemStatus: SystemStatusType;
}
