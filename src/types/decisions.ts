// ─── IA de Decisión v1 Types ───

export type DecisionDomain = "operations" | "finance" | "sourcing" | "ads" | "aptitude";
export type DecisionSeverity = "critical" | "high" | "normal" | "info";
export type DecisionImpact = "revenue" | "risk" | "efficiency" | "quality";
export type ExecutionActionType = "publish_product" | "mark_preparing" | "retry_sync" | "batch_publish" | "batch_prepare";

export interface ExecutableAction {
  type: ExecutionActionType;
  label: string;
  entityId: string;
  secondaryId?: string;
}

export interface DecisionRecommendation {
  id: string;
  domain: DecisionDomain;
  severity: DecisionSeverity;
  impact: DecisionImpact;
  title: string;
  reason: string;
  evidence: string;
  href: string;
  actionLabel: string;
  action?: ExecutableAction;
}

export interface DomainHealth {
  domain: DecisionDomain;
  label: string;
  count: number;
  maxSeverity: DecisionSeverity;
}

export interface DecisionEngineResult {
  recommendations: DecisionRecommendation[];
  domains: DomainHealth[];
  generatedAt: string;
}
