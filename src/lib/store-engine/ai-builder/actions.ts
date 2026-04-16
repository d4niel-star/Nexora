"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getAdminStoreId } from "@/lib/store-engine/actions";

export async function saveAIBuilderConfig(storeId: string, briefData: any, styleData: any) {
  const existingDraft = await prisma.aIGenerationDraft.findFirst({
    where: { storeId },
    orderBy: { createdAt: "desc" },
  });

  const fullData = { ...briefData, ...styleData };

  if (existingDraft) {
    await prisma.aIGenerationDraft.update({
      where: { id: existingDraft.id },
      data: {
        briefJson: JSON.stringify(briefData),
        style: styleData.styleCategory || "minimal_premium",
        status: "draft",
      },
    });
  } else {
    await prisma.aIGenerationDraft.create({
      data: {
        storeId,
        briefJson: JSON.stringify(briefData),
        style: styleData.styleCategory || "minimal_premium",
        status: "draft",
      },
    });
  }

  revalidatePath("/admin/ai/store-builder");
  return { success: true };
}

export async function generateAIProposalsAction(storeId: string) {
  const draft = await prisma.aIGenerationDraft.findFirst({
    where: { storeId },
    orderBy: { createdAt: "desc" },
  });

  if (!draft) throw new Error("No hay draft configurado");
  const brief = JSON.parse(draft.briefJson || "{}");

  // Limpiar propuestas anteriores
  await prisma.aIGenerationProposal.deleteMany({
    where: { draftId: draft.id }
  });

  // Generamos una propuesta "real" pero automática para esta versión
  // La IA generaría este JSON en un caso real acoplada a providers (OpenAI, etc)
  const proposal1 = {
      label: "A",
      name: `Core Minimal para ${brief.brandName || "Tu marca"}`,
      style: "minimal_premium",
      summary: "Diseño extremadamente limpio enfocado en el valor del producto.",
      strengthsJson: JSON.stringify(["Alta percepcion de marca", "Carga ultra rapida"]),
      outputJson: JSON.stringify({
        suggestedHeroText: `Descubrí el universo de ${brief.brandName || "nuestra tienda"}.`,
        homepageBlocks: ["hero", "featured_products", "benefits", "newsletter"]
      })
  };

  const proposal2 = {
    label: "B",
    name: "Edición Alta Conversión",
    style: "high_conversion",
    summary: "Layout diseñado para guiar al usuario directamente al carrito.",
    strengthsJson: JSON.stringify(["Maximiza conversion", "Excelente para móvil"]),
    outputJson: JSON.stringify({
      suggestedHeroText: `La colección exclusiva de ${brief.brandName || "tu tienda"} esperándote.`,
      homepageBlocks: ["hero", "benefits", "featured_products", "testimonials", "faq"]
    })
  };

  await prisma.aIGenerationProposal.createMany({
    data: [
      { draftId: draft.id, ...proposal1 },
      { draftId: draft.id, ...proposal2 }
    ]
  });

  await prisma.aIGenerationDraft.update({
    where: { id: draft.id },
    data: { status: "generated" }
  });

  revalidatePath("/admin/ai/store-builder");
  return { success: true };
}

export async function selectProposalAction(storeId: string, proposalId: string) {
  const draft = await prisma.aIGenerationDraft.findFirst({
    where: { storeId },
    orderBy: { createdAt: "desc" },
  });
  if (!draft) throw new Error("Draft no encontrado");

  await prisma.aIGenerationDraft.update({
    where: { id: draft.id },
    data: { selectedProposalId: proposalId },
  });

  revalidatePath("/admin/ai/store-builder");
  return { success: true };
}

