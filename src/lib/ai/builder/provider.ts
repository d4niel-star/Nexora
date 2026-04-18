// ─── AI Builder Provider Interface ───
// Unified surface for the AI-driven builder capabilities.
// Implementations can be swapped at runtime (mock, Anthropic, OpenAI, etc.)
// without touching any business logic or server actions.

import type {
  StoreIdentityInput,
  StoreIdentitySuggestion,
  ProductSheetInput,
  ProductSheetSuggestion,
  MarketingCopyInput,
  MarketingCopySuggestion,
} from "./types";

export interface AIBuilderProvider {
  id: string;

  /** Capability 1: Generate store identity from free-text description. */
  suggestStoreIdentity(input: StoreIdentityInput): Promise<StoreIdentitySuggestion>;

  /** Capability 2: Generate product sheet from raw name/short description. Never returns price. */
  generateProductSheet(input: ProductSheetInput): Promise<ProductSheetSuggestion>;

  /** Capability 4: Generate marketing copy variants for a given channel. */
  generateMarketingCopy(input: MarketingCopyInput): Promise<MarketingCopySuggestion>;
}

// ─── Registry ───

const builderProviders: Record<string, AIBuilderProvider> = {};

export function registerBuilderProvider(provider: AIBuilderProvider) {
  builderProviders[provider.id] = provider;
}

export function getBuilderProvider(id?: string): AIBuilderProvider {
  const key = id ?? process.env.AI_PROVIDER_DEFAULT ?? "mock";
  const provider = builderProviders[key];
  if (!provider) {
    throw new Error(
      `AI builder provider "${key}" not registered. Available: ${Object.keys(builderProviders).join(", ") || "none"}`
    );
  }
  return provider;
}
