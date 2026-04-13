export type OnboardingStage = "welcome" | "creating_store" | "connecting_channels" | "sourcing" | "completed";

export interface OnboardingStepProps {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
  isCompleted: boolean;
  creditCost?: number;
}
