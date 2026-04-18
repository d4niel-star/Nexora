// ─── AI Provider Bootstrap ───
// Importar una sola vez en el entry point del servidor (layout.tsx o instrumentation.ts).

import { registerBuilderProvider } from "@/lib/ai/builder/provider";
import { MockBuilderProvider } from "@/lib/ai/builder/mock-provider";

// Registrar mock siempre como fallback
registerBuilderProvider(MockBuilderProvider);

// Registrar Anthropic solo si la API key está presente
if (process.env.ANTHROPIC_API_KEY) {
  // Import dinámico para no romper build si el SDK no está instalado
  import("@/lib/ai/builder/anthropic-provider").then(({ AnthropicBuilderProvider }) => {
    registerBuilderProvider(AnthropicBuilderProvider);
  });
}
