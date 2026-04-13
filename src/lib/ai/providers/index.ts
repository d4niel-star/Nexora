import type { AIBrief, AIGenerationResult, AIRegenerationResult, AISectionType, AIBlockOutput } from "@/types/ai";

// ─── Provider Interface ───

export interface AIProvider {
  id: string;
  generateStoreDraft(brief: AIBrief, context?: StoreContext): Promise<AIGenerationResult>;
  regenerateSection(brief: AIBrief, section: AISectionType, currentBlocks: AIBlockOutput[]): Promise<AIRegenerationResult>;
}

export interface StoreContext {
  existingProducts?: { handle: string; title: string; price: number }[];
  existingCategories?: { handle: string; title: string }[];
  brandingExists?: boolean;
}

// ─── Provider Registry ───

const providers: Record<string, AIProvider> = {};

export function registerProvider(provider: AIProvider) {
  providers[provider.id] = provider;
}

export function getProvider(id?: string): AIProvider {
  const key = id ?? process.env.AI_PROVIDER_DEFAULT ?? "mock";
  const provider = providers[key];
  if (!provider) throw new Error(`AI provider "${key}" not registered. Available: ${Object.keys(providers).join(", ")}`);
  return provider;
}
