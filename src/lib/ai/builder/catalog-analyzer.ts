// ─── Catalog Analyzer ───
// Deterministic analysis of real catalog data. No AI, no inventions.
// Detects actionable issues per-product/variant and returns direct fix links.

import { prisma } from "@/lib/db/prisma";
import type {
  CatalogAnalysisReport,
  CatalogIssue,
  CatalogIssueType,
} from "./types";

const MIN_DESCRIPTION_CHARS = 80;

export async function analyzeCatalog(storeId: string): Promise<CatalogAnalysisReport> {
  const products = await prisma.product.findMany({
    where: { storeId },
    select: {
      id: true,
      handle: true,
      title: true,
      description: true,
      featuredImage: true,
      isPublished: true,
      images: { select: { id: true }, take: 1 },
      variants: {
        select: {
          id: true,
          title: true,
          stock: true,
          price: true,
          trackInventory: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const issues: CatalogIssue[] = [];

  for (const p of products) {
    const fixHref = `/admin/catalog/${p.id}`;

    // missing_description
    if (!p.description || p.description.trim().length === 0) {
      issues.push({
        type: "missing_description",
        severity: "critical",
        productId: p.id,
        productTitle: p.title,
        productHandle: p.handle,
        message: "Este producto no tiene descripción. Los compradores necesitan información para decidir.",
        actionHref: fixHref,
        actionLabel: "Agregar descripción",
      });
    } else if (p.description.trim().length < MIN_DESCRIPTION_CHARS) {
      issues.push({
        type: "short_description",
        severity: "warning",
        productId: p.id,
        productTitle: p.title,
        productHandle: p.handle,
        message: `La descripción es muy corta (${p.description.trim().length} caracteres). Sugerencia: ampliar a al menos ${MIN_DESCRIPTION_CHARS} caracteres con beneficios y detalles técnicos.`,
        actionHref: fixHref,
        actionLabel: "Ampliar descripción",
      });
    }

    // no_image
    const hasFeatured = !!p.featuredImage && p.featuredImage.trim().length > 0;
    const hasGalleryImage = p.images.length > 0;
    if (!hasFeatured && !hasGalleryImage) {
      issues.push({
        type: "no_image",
        severity: "critical",
        productId: p.id,
        productTitle: p.title,
        productHandle: p.handle,
        message: "El producto no tiene imagen. Los productos sin foto prácticamente no venden.",
        actionHref: fixHref,
        actionLabel: "Subir imagen",
      });
    }

    // unpublished_with_stock
    const totalStock = p.variants.reduce((acc, v) => acc + (v.stock ?? 0), 0);
    if (!p.isPublished && totalStock > 0) {
      issues.push({
        type: "unpublished_with_stock",
        severity: "info",
        productId: p.id,
        productTitle: p.title,
        productHandle: p.handle,
        message: `Tenés ${totalStock} unidades en stock pero el producto está en borrador. No se está vendiendo.`,
        actionHref: fixHref,
        actionLabel: "Publicar producto",
      });
    }

    // variant_without_stock + variant_without_price
    for (const v of p.variants) {
      if (v.trackInventory && v.stock === 0) {
        issues.push({
          type: "variant_without_stock",
          severity: p.isPublished ? "critical" : "warning",
          productId: p.id,
          productTitle: p.title,
          productHandle: p.handle,
          variantId: v.id,
          variantTitle: v.title,
          message: `Variante "${v.title}" sin stock${p.isPublished ? " (y el producto está publicado — se ve agotado)" : ""}.`,
          actionHref: `/admin/inventory`,
          actionLabel: "Cargar stock",
        });
      }
      if (!v.price || v.price <= 0) {
        issues.push({
          type: "variant_without_price",
          severity: "critical",
          productId: p.id,
          productTitle: p.title,
          productHandle: p.handle,
          variantId: v.id,
          variantTitle: v.title,
          message: `Variante "${v.title}" sin precio válido. No se puede vender.`,
          actionHref: fixHref,
          actionLabel: "Configurar precio",
        });
      }
    }
  }

  const issuesByType = issues.reduce(
    (acc, i) => {
      acc[i.type] = (acc[i.type] ?? 0) + 1;
      return acc;
    },
    {} as Record<CatalogIssueType, number>
  );

  // Ensure all keys present
  const allTypes: CatalogIssueType[] = [
    "missing_description",
    "short_description",
    "no_image",
    "variant_without_stock",
    "variant_without_price",
    "unpublished_with_stock",
  ];
  for (const t of allTypes) if (!(t in issuesByType)) issuesByType[t] = 0;

  const severityRank: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  issues.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  return {
    totalProducts: products.length,
    totalIssues: issues.length,
    issuesByType,
    issues,
    generatedAt: new Date().toISOString(),
  };
}
