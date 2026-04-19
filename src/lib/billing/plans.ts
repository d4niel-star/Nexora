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
  whatsappRecovery: boolean;  // Cart recovery via WhatsApp (Meta Cloud API)
  productReviews: boolean;    // Product reviews with moderation (storefront + admin)
  bundlesUpsells: boolean;    // Manual cross-sell / upsell blocks on PDP
  postPurchaseFlows: boolean; // Automated post-purchase email flows
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
// Nexora ships EXACTLY three operational plans. Enterprise was retired
// in the V4 monetization consolidation; any historical subscription that
// pointed to it was migrated to Scale (Scale is a strict superset of its
// entitlements). The enterprise Plan row still exists in the DB with
// status='archived' for FK integrity but is never referenced here.
//
// Packaging rationale (see commit): Growth is the commercial default and
// concentrates the full conversion + AI stack; Scale adds BYOK, sourcing
// and multi-store for teams with real operational scale.
export const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    code: "core",
    name: "Core",
    monthlyPrice: 20000,
    currency: "ARS",
    sortOrder: 0,
    config: {
      aiCredits: 150,
      maxProducts: 150,
      maxOrdersPerMonth: 100,
      maxStores: 1,
      aiBuilder: false,
      customDomain: true,
      byokEnabled: false,
      aiStudioAdvanced: false,
      advancedCarriers: false,
      advancedBranding: true,
      sourcingAdvanced: false,
      whatsappRecovery: false,
      productReviews: true,
      bundlesUpsells: false,
      postPurchaseFlows: false,
      maxStaff: 2,
    },
  },
  {
    code: "growth",
    name: "Growth",
    monthlyPrice: 59000,
    currency: "ARS",
    sortOrder: 1,
    highlight: true,
    config: {
      aiCredits: 750,
      maxProducts: 1500,
      maxOrdersPerMonth: 0, // unlimited
      maxStores: 1,
      aiBuilder: true,
      customDomain: true,
      byokEnabled: false,
      aiStudioAdvanced: true,
      advancedCarriers: true,
      advancedBranding: true,
      sourcingAdvanced: false,
      whatsappRecovery: true,
      productReviews: true,
      bundlesUpsells: true,
      postPurchaseFlows: true,
      maxStaff: 5,
    },
  },
  {
    code: "scale",
    name: "Scale",
    monthlyPrice: 119000,
    currency: "ARS",
    sortOrder: 2,
    config: {
      aiCredits: 3000,
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
      whatsappRecovery: true,
      productReviews: true,
      bundlesUpsells: true,
      postPurchaseFlows: true,
      maxStaff: 15,
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
