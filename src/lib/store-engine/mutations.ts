import { prisma } from "@/lib/db/prisma";
import type { BlockType, AIStoreInput } from "@/types/store-engine";
import { getDefaultBlockSettings } from "@/lib/store-engine/blocks/defaults";

// ─── Update branding ───

export async function updateStoreBranding(
  storeId: string,
  data: {
    logoUrl?: string | null;
    faviconUrl?: string | null;
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    tone?: string;
    buttonStyle?: string;
  }
) {
  return prisma.storeBranding.upsert({
    where: { storeId },
    update: data,
    create: {
      storeId,
      ...data,
    },
  });
}

// ─── Update navigation ───

export async function updateStoreNavigation(
  storeId: string,
  items: Array<{
    id?: string;
    group: string;
    label: string;
    href: string;
    sortOrder: number;
    isVisible: boolean;
  }>
) {
  // Delete existing, then recreate (simple strategy for now)
  await prisma.storeNavigation.deleteMany({ where: { storeId } });

  return prisma.storeNavigation.createMany({
    data: items.map((item) => ({
      storeId,
      group: item.group,
      label: item.label,
      href: item.href,
      sortOrder: item.sortOrder,
      isVisible: item.isVisible,
    })),
  });
}

// ─── Update home blocks ───

export async function updateHomeBlocks(
  storeId: string,
  blocks: Array<{
    id?: string;
    blockType: BlockType;
    sortOrder: number;
    isVisible: boolean;
    settingsJson: string;
    source?: string;
    state?: string;
  }>
) {
  // Delete existing home blocks, then recreate
  await prisma.storeBlock.deleteMany({
    where: { storeId, pageType: "home" },
  });

  return prisma.storeBlock.createMany({
    data: blocks.map((b) => ({
      storeId,
      pageType: "home",
      blockType: b.blockType,
      sortOrder: b.sortOrder,
      isVisible: b.isVisible,
      settingsJson: b.settingsJson,
      source: b.source ?? "manual",
      state: b.state ?? "published",
    })),
  });
}

// ─── Publish store (create snapshot) ───

export async function publishStore(storeId: string) {
  // Fetch full current state
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: {
      branding: true,
      theme: true,
      navigations: true,
      pages: true,
      blocks: true,
    },
  });

  if (!store) throw new Error("Store not found");

  // Update store status
  await prisma.store.update({
    where: { id: storeId },
    data: { status: "active" },
  });

  // Update theme published state
  if (store.theme) {
    await prisma.storeTheme.update({
      where: { storeId },
      data: { isPublished: true, themeStatus: "published" },
    });
  }

  // Publish all draft blocks
  await prisma.storeBlock.updateMany({
    where: { storeId, state: "draft" },
    data: { state: "published" },
  });

  // Create snapshot
  const snapshot = await prisma.storePublishSnapshot.create({
    data: {
      storeId,
      snapshotJson: JSON.stringify({
        store: {
          id: store.id,
          slug: store.slug,
          name: store.name,
          locale: store.locale,
          currency: store.currency,
        },
        branding: store.branding,
        theme: store.theme,
        navigations: store.navigations,
        pages: store.pages,
        blocks: store.blocks,
        publishedAt: new Date().toISOString(),
      }),
    },
  });

  return snapshot;
}

// ─── Save draft (mark store as draft) ───

export async function saveDraft(storeId: string) {
  return prisma.store.update({
    where: { id: storeId },
    data: { status: "draft" },
  });
}

// ─── Generate store draft from AI input ───

