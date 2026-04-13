export type AIStoreProjectStatus = "draft" | "in_progress" | "generated" | "ready_to_publish" | "active" | "inactive";
export type ProposalStyleType = "minimal_premium" | "high_conversion" | "editorial";

export interface AIStoreConfig {
  brandName: string;
  industry: string;
  storeType: string;
  primaryObjective: string;
  targetAudience: string;
  country: string;
  currency: string;
  brandTone: string;
}

export interface AIStoreBrandStyle {
  styleCategory: ProposalStyleType;
  primaryColor: string;
  secondaryColor: string;
  typography: string;
  copyTone: string;
  formalityLevel: string;
  visualMood: string;
}

export interface AIStoreCatalogStructure {
  useRealCatalog: boolean;
  featuredProductsCount: number;
  mainCategories: string[];
  suggestedNavigation: string[];
  suggestedHomepageBlocks: string[];
  includeFaq: boolean;
  includePolicies: boolean;
  includeBenefits: boolean;
}

export interface AIProposal {
  id: string;
  name: string;
  styleCategory: ProposalStyleType;
  shortSummary: string;
  suggestedHeroText: string;
  homepageStructure: string[];
  copyTone: string;
  layoutStyle: string;
  strengths: string[];
  previewUrlDesktop: string;
  previewUrlMobile: string;
}

export interface PublishReadiness {
  branding: boolean;
  catalog: boolean;
  navigation: boolean;
  payments: boolean;
  policies: boolean;
}

export interface AIStoreProject {
  id: string;
  status: AIStoreProjectStatus;
  config: AIStoreConfig;
  brandStyle: AIStoreBrandStyle;
  catalogStructure: AIStoreCatalogStructure;
  proposals: AIProposal[];
  selectedProposalId: string | null;
  publishReadiness: PublishReadiness;
  createdAt: string;
  updatedAt: string;
}
