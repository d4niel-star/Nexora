"use server";

import { prisma } from "@/lib/db/prisma";
import { getProvider, registerProvider } from "@/lib/ai/providers";
import { MockProvider } from "@/lib/ai/providers/mock";
import { logSystemEvent } from "@/lib/observability/audit";
import type { AIBrief, AIProposalOutput, AISectionType, AIBlockOutput } from "@/types/ai";
import type { BlockType } from "@/types/store-engine";

// Register the mock provider by default
registerProvider(MockProvider);

// ─── Generate full draft with 3 proposals ───

export async function generateAIStudioDraft(storeId: string, brief: AIBrief) {
  // Fetch store context
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: {
      products: { take: 8, where: { isPublished: true }, select: { handle: true, title: true, price: true } },
      collections: { take: 4, select: { handle: true, title: true } },
      branding: true,
    },
  });

  if (!store) throw new Error("Store not found");

  const provider = getProvider();

  const result = await provider.generateStoreDraft(brief, {
    existingProducts: store.products,
    existingCategories: store.collections,
    brandingExists: !!store.branding,
  });

  // Validate output
  if (!result.proposals || result.proposals.length === 0) {
    throw new Error("AI provider returned empty proposals");
  }

  // Create the draft record
  const draft = await prisma.aIGenerationDraft.create({
    data: {
      storeId,
      title: `${brief.brandName} — Generación IA`,
      briefJson: JSON.stringify(brief),
      style: brief.style,
      status: "generated",
      usageTokens: result.tokensUsed,
    },
  });

  // Persist each proposal
  const proposalRecords = await Promise.all(
    result.proposals.map(async (p, idx) => {
      return prisma.aIGenerationProposal.create({
        data: {
          draftId: draft.id,
          label: String.fromCharCode(65 + idx), // A, B, C
          name: p.name,
          style: p.style,
          summary: p.summary,
          strengthsJson: JSON.stringify(p.strengths),
          outputJson: JSON.stringify(p),
        },
      });
    })
  );

  await logSystemEvent({
    storeId,
    entityType: "ai_draft",
    entityId: draft.id,
    eventType: "ai_generation_completed",
    severity: "info",
    source: "ai_studio",
    message: `Generación IA completada: ${proposalRecords.length} propuestas para "${brief.brandName}"`,
    metadata: { provider: provider.id, tokensUsed: result.tokensUsed },
  });

  return {
    draftId: draft.id,
    proposals: proposalRecords.map((r, idx) => ({
      id: r.id,
      label: r.label,
      name: r.name,
      style: r.style,
      summary: r.summary,
      strengths: JSON.parse(r.strengthsJson) as string[],
      output: result.proposals[idx],
    })),
  };
}

// ─── Regenerate a single section ───

export async function regenerateAISection(
  draftId: string,
  proposalId: string,
  section: AISectionType
) {
  const proposal = await prisma.aIGenerationProposal.findUnique({
    where: { id: proposalId },
    include: { draft: true },
  });

  if (!proposal) throw new Error("Proposal not found");

  const brief: AIBrief = JSON.parse(proposal.draft.briefJson);
  const currentOutput: AIProposalOutput = JSON.parse(proposal.outputJson);
  const provider = getProvider();

  const result = await provider.regenerateSection(brief, section, currentOutput.blocks);

  // Update the block in the proposal output
  const updatedBlocks = currentOutput.blocks.map((b) =>
    b.type === section ? { ...result.block, sortOrder: b.sortOrder } : b
  );

  // If the section didn't exist, add it
  if (!currentOutput.blocks.find(b => b.type === section)) {
    updatedBlocks.push(result.block);
  }

  const updatedOutput: AIProposalOutput = { ...currentOutput, blocks: updatedBlocks };

  // If regenerating hero, also update the hero field
  if (section === "hero" && result.block.settings) {
    updatedOutput.hero = {
      headline: (result.block.settings as any).headline || currentOutput.hero.headline,
      subheadline: (result.block.settings as any).subheadline || currentOutput.hero.subheadline,
      ctaLabel: (result.block.settings as any).primaryActionLabel || currentOutput.hero.ctaLabel,
      ctaLink: (result.block.settings as any).primaryActionLink || currentOutput.hero.ctaLink,
    };
  }

  await prisma.aIGenerationProposal.update({
    where: { id: proposalId },
    data: { outputJson: JSON.stringify(updatedOutput) },
  });

  // Update usage tokens
  await prisma.aIGenerationDraft.update({
    where: { id: draftId },
    data: { usageTokens: { increment: result.tokensUsed } },
  });

  await logSystemEvent({
    entityType: "ai_draft",
    entityId: draftId,
    eventType: "ai_section_regenerated",
    severity: "info",
    source: "ai_studio",
    message: `Sección "${section}" regenerada en propuesta ${proposal.label}`,
  });

  return updatedOutput;
}