export async function generateStoreDraftFromAIInput(input: AIStoreInput) {
  const slug = input.brandName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  // Check if store already exists
  const existing = await prisma.store.findUnique({ where: { slug } });

  const storeId = existing?.id ?? undefined;

  // Use a transaction to create/update all store data at once
  const store = await prisma.store.upsert({
    where: { slug },
    update: {
      name: input.brandName,
      status: "draft",
      locale: input.country === "Argentina" ? "es-AR" : "es",
      currency: input.currency,
    },
    create: {
      slug,
      name: input.brandName,
      status: "draft",
      locale: input.country === "Argentina" ? "es-AR" : "es",
      currency: input.currency,
      subdomain: `${slug}.nexora.app`,
    },
  });

  // Upsert branding
  await prisma.storeBranding.upsert({
    where: { storeId: store.id },
    update: {
      primaryColor: input.primaryColor,
      secondaryColor: input.secondaryColor,
      fontFamily: input.fontFamily,
      tone: input.brandTone,
    },
    create: {
      storeId: store.id,
      primaryColor: input.primaryColor,
      secondaryColor: input.secondaryColor,
      fontFamily: input.fontFamily,
      tone: input.brandTone,
    },
  });

  // Upsert theme
  await prisma.storeTheme.upsert({
    where: { storeId: store.id },
    update: {
      activeTheme: input.styleCategory === "minimal_premium"
        ? "minimal"
        : input.styleCategory === "high_conversion"
        ? "bold"
        : "classic",
      themeStatus: "draft",
      isPublished: false,
    },
    create: {
      storeId: store.id,
      activeTheme: input.styleCategory === "minimal_premium"
        ? "minimal"
        : input.styleCategory === "high_conversion"
        ? "bold"
        : "classic",
      themeStatus: "draft",
      isPublished: false,
    },
  });

  // Delete existing nav and blocks for fresh generation
  await prisma.storeNavigation.deleteMany({ where: { storeId: store.id } });
  await prisma.storeBlock.deleteMany({ where: { storeId: store.id } });

  // Generate navigation
  const defaultNav = [
    { group: "header", label: "Shop All", href: `/${slug}/collections`, sortOrder: 0 },
    { group: "header", label: "Best Sellers", href: `/${slug}/collections/best-sellers`, sortOrder: 1 },
    { group: "header", label: "Nosotros", href: `/${slug}/about`, sortOrder: 2 },
    { group: "header", label: "Tracking", href: `/${slug}/tracking`, sortOrder: 3 },
    { group: "footer_shop", label: "Ver todo", href: `/${slug}/collections`, sortOrder: 0 },
    { group: "footer_shop", label: "Ofertas", href: `/${slug}/collections/ofertas`, sortOrder: 1 },
    { group: "footer_support", label: "Contacto", href: `/${slug}/contact`, sortOrder: 0 },
    { group: "footer_support", label: "FAQ", href: `/${slug}/faq`, sortOrder: 1 },
    { group: "footer_support", label: "Devoluciones", href: `/${slug}/policies/returns`, sortOrder: 2 },
  ];

  await prisma.storeNavigation.createMany({
    data: defaultNav.map((n) => ({
      storeId: store.id,
      ...n,
      isVisible: true,
    })),
  });

  // Generate home blocks from AI suggestions
  const blocksToCreate = input.suggestedHomepageBlocks.map((blockType, idx) => {
    const defaults = getDefaultBlockSettings(blockType, {
      brandName: input.brandName,
      heroText: input.suggestedHeroText,
      storeSlug: slug,
    });

    return {
      storeId: store.id,
      pageType: "home",
      blockType,
      sortOrder: idx,
      isVisible: true,
      settingsJson: JSON.stringify(defaults),
      source: "ai",
      state: "draft",
    };
  });

  await prisma.storeBlock.createMany({ data: blocksToCreate });

  // Create default pages
  await prisma.storePage.deleteMany({ where: { storeId: store.id } });
  await prisma.storePage.createMany({
    data: [
      { storeId: store.id, type: "system", title: "Inicio", slug: "/", status: "published" },
      { storeId: store.id, type: "system", title: "Contacto", slug: "/contacto", status: "published" },
      { storeId: store.id, type: "system", title: "FAQ", slug: "/faq", status: "published" },
      { storeId: store.id, type: "system", title: "Politica de privacidad", slug: "/privacidad", status: "published" },
      { storeId: store.id, type: "system", title: "Devoluciones", slug: "/devoluciones", status: "published" },
    ],
  });

  return store;
}
