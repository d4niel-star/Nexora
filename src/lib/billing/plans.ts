// ─── Plan Configuration Types ───

export interface PlanConfig {
  aiCredits: number;          // Monthly AI credits included
  maxProducts: number;        // 0 = unlimited
  maxOrdersPerMonth: number;  // 0 = unlimited
  customDomain: boolean;
  byokEnabled: boolean;
  aiStudioAdvanced: boolean;
  advancedCarriers: boolean;
  advancedBranding: boolean;
  maxStaff: number;
}

export interface PlanDefinition {
  code: string;
  name: string;
  monthlyPrice: number;
  currency: string;
  config: PlanConfig;
  sortOrder: number;
  badge?: string;
  highlight?: boolean;
}

// ─── Default Plan Definitions ───

export const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    code: "free",
    name: "Free",
    monthlyPrice: 0,
    currency: "ARS",
    sortOrder: 0,
    config: {
      aiCredits: 50,
      maxProducts: 15,
      maxOrdersPerMonth: 20,
      customDomain: false,
      byokEnabled: false,
      aiStudioAdvanced: false,
      advancedCarriers: false,
      advancedBranding: false,
      maxStaff: 1,
    },
  },
  {
    code: "starter",
    name: "Starter",
    monthlyPrice: 14999,
    currency: "ARS",
    sortOrder: 1,
    config: {
      aiCredits: 200,
      maxProducts: 100,
      maxOrdersPerMonth: 100,
      customDomain: true,
      byokEnabled: false,
      aiStudioAdvanced: true,
      advancedCarriers: false,
      advancedBranding: true,
      maxStaff: 3,
    },
  },
  {
    code: "growth",
    name: "Growth",
    monthlyPrice: 39999,
    currency: "ARS",
    sortOrder: 2,
    badge: "Popular",
    highlight: true,
    config: {
      aiCredits: 500,
      maxProducts: 500,
      maxOrdersPerMonth: 500,
      customDomain: true,
      byokEnabled: false,
      aiStudioAdvanced: true,
      advancedCarriers: true,
      advancedBranding: true,
      maxStaff: 5,
    },
  },
  {
    code: "pro",
    name: "Pro",
    monthlyPrice: 89999,
    currency: "ARS",
    sortOrder: 3,
    config: {
      aiCredits: 2000,
      maxProducts: 0,
      maxOrdersPerMonth: 0,
      customDomain: true,
      byokEnabled: true,
      aiStudioAdvanced: true,
      advancedCarriers: true,
      advancedBranding: true,
      maxStaff: 15,
    },
  },
];

// ─── Credit Costs ───

export const CREDIT_COSTS = {
  ai_chat_message: 1,
  ai_studio_generation: 10,
  ai_studio_section_regen: 3,
} as const;

export type CreditFeature = keyof typeof CREDIT_COSTS;