// ─── Select a proposal ───

export async function selectAIProposal(draftId: string, proposalId: string) {
  await prisma.aIGenerationDraft.update({
    where: { id: draftId },
    data: { selectedProposalId: proposalId },
  });
}

// ─── Apply proposal to real store ───

export async function applyAIProposalToStore(draftId: string, proposalId: string) {
  const proposal = await prisma.aIGenerationProposal.findUnique({
    where: { id: proposalId },
    include: { draft: { include: { store: true } } },
  });

  if (!proposal) throw new Error("Proposal not found");

  const output: AIProposalOutput = JSON.parse(proposal.outputJson);
  const brief: AIBrief = JSON.parse(proposal.draft.briefJson);
  const storeId = proposal.draft.storeId;
  const slug = proposal.draft.store.slug;

  // Apply branding
  await prisma.storeBranding.upsert({
    where: { storeId },
    update: {
      primaryColor: brief.primaryColor,
      secondaryColor: brief.secondaryColor,
      fontFamily: brief.fontFamily,
      tone: brief.tone,
    },
    create: {
      storeId,
      primaryColor: brief.primaryColor,
      secondaryColor: brief.secondaryColor,
      fontFamily: brief.fontFamily,
      tone: brief.tone,
    },
  });

  // Apply theme
  const themeMap: Record<string, string> = {
    minimal_premium: "minimal",
    high_conversion: "bold",
    editorial: "classic",
  };

  await prisma.storeTheme.upsert({
    where: { storeId },
    update: { activeTheme: themeMap[output.style] || "minimal", themeStatus: "draft", isPublished: false },
    create: { storeId, activeTheme: themeMap[output.style] || "minimal", themeStatus: "draft", isPublished: false },
  });

  // Apply navigation
  await prisma.storeNavigation.deleteMany({ where: { storeId } });
  const navData = output.navigation.map((n, idx) => ({
    storeId,
    group: "header",
    label: n.label,
    href: n.href,
    sortOrder: idx,
    isVisible: true,
  }));
  // Add default footer nav
  navData.push(
    { storeId, group: "footer_shop", label: "Ver todo", href: `/${slug}/collections`, sortOrder: 0, isVisible: true },
    { storeId, group: "footer_shop", label: "Ofertas", href: `/${slug}/collections/ofertas`, sortOrder: 1, isVisible: true },
    { storeId, group: "footer_support", label: "Contacto", href: `/${slug}/contact`, sortOrder: 0, isVisible: true },
    { storeId, group: "footer_support", label: "FAQ", href: `/${slug}/faq`, sortOrder: 1, isVisible: true },
    { storeId, group: "footer_support", label: "Devoluciones", href: `/${slug}/policies/returns`, sortOrder: 2, isVisible: true },
  );
  await prisma.storeNavigation.createMany({ data: navData });

  // Apply home blocks
  await prisma.storeBlock.deleteMany({ where: { storeId, pageType: "home" } });
  const blockData = output.blocks.map((b) => ({
    storeId,
    pageType: "home",
    blockType: b.type as string,
    sortOrder: b.sortOrder,
    isVisible: true,
    settingsJson: JSON.stringify(b.settings),
    source: "ai",
    state: "draft",
  }));
  await prisma.storeBlock.createMany({ data: blockData });

  // Mark draft as applied
  await prisma.aIGenerationDraft.update({
    where: { id: draftId },
    data: { status: "applied", selectedProposalId: proposalId },
  });

  await logSystemEvent({
    storeId,
    entityType: "ai_draft",
    entityId: draftId,
    eventType: "ai_proposal_applied",
    severity: "info",
    source: "ai_studio",
    message: `Propuesta "${output.name}" aplicada a tienda ${proposal.draft.store.name}`,
    metadata: { proposalId, style: output.style },
  });

  return { success: true, storeId };
}

// ─── Get latest draft for a store ───

export async function getLatestAIDraft(storeId: string) {
  const draft = await prisma.aIGenerationDraft.findFirst({
    where: { storeId, status: { not: "discarded" } },
    orderBy: { createdAt: "desc" },
    include: {
      proposals: { orderBy: { label: "asc" } },
    },
  });

  if (!draft) return null;

  return {
    id: draft.id,
    title: draft.title,
    brief: JSON.parse(draft.briefJson) as AIBrief,
    style: draft.style,
    status: draft.status,
    selectedProposalId: draft.selectedProposalId,
    usageTokens: draft.usageTokens,
    createdAt: draft.createdAt.toISOString(),
    proposals: draft.proposals.map((p) => ({
      id: p.id,
      label: p.label,
      name: p.name,
      style: p.style,
      summary: p.summary,
      strengths: JSON.parse(p.strengthsJson) as string[],
      output: JSON.parse(p.outputJson) as AIProposalOutput,
    })),
  };
}
