// ─── AI Builder Types ───
// Shared input/output types for the 4 AI-driven builder capabilities.
// Capability 3 (catalog analysis) is deterministic and lives in catalog-analyzer.ts.
// Capability 5 (Command Center proactive recs) already exists in src/lib/ai/command-center.ts.

// ─── Capability 1: Store identity from free-text description ───

export interface StoreIdentityInput {
  description: string;   // free-text business description from the merchant
  industryHint?: string; // optional industry anchor if known
  locale?: string;       // "es-AR" default
}

export interface StoreNameOption {
  name: string;
  rationale: string; // 1-line justification
  slug: string;      // url-safe handle derived from the name
}

export interface StoreCategorySuggestion {
  title: string;
  handle: string;
  description: string;
}

export interface StoreIdentitySuggestion {
  nameOptions: StoreNameOption[];            // exactly 3 options
  storeDescription: string;                  // professional long-form description
  categories: StoreCategorySuggestion[];     // 3-6 suggested categories
  welcomeCopy: {                              // home/hero + short greeting
    headline: string;
    subheadline: string;
    shortGreeting: string;
  };
  tokensUsed: number;
}

// ─── Capability 2: Product sheet from name/short desc ───

export interface ProductSheetInput {
  rawName: string;                  // merchant-provided name or short description
  industryHint?: string;            // from store context
  brandTone?: string;               // from store branding
  existingCategories?: string[];    // store categories for suggestion alignment
}

export interface ProductSheetSuggestion {
  seoTitle: string;              // <= 70 chars, keyword-rich
  description: string;           // persuasive long-form, 3-5 paragraphs
  categorySuggestion: string;    // best match from existingCategories or a new proposed title
  tags: string[];                // 5-10 search tags
  // DELIBERATELY NO PRICE FIELD. We never invent prices.
  tokensUsed: number;
}

// ─── Capability 4: Marketing copy from product ───

export type MarketingChannel = "social_instagram" | "social_facebook" | "email_subject" | "email_body";

export interface MarketingCopyInput {
  productTitle: string;
  productDescription?: string;
  productPrice?: number;         // merchant may pass real price — never invented
  brandTone?: string;            // "premium", "cercano", "técnico", etc
  brandName?: string;
  channel: MarketingChannel;
  offer?: string;                // optional active promo
}

export interface MarketingCopyVariant {
  channel: MarketingChannel;
  text: string;
  characterCount: number;
  hashtags?: string[]; // only for social channels
}

export interface MarketingCopySuggestion {
  variants: MarketingCopyVariant[]; // 2-3 variations per call
  tokensUsed: number;
}

// ─── Capability 3: Catalog analysis ───
// Lives in catalog-analyzer.ts but its types live here for a single import surface.

export type CatalogIssueType =
  | "missing_description"
  | "short_description"
  | "no_image"
  | "variant_without_stock"
  | "variant_without_price"
  | "unpublished_with_stock";

export type CatalogIssueSeverity = "critical" | "warning" | "info";

export interface CatalogIssue {
  type: CatalogIssueType;
  severity: CatalogIssueSeverity;
  productId: string;
  productTitle: string;
  productHandle: string;
  variantId?: string;
  variantTitle?: string;
  message: string;          // human-readable explanation in es-AR
  actionHref: string;       // deep link to admin page to fix
  actionLabel: string;      // CTA label
}

export interface CatalogAnalysisReport {
  totalProducts: number;
  totalIssues: number;
  issuesByType: Record<CatalogIssueType, number>;
  issues: CatalogIssue[]; // sorted by severity desc
  generatedAt: string;
}
