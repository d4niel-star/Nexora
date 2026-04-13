"use server";

import { prisma } from "@/lib/db/prisma";
import { getChatProvider, registerChatProvider } from "@/lib/ai-core/chat/provider";
import { MockChatProvider } from "@/lib/ai-core/chat/mock-provider";
import { buildContextPrompt, type AIContextType } from "@/lib/ai-core/contexts";
import { getDefaultStore } from "@/lib/store-engine/queries";
import { logSystemEvent } from "@/lib/observability/audit";
import { consumeCredits, checkFeatureAccess } from "@/lib/billing/service";
import type { ChatMessage } from "@/lib/ai-core/chat/provider";

// Register mock provider
registerChatProvider(MockChatProvider);

// ─── Create a new conversation ───

export async function createConversationAction(contextType: AIContextType = "general") {
  const store = await getDefaultStore();
  if (!store) throw new Error("No se encontró tienda");

  const contextLabels: Record<AIContextType, string> = {
    general: "Asistente general",
    store: "Asistente de tienda",
    catalog: "Asistente de catálogo",
    orders: "Asistente de pedidos",
    marketing: "Asistente de marketing",
    support: "Asistente de soporte",
  };

  const conversation = await prisma.aIConversation.create({
    data: {
      storeId: store.id,
      contextType,
      title: contextLabels[contextType],
      provider: "managed",
      mode: "managed",
    },
  });

  return {
    id: conversation.id,
    contextType: conversation.contextType,
    title: conversation.title,
    messages: [] as { id: string; role: string; content: string; createdAt: string }[],
  };
}

// ─── Send message and get AI response ───

export async function sendMessageAction(conversationId: string, userMessage: string) {
  if (!userMessage.trim()) throw new Error("Mensaje vacío");
  if (userMessage.length > 4000) throw new Error("Mensaje demasiado largo (máx 4000 caracteres)");

  // Get conversation with messages
  const conversation = await prisma.aIConversation.findUnique({
    where: { id: conversationId },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } },
  });

  if (!conversation) throw new Error("Conversación no encontrada");

  // Check credits before calling AI
  const creditCheck = await checkFeatureAccess(conversation.storeId, "ai_credits");
  if (!creditCheck.allowed) {
    throw new Error(creditCheck.reason || "Sin créditos disponibles");
  }

  const creditResult = await consumeCredits(
    conversation.storeId,
    "ai_chat_message",
    conversationId
  );
  if (!creditResult.success) {
    throw new Error(creditResult.reason || "No se pudieron consumir créditos");
  }

  // Build context prompt
  const systemPrompt = await buildContextPrompt(
    conversation.storeId,
    conversation.contextType as AIContextType
  );

  // Save user message
  const userMsg = await prisma.aIMessage.create({
    data: {
      conversationId,
      role: "user",
      content: userMessage,
    },
  });

  // Build message array for provider
  const chatMessages: ChatMessage[] = [
    ...conversation.messages.map((m) => ({
      role: m.role as ChatMessage["role"],
      content: m.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  // Get AI response
  const provider = getChatProvider();
  let response;
  try {
     response = await provider.chat(chatMessages, systemPrompt);
  } catch (err: any) {
     const { refundCredits } = await import("@/lib/billing/service");
     const { CREDIT_COSTS } = await import("@/lib/billing/plans");
     await refundCredits(conversation.storeId, CREDIT_COSTS.ai_chat_message, "ai_chat_refund", conversationId);
     throw new Error("Provider de AI falló. Créditos reembolsados. Detalles: " + err.message);
  }

  // Save assistant message
  const assistantMsg = await prisma.aIMessage.create({
    data: {
      conversationId,
      role: "assistant",
      content: response.content,
      metadataJson: JSON.stringify({ tokensUsed: response.tokensUsed }),
    },
  });

  // Update conversation title from first message
  if (conversation.messages.length === 0) {
    const title = userMessage.length > 50 ? userMessage.slice(0, 50) + "..." : userMessage;
    await prisma.aIConversation.update({
      where: { id: conversationId },
      data: { title },
    });
  }

  // Log usage
  await prisma.aIUsageLog.create({
    data: {
      storeId: conversation.storeId,
      contextType: conversation.contextType,
      provider: provider.id,
      feature: "chat",
      promptTokens: response.tokensUsed.prompt,
      responseTokens: response.tokensUsed.response,
      totalTokens: response.tokensUsed.total,
    },
  });

  return {
    userMessage: { id: userMsg.id, role: "user", content: userMessage, createdAt: userMsg.createdAt.toISOString() },
    assistantMessage: { id: assistantMsg.id, role: "assistant", content: response.content, createdAt: assistantMsg.createdAt.toISOString() },
  };
}

// ─── Get conversation list ───

export async function getConversationsAction() {
  const store = await getDefaultStore();
  if (!store) return [];

  const conversations = await prisma.aIConversation.findMany({
    where: { storeId: store.id, status: "active" },
    orderBy: { updatedAt: "desc" },
    take: 20,
    include: { _count: { select: { messages: true } } },
  });

  return conversations.map((c) => ({
    id: c.id,
    contextType: c.contextType,
    title: c.title,
    messageCount: c._count.messages,
    updatedAt: c.updatedAt.toISOString(),
  }));
}

// ─── Get conversation with messages ───

export async function getConversationAction(conversationId: string) {
  const conversation = await prisma.aIConversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation) return null;

  return {
    id: conversation.id,
    contextType: conversation.contextType,
    title: conversation.title,
    messages: conversation.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

// ─── Get usage stats ───

export async function getAIUsageStatsAction() {
  const store = await getDefaultStore();
  if (!store) return { totalConversations: 0, totalMessages: 0, totalTokens: 0 };

  const conversations = await prisma.aIConversation.count({ where: { storeId: store.id } });
  const usage = await prisma.aIUsageLog.aggregate({
    where: { storeId: store.id },
    _sum: { totalTokens: true },
    _count: true,
  });

  return {
    totalConversations: conversations,
    totalMessages: usage._count,
    totalTokens: usage._sum.totalTokens ?? 0,
  };
}