export async function applyAIProposalToStoreAction(storeId: string) {
  const authStoreId = await getAdminStoreId();
  if (!authStoreId) throw new Error("Sesión inválida o tienda no encontrada.");
  if (authStoreId !== storeId) throw new Error("Acceso denegado: no podés aplicar propuestas en una tienda ajena.");

  const draft = await prisma.aIGenerationDraft.findFirst({
    where: { storeId },
    orderBy: { createdAt: "desc" },
    include: { proposals: true }
  });

  if (!draft || !draft.selectedProposalId) throw new Error("No hay propuesta seleccionada o no existe borrador.");
  if (draft.status === "applied") throw new Error("Esta propuesta ya fue volcada a producción anteriormente.");

  const proposal = draft.proposals.find(p => p.id === draft.selectedProposalId);
  if (!proposal) throw new Error("La propuesta elegida no existe en los registros de la IA.");

  const brief = JSON.parse(draft.briefJson || "{}");
  const output = JSON.parse(proposal.outputJson || "{}");
  
  const blocksToCreate = (output.homepageBlocks || []).map((bType: string, idx: number) => {
    // defaults básicos estructurados para asegurar integridad
    const defaults = {
        title: bType === "hero" ? output.suggestedHeroText : (bType === "featured_products" ? "Productos Destacados" : "Sección de Tienda"),
        subtitle: "Contenido base generado por IA de Nexora."
    };

    return {
      storeId,
      pageType: "home",
      blockType: bType,
      sortOrder: idx,
      isVisible: true,
      settingsJson: JSON.stringify(defaults),
      source: "ai",
      state: "draft" // Blocks remain draft until user triggers Store Publish
    };
  });

  await prisma.$transaction(async (tx) => {
    // Guardar Branding Real
    await tx.storeBranding.upsert({
      where: { storeId },
      update: {
        primaryColor: brief.primaryColor || "#0F172A",
        secondaryColor: brief.secondaryColor || "#E2E8F0",
        fontFamily: brief.typography || "Inter",
        tone: brief.copyTone || "Elegante",
      },
      create: {
        storeId,
        primaryColor: brief.primaryColor || "#0F172A",
        secondaryColor: brief.secondaryColor || "#E2E8F0",
        fontFamily: brief.typography || "Inter",
        tone: brief.copyTone || "Elegante",
      }
    });

    // Guardar config núcleo
    await tx.store.update({
      where: { id: storeId },
      data: {
        name: brief.brandName || "Mi Tienda",
        currency: brief.currency || "ARS",
      }
    });

    // Forzar la creación del StoreTheme
    await tx.storeTheme.upsert({
       where: { storeId },
       update: {
         activeTheme: proposal.style === "minimal_premium" ? "minimal" : "classic",
       },
       create: {
         storeId,
         activeTheme: proposal.style === "minimal_premium" ? "minimal" : "classic",
         isPublished: false,
       }
    });

    // Purgar y recrear render elements (Solo la Home por ahora, de forma atómica y segura)
    await tx.storeBlock.deleteMany({ where: { storeId, pageType: "home", source: "ai" } }); // Solo sobreescribe ai blocks

    if (blocksToCreate.length > 0) {
      await tx.storeBlock.createMany({ data: blocksToCreate });
    }

    // Clausurar draft
    await tx.aIGenerationDraft.update({
      where: { id: draft.id },
      data: { status: "applied" }
    });

    // Auditable System Event
    await tx.systemEvent.create({
       data: {
         storeId,
         entityType: "store",
         entityId: storeId,
         eventType: "ai_store_applied",
         severity: "info",
         source: "nexora_ai",
         message: `La propuesta IA "${proposal.name}" ha sido volcada a la tienda en etapa borrador.`,
         metadataJson: JSON.stringify({ draftId: draft.id, proposalId: proposal.id }),
       }
    });
  });

  const storeInfo = await prisma.store.findUnique({ where: { id: storeId }, select: { slug: true }});
  
  revalidatePath("/admin/ai/store-builder");
  revalidatePath("/admin/store");
  
  if (storeInfo?.slug) {
     revalidatePath(`/${storeInfo.slug}`);
     revalidatePath(`/${storeInfo.slug}/[...slug]`, "page");
  }
  
  return { success: true };
}
