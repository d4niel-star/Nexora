// ─── AI Store Studio Types ───

export interface AIBrief {
  brandName: string;
  industry: string;
  targetAudience: string;
  objective: string;
  country: string;
  currency: string;
  tone: string;
  style: "minimal_premium" | "high_conversion" | "editorial";
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
}

export interface AIProposalOutput {
  name: string;
  style: "minimal_premium" | "high_conversion" | "editorial";
  summary: string;
  strengths: string[];
  hero: {
    headline: string;
    subheadline: string;
    ctaLabel: string;
    ctaLink: string;
  };
  blocks: AIBlockOutput[];
  navigation: { label: string; href: string }[];
  brandClaim: string;
  copyTone: string;
  visualRecommendations: string;
}

export interface AIBlockOutput {
  type: "hero" | "featured_products" | "featured_categories" | "benefits" | "testimonials" | "faq" | "newsletter";
  sortOrder: number;
  settings: Record<string, unknown>;
}

export interface AIGenerationResult {
  proposals: AIProposalOutput[];
  tokensUsed: number;
}

export type AISectionType = "hero" | "benefits" | "faq" | "testimonials" | "featured_products" | "featured_categories" | "newsletter";

export interface AIRegenerationResult {
  block: AIBlockOutput;
  tokensUsed: number;
}
