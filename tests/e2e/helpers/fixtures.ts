import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// ─── Read-only DB helpers for E2E ───────────────────────────────────────
//
// These helpers only READ from the dev DB. Mutations are confined to
// `auth.setup.ts`. Tests use these to discover slugs / order numbers /
// product IDs they need to navigate to without hardcoding fixture data
// in the suite. Every helper falls back to `null` when no row exists so
// the calling spec can `test.skip` cleanly.

let cachedClient: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (cachedClient) return cachedClient;

  const rawConnectionString = process.env.DATABASE_URL;
  if (!rawConnectionString) {
    throw new Error("[fixtures] DATABASE_URL is not set");
  }
  // Mirror src/lib/db/prisma.ts: hosted Postgres providers (Render etc.)
  // require sslmode=require on external connections.
  const isRemote =
    !rawConnectionString.includes("localhost") &&
    !rawConnectionString.includes("127.0.0.1");
  const connectionString =
    isRemote && !rawConnectionString.includes("sslmode=")
      ? `${rawConnectionString}${rawConnectionString.includes("?") ? "&" : "?"}sslmode=require`
      : rawConnectionString;
  const adapter = new PrismaPg({ connectionString });
  cachedClient = new PrismaClient({ adapter });
  return cachedClient;
}

export async function disconnectPrisma(): Promise<void> {
  if (!cachedClient) return;
  await cachedClient.$disconnect();
  cachedClient = null;
}

export async function getActiveStoreSlug(): Promise<string | null> {
  const prisma = getPrisma();
  const store =
    (await prisma.store.findFirst({
      where: { active: true },
      orderBy: { createdAt: "asc" },
      select: { slug: true },
    })) ??
    (await prisma.store.findFirst({
      orderBy: { createdAt: "asc" },
      select: { slug: true },
    }));
  return store?.slug ?? null;
}

export async function getPublishedProductHandle(storeSlug: string): Promise<{
  productId: string;
  handle: string;
} | null> {
  const prisma = getPrisma();
  const store = await prisma.store.findUnique({
    where: { slug: storeSlug },
    select: { id: true },
  });
  if (!store) return null;

  const product = await prisma.product.findFirst({
    where: { storeId: store.id, isPublished: true, status: "published" },
    orderBy: { createdAt: "asc" },
    select: { id: true, handle: true },
  });
  return product ? { productId: product.id, handle: product.handle } : null;
}

export async function getAnyOrderNumber(): Promise<string | null> {
  const prisma = getPrisma();
  const order = await prisma.order.findFirst({
    orderBy: { createdAt: "desc" },
    select: { orderNumber: true },
  });
  return order?.orderNumber ?? null;
}
