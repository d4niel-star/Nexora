import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

// ─── Storefront Search API ───────────────────────────────────────────────
// Server-side product search for the storefront search overlay.
// Returns up to 12 results matching title, category, or description.
// Used by the client-side SearchOverlay component.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeSlug: string }> },
) {
  const { storeSlug } = await params;
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const store = await prisma.store.findUnique({
    where: { slug: storeSlug },
    select: { id: true },
  });

  if (!store) {
    return NextResponse.json({ results: [] });
  }

  const products = await prisma.product.findMany({
    where: {
      storeId: store.id,
      isPublished: true,
      status: { not: "archived" },
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      handle: true,
      title: true,
      category: true,
      price: true,
      compareAtPrice: true,
      featuredImage: true,
      variants: {
        where: { stock: { gt: 0 } },
        select: { id: true },
        take: 1,
      },
    },
    orderBy: { title: "asc" },
    take: 12,
  });

  const results = products.map((p) => ({
    id: p.id,
    handle: p.handle,
    title: p.title,
    category: p.category,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    image: p.featuredImage,
    inStock: p.variants.length > 0,
  }));

  return NextResponse.json({ results });
}
