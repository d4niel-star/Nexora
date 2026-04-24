import { prisma } from "@/lib/db/prisma";
import type { StorefrontData, BlockType, AdminStoreSummary, AdminStoreInitialData } from "@/types/store-engine";
import { getCurrentStore } from "@/lib/auth/session";
import { storePath } from "@/lib/store-engine/urls";

// ─── Get store by slug or hostname ───

export async function getStoreBySlug(domainOrSlug: string) {
  // First attempt simple slug or subdomain
  let store = await prisma.store.findFirst({
    where: {
      active: true,
      OR: [
        { slug: domainOrSlug },
        { subdomain: domainOrSlug },
        { customDomain: domainOrSlug },
      ]
    },
    include: {
      branding: true,
      theme: true,
    },
  });

  // If not found, try Custom Domains
  if (!store && domainOrSlug.includes(".")) {
    const customDomain = await prisma.storeDomain.findUnique({
      where: { hostname: domainOrSlug },
      include: { store: { include: { branding: true, theme: true } } }
    });
    if (customDomain?.store.active) store = customDomain.store;
  }

  return store;
}

// ─── Get full storefront data (published view) ───

export async function getStorefrontData(domainOrSlug: string): Promise<StorefrontData | null> {
  let store = await prisma.store.findFirst({
    where: {
      active: true,
      OR: [
        { slug: domainOrSlug },
        { subdomain: domainOrSlug },
        { customDomain: domainOrSlug },
      ]
    },
    include: {
      branding: true,
      theme: true,
      navigations: {
        where: { isVisible: true },
        orderBy: { sortOrder: "asc" },
      },
      blocks: {
        where: {
          pageType: "home",
          isVisible: true,
          state: "published",
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!store && domainOrSlug.includes(".")) {
     const customDomain = await prisma.storeDomain.findUnique({
       where: { hostname: domainOrSlug }
     });
     if (customDomain) {
       store = await prisma.store.findFirst({
         where: { id: customDomain.storeId, active: true },
         include: {
           branding: true,
           theme: true,
           navigations: { where: { isVisible: true }, orderBy: { sortOrder: "asc" } },
           blocks: { where: { pageType: "home", isVisible: true, state: "published" }, orderBy: { sortOrder: "asc" } },
         }
       });
     }
  }

  if (!store) return null;

  // Group footer navigation by group
  const headerNav = store.navigations.filter((n) => n.group === "header");
  const footerGroups = store.navigations
    .filter((n) => n.group.startsWith("footer"))
    .reduce<Record<string, typeof store.navigations>>((acc, nav) => {
      const group = nav.group;
      if (!acc[group]) acc[group] = [];
      acc[group].push(nav);
      return acc;
    }, {});

  return {
    store: {
      id: store.id,
      slug: store.slug,
      name: store.name,
      description: store.description,
      logo: store.logo,
      customDomain: store.customDomain,
      active: store.active,
      status: store.status,
      locale: store.locale,
      currency: store.currency,
    },
    branding: store.branding
      ? {
          logoUrl: store.branding.logoUrl,
          faviconUrl: store.branding.faviconUrl,
          primaryColor: store.branding.primaryColor,
          secondaryColor: store.branding.secondaryColor,
          fontFamily: store.branding.fontFamily,
          tone: store.branding.tone,
          buttonStyle: store.branding.buttonStyle,
        }
      : {
          logoUrl: null,
          faviconUrl: null,
          primaryColor: "#0F172A",
          secondaryColor: "#E2E8F0",
          fontFamily: "Inter",
          tone: "professional",
          buttonStyle: "rounded-sm",
        },
    theme: store.theme
      ? {
          activeTheme: store.theme.activeTheme,
          themeVariant: store.theme.themeVariant,
          isPublished: store.theme.isPublished,
        }
      : {
          activeTheme: "minimal",
          themeVariant: "light",
          isPublished: false,
        },
    headerNavigation: headerNav.map((n) => ({
      id: n.id,
      label: n.label,
      href: n.href,
      sortOrder: n.sortOrder,
    })),
    footerNavigation: Object.entries(footerGroups).map(([group, items]) => ({
      group,
      items: items.map((n) => ({
        id: n.id,
        label: n.label,
        href: n.href,
        sortOrder: n.sortOrder,
      })),
    })),
    homeBlocks: store.blocks.map((b) => {
      let settings: Record<string, unknown> = {};
      try {
        settings = JSON.parse(b.settingsJson);
      } catch {
        settings = {};
      }
      return {
        id: b.id,
        blockType: b.blockType as BlockType,
        sortOrder: b.sortOrder,
        settings,
        source: b.source,
      };
    }),
  };
}

// ─── Get branding ───

export async function getStoreBranding(storeId: string) {
  return prisma.storeBranding.findUnique({
    where: { storeId },
  });
}

// ─── Get navigation ───

export async function getStoreNavigation(storeId: string) {
  return prisma.storeNavigation.findMany({
    where: { storeId },
    orderBy: { sortOrder: "asc" },
  });
}

// ─── Get home blocks ───

export async function getHomeBlocks(storeId: string) {
  const blocks = await prisma.storeBlock.findMany({
    where: { storeId, pageType: "home" },
    orderBy: { sortOrder: "asc" },
  });

  return blocks.map((b) => {
    let settings: Record<string, unknown> = {};
    try {
      settings = JSON.parse(b.settingsJson);
    } catch {
      settings = {};
    }
    return {
      ...b,
      settings,
    };
  });
}

// ─── Get admin store summary ───

export async function getAdminStoreSummary(storeId: string): Promise<AdminStoreSummary | null> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: {
      branding: true,
      theme: true,
      _count: {
        select: {
          navigations: true,
          pages: true,
          blocks: { where: { pageType: "home" } },
        },
      },
      snapshots: {
        orderBy: { publishedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!store) return null;

  const lastSnapshot = store.snapshots[0] ?? null;

  return {
    store: {
      id: store.id,
      slug: store.slug,
      name: store.name,
      description: store.description,
      logo: store.logo,
      status: store.status,
      active: store.active,
      subdomain: store.subdomain,
      primaryDomain: store.primaryDomain,
    },
    branding: store.branding
      ? {
          logoUrl: store.branding.logoUrl,
          faviconUrl: store.branding.faviconUrl,
          primaryColor: store.branding.primaryColor,
          secondaryColor: store.branding.secondaryColor,
          fontFamily: store.branding.fontFamily,
          buttonStyle: store.branding.buttonStyle,
        }
      : null,
    theme: store.theme
      ? {
          activeTheme: store.theme.activeTheme,
          themeVariant: store.theme.themeVariant,
          isPublished: store.theme.isPublished,
        }
      : null,
    navigationCount: store._count.navigations,
    pagesCount: store._count.pages,
    homeBlocksCount: store._count.blocks,
    lastPublishedAt: lastSnapshot?.publishedAt.toISOString() ?? null,
    hasUnpublishedChanges: lastSnapshot
      ? store.updatedAt > lastSnapshot.publishedAt
      : true,
  };
}

// ─── Get store pages ───

export async function getStorePages(storeId: string) {
  return prisma.storePage.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Get first store (default store shortcut) ───

export async function getDefaultStore() {
  return getCurrentStore();
}

// ─── Get full admin initial data (single query, serializable) ───

export async function getAdminStoreInitialData(): Promise<AdminStoreInitialData | null> {
  const currentStore = await getCurrentStore();
  if (!currentStore) return null;

  const store = await prisma.store.findUnique({
    where: { id: currentStore.id },
    include: {
      branding: true,
      theme: true,
      navigations: { orderBy: { sortOrder: "asc" } },
      pages: { orderBy: { createdAt: "desc" } },
      blocks: { where: { pageType: "home" }, orderBy: { sortOrder: "asc" } },
      snapshots: { orderBy: { publishedAt: "desc" }, take: 1 },
      domains: { orderBy: { isPrimary: "desc" } },
      paymentProviders: {
        orderBy: { updatedAt: "desc" },
      },
      _count: {
        select: { products: true },
      },
    },
  });

  if (!store) return null;

  const lastSnapshot = store.snapshots[0] ?? null;
  const [publishedProducts, sellableProducts, previewProduct, previewCollection] = await Promise.all([
    prisma.product.count({
      where: { storeId: store.id, isPublished: true, status: { not: "archived" } },
    }),
    prisma.product.count({
      where: {
        storeId: store.id,
        isPublished: true,
        status: { not: "archived" },
        variants: { some: { stock: { gt: 0 } } },
      },
    }),
    prisma.product.findFirst({
      where: {
        storeId: store.id,
        isPublished: true,
        status: { not: "archived" },
        variants: { some: { stock: { gt: 0 } } },
      },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      select: { handle: true, title: true },
    }),
    prisma.collection.findFirst({
      where: { storeId: store.id, isPublished: true },
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
      select: { handle: true, title: true },
    }),
  ]);
  const paymentProvider =
    store.paymentProviders.find((p) => p.provider === "mercadopago") ?? null;
  const paymentProviders = store.paymentProviders.map((p) => ({
    provider: p.provider,
    status: p.status,
    publicKey: p.publicKey,
    externalAccountId: p.externalAccountId,
    accountEmail: p.accountEmail,
    connectedAt: p.connectedAt?.toISOString() ?? null,
    lastValidatedAt: p.lastValidatedAt?.toISOString() ?? null,
    lastError: p.lastError,
    config: ((): Record<string, unknown> => {
      if (!p.configJson) return {};
      try {
        const parsed = JSON.parse(p.configJson);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? (parsed as Record<string, unknown>)
          : {};
      } catch {
        return {};
      }
    })(),
  }));

  const summary: AdminStoreSummary = {
    store: {
      id: store.id,
      slug: store.slug,
      name: store.name,
      description: store.description,
      logo: store.logo,
      status: store.status,
      active: store.active,
      subdomain: store.subdomain,
      primaryDomain: store.primaryDomain,
    },
    branding: store.branding
      ? {
          logoUrl: store.branding.logoUrl,
          faviconUrl: store.branding.faviconUrl,
          primaryColor: store.branding.primaryColor,
          secondaryColor: store.branding.secondaryColor,
          fontFamily: store.branding.fontFamily,
          buttonStyle: store.branding.buttonStyle,
        }
      : null,
    theme: store.theme
      ? {
          activeTheme: store.theme.activeTheme,
          themeVariant: store.theme.themeVariant,
          isPublished: store.theme.isPublished,
        }
      : null,
    navigationCount: store.navigations.length,
    pagesCount: store.pages.length,
    homeBlocksCount: store.blocks.length,
    lastPublishedAt: lastSnapshot?.publishedAt.toISOString() ?? null,
    hasUnpublishedChanges: lastSnapshot
      ? store.updatedAt > lastSnapshot.publishedAt
      : true,
  };

  return {
    store: {
      id: store.id,
      slug: store.slug,
      name: store.name,
      description: store.description,
      logo: store.logo,
      status: store.status,
      active: store.active,
      subdomain: store.subdomain,
      primaryDomain: store.primaryDomain,
    },
    publicUrl: storePath(store.slug),
    counts: {
      products: store._count.products,
      publishedProducts,
      sellableProducts,
    },
    paymentProvider: paymentProvider
      ? {
          provider: paymentProvider.provider,
          status: paymentProvider.status,
          publicKey: paymentProvider.publicKey,
          externalAccountId: paymentProvider.externalAccountId,
          accountEmail: paymentProvider.accountEmail,
          connectedAt: paymentProvider.connectedAt?.toISOString() ?? null,
          lastValidatedAt: paymentProvider.lastValidatedAt?.toISOString() ?? null,
        }
      : null,
    paymentProviders,
    branding: store.branding
      ? {
          logoUrl: store.branding.logoUrl,
          faviconUrl: store.branding.faviconUrl,
          primaryColor: store.branding.primaryColor,
          secondaryColor: store.branding.secondaryColor,
          fontFamily: store.branding.fontFamily,
          tone: store.branding.tone,
          buttonStyle: store.branding.buttonStyle,
        }
      : null,
    theme: store.theme
      ? {
          activeTheme: store.theme.activeTheme,
          themeVariant: store.theme.themeVariant,
          isPublished: store.theme.isPublished,
        }
      : null,
    navigation: store.navigations.map((n) => ({
      id: n.id,
      group: n.group,
      label: n.label,
      href: n.href,
      sortOrder: n.sortOrder,
      isVisible: n.isVisible,
    })),
    homeBlocks: store.blocks.map((b) => {
      let settings: Record<string, unknown> = {};
      try {
        settings = JSON.parse(b.settingsJson);
      } catch {
        settings = {};
      }
      return {
        id: b.id,
        blockType: b.blockType,
        sortOrder: b.sortOrder,
        isVisible: b.isVisible,
        settings,
        source: b.source,
        state: b.state,
      };
    }),
    pages: store.pages.map((p) => ({
      id: p.id,
      type: p.type,
      title: p.title,
      slug: p.slug,
      status: p.status,
      updatedAt: p.updatedAt.toISOString(),
    })),
    domains: store.domains.map((d) => ({
      id: d.id,
      hostname: d.hostname,
      type: d.type,
      status: d.status,
      isPrimary: d.isPrimary,
      createdAt: d.createdAt.toISOString()
    })),
    preview: {
      product: previewProduct,
      collection: previewCollection,
    },
    summary,
  };
}

// ─── Get Custom Domains for Store ───
export async function getStoreDomains(storeId: string) {
  return prisma.storeDomain.findMany({
    where: { storeId },
    orderBy: { isPrimary: "desc" }
  });
}
