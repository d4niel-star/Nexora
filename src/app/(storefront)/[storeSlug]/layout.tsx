import { StoreHeader } from "@/components/storefront/layout/StoreHeader";
import { StoreFooter } from "@/components/storefront/layout/StoreFooter";
import { getStorefrontData } from "@/lib/store-engine/queries";
import { getCart } from "@/lib/store-engine/cart/queries";
import type { StoreConfig } from "@/types/storefront";
import { notFound } from "next/navigation";

export default async function StorefrontLayout({ children, params }: { children: React.ReactNode, params: Promise<{ storeSlug: string }> }) {
  const resolvedParams = await params;
  const storefrontData = await getStorefrontData(resolvedParams.storeSlug);

  // If no store found in DB, check if it matches the mock slug as fallback
  if (!storefrontData) {
    notFound();
  }

  // Build StoreConfig from real DB data
  const config: StoreConfig = {
    slug: storefrontData.store.slug,
    name: storefrontData.store.name,
    logoUrl: storefrontData.branding.logoUrl ?? undefined,
    description: `${storefrontData.store.name} — Tu tienda en Nexora`,
    currency: storefrontData.store.currency,
    primaryColor: storefrontData.branding.primaryColor,
    secondaryColor: storefrontData.branding.secondaryColor,
    headerNavigation: storefrontData.headerNavigation.map((n) => ({
      label: n.label,
      href: n.href,
    })),
    footerNavigation: storefrontData.footerNavigation.map((group) => ({
      title: group.group
        .replace("footer_", "")
        .replace(/^\w/, (c) => c.toUpperCase()),
      items: group.items.map((item) => ({
        label: item.label,
        href: item.href,
      })),
    })),
    cartItemCount: 0, // Fallback, will be replaced
  };

  const cart = await getCart(storefrontData.store.id);
  config.cartItemCount = cart?.totalQuantity ?? 0;

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-black selection:text-white flex flex-col">
      <StoreHeader config={config} />
      <main className="flex-1">
        {children}
      </main>
      <StoreFooter config={config} />
    </div>
  );
}
