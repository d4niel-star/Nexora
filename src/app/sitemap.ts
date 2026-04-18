import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db/prisma";
import { storePath } from "@/lib/store-engine/urls";

export const revalidate = 3600; // rebuild hourly

/**
 * Multi-tenant sitemap. Emits one entry per active store (home, products list,
 * collections list) and one entry per published product across all tenants.
 *
 * Custom domains: when a store has `primaryDomain` we emit the storefront URLs
 * under that domain. Otherwise we use `NEXT_PUBLIC_APP_URL` with the
 * `/store/<slug>` prefix.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

  const stores = await prisma.store.findMany({
    where: { active: true, status: "active" },
    select: {
      id: true,
      slug: true,
      primaryDomain: true,
      updatedAt: true,
      products: {
        where: { isPublished: true, status: { not: "archived" } },
        select: { id: true, handle: true, updatedAt: true },
      },
    },
  });

  const entries: MetadataRoute.Sitemap = [];

  // Marketing root
  entries.push({
    url: baseUrl,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  });

  for (const store of stores) {
    const origin = store.primaryDomain
      ? `https://${store.primaryDomain.replace(/^https?:\/\//, "").replace(/\/$/, "")}`
      : baseUrl;
    const prefix = store.primaryDomain ? "" : storePath(store.slug);

    // Storefront home
    entries.push({
      url: `${origin}${prefix || "/"}`,
      lastModified: store.updatedAt,
      changeFrequency: "daily",
      priority: 0.9,
    });

    // Products list
    entries.push({
      url: `${origin}${prefix}/products`,
      lastModified: store.updatedAt,
      changeFrequency: "daily",
      priority: 0.7,
    });

    for (const product of store.products) {
      const identifier = product.handle || product.id;
      entries.push({
        url: `${origin}${prefix}/products/${identifier}`,
        lastModified: product.updatedAt,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  return entries;
}
