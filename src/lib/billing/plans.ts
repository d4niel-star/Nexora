// ─── Plan Configuration Types ───

export interface PlanConfig {
  aiCredits: number;          // Monthly AI credits included
  maxProducts: number;        // 0 = unlimited
  maxOrdersPerMonth: number;  // 0 = unlimited
  maxStores: number;          // 0 = unlimited
  aiBuilder: boolean;         // Access to the 3 AI Builder capabilities
  customDomain: boolean;
  byokEnabled: boolean;
  aiStudioAdvanced: boolean;
  advancedCarriers: boolean;
  advancedBranding: boolean;
  sourcingAdvanced: boolean;  // Cross-provider sourcing and velocity aptitude
  maxStaff: number;
}

/**
 * Length of the automatic trial granted on signup, in days. After expiry the
 * store is transitioned to plan "core" with trial-exceeded gating applied
 * until payment is configured.
 */
export const TRIAL_DURATION_DAYS = 14;

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
    code: "core",
    name: "Core",
    monthlyPrice: 59900,
    currency: "ARS",
    sortOrder: 0,
    config: {
      aiCredits: 100,
      maxProducts: 100,
      maxOrdersPerMonth: 50,
      maxStores: 1,
      aiBuilder: false,
      customDomain: true,
      byokEnabled: false,
      aiStudioAdvanced: false,
      advancedCarriers: false,
      advancedBranding: true,
      sourcingAdvanced: false,
      maxStaff: 2,
    },
  },
  {
    code: "growth",
    name: "Growth",
    monthlyPrice: 149900,
    currency: "ARS",
    sortOrder: 1,
    highlight: true,
    config: {
      aiCredits: 500,
      maxProducts: 1000,
      maxOrdersPerMonth: 0, // unlimited
      maxStores: 1,
      aiBuilder: true,
      customDomain: true,
      byokEnabled: false,
      aiStudioAdvanced: true,
      advancedCarriers: true,
      advancedBranding: true,
      sourcingAdvanced: false,
      maxStaff: 5,
    },
  },
  {
    code: "scale",
    name: "Scale",
    monthlyPrice: 349900,
    currency: "ARS",
    sortOrder: 2,
    config: {
      aiCredits: 2000,
      maxProducts: 0,
      maxOrdersPerMonth: 0,
      maxStores: 3,
      aiBuilder: true,
      customDomain: true,
      byokEnabled: true,
      aiStudioAdvanced: true,
      advancedCarriers: true,
      advancedBranding: true,
      sourcingAdvanced: true,
      maxStaff: 15,
    },
  },
  {
    code: "enterprise",
    name: "Enterprise",
    monthlyPrice: 0,
    currency: "ARS",
    sortOrder: 3,
    config: {
      aiCredits: 0,
      maxProducts: 0,
      maxOrdersPerMonth: 0,
      maxStores: 0,
      aiBuilder: true,
      customDomain: true,
      byokEnabled: true,
      aiStudioAdvanced: true,
      advancedCarriers: true,
      advancedBranding: true,
      sourcingAdvanced: true,
      maxStaff: 0,
    },
  },
];

// ─── Credit Costs ───

export const CREDIT_COSTS = {
  ai_chat_message: 1,
  ai_studio_generation: 10,
  ai_studio_section_regen: 3,
  ai_store_identity: 5,
  ai_product_sheet: 2,
  ai_marketing_copy: 1,
} as const;

export type CreditFeature = keyof typeof CREDIT_COSTS;
