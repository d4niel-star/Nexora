// ─── AI Chat Provider Interface ───
// Separate from the Store Generation provider — this handles conversational AI

export interface AIChatProvider {
  id: string;
  chat(messages: ChatMessage[], systemPrompt: string): Promise<ChatResponse>;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatResponse {
  content: string;
  tokensUsed: { prompt: number; response: number; total: number };
}

// ─── Registry ───

const chatProviders: Record<string, AIChatProvider> = {};

export function registerChatProvider(provider: AIChatProvider) {
  chatProviders[provider.id] = provider;
}

export function getChatProvider(id?: string): AIChatProvider {
  const key = id ?? process.env.AI_PROVIDER_DEFAULT ?? "mock";
  const provider = chatProviders[key];
  if (!provider) throw new Error(`AI chat provider "${key}" not registered. Available: ${Object.keys(chatProviders).join(", ")}`);
  return provider;
}
