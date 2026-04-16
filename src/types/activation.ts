// ─── Activation Engine v1 Types ───

export type ActivationTier = "blocker" | "accelerator" | "recommended";
export type ActivationStepStatus = "pending" | "in_progress" | "completed" | "blocked";

export interface ActivationStep {
  id: string;
  tier: ActivationTier;
  title: string;
  description: string;
  status: ActivationStepStatus;
  href: string;
  actionLabel: string;
  detail?: string;
}

export interface ActivationState {
  steps: ActivationStep[];
  score: number;
  totalSteps: number;
  completedSteps: number;
  blockers: number;
  isActivated: boolean;
  generatedAt: string;
}
