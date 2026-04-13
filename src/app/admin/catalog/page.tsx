import { getAdminCatalog } from "@/lib/store-engine/catalog/queries";
import type { Product } from "@/types/product";
import CatalogClient from "./CatalogClient";

export default async function CatalogPage() {
  const adminProducts = await getAdminCatalog();

  // Map AdminProduct → Product type expected by UI components (drawers, badges)
  const products: Product[] = adminProducts.map((p) => ({
    id: p.id,
    image: p.image,
    title: p.title,
    category: p.category,
    status: p.status,
    supplier: p.supplier as Product["supplier"],
    price: p.price,
    cost: p.cost,
    margin: p.margin,
    totalStock: p.totalStock,
    updatedAt: p.createdAt,
    variants: p.variants.map((v) => ({
      id: v.id,
      sku: `${p.handle}-${v.title}`.toUpperCase().replace(/\s+/g, "-"),
      title: v.title,
      price: v.price,
      cost: p.cost,
      stock: v.stock,
      reservedStock: v.reservedStock,
      availableStock: v.stock - (v.reservedStock || 0),
    })),
  }));

  return <CatalogClient products={products} />;
}
