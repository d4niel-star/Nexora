import { notFound } from "next/navigation";
import { StoreHeader } from "@/components/storefront/layout/StoreHeader";
import { StoreFooter } from "@/components/storefront/layout/StoreFooter";
import { getStorefrontData } from "@/lib/store-engine/queries";
import { getCart } from "@/lib/store-engine/cart/queries";
import { normalizeStorefrontHref } from "@/lib/store-engine/urls";
import type { StoreConfig } from "@/types/storefront";

export default async function StorefrontLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ storeSlug: string }>;
}) {
  const resolvedParams = await params;
  const storefrontData = await getStorefrontData(resolvedParams.storeSlug);

  if (!storefrontData) {
    notFound();
  }

  const config: StoreConfig = {
    slug: storefrontData.store.slug,
    name: storefrontData.store.name,
    logoUrl: storefrontData.branding.logoUrl ?? storefrontData.store.logo ?? undefined,
    description: storefrontData.store.description ?? `${storefrontData.store.name} en Nexora`,
    currency: storefrontData.store.currency,
    primaryColor: storefrontData.branding.primaryColor,
    secondaryColor: storefrontData.branding.secondaryColor,
    headerNavigation: storefrontData.headerNavigation.map((item) => ({
      label: item.label,
      href: normalizeStorefrontHref(item.href, storefrontData.store.slug),
    })),
    footerNavigation: storefrontData.footerNavigation.map((group) => ({
      title: group.group
        .replace("footer_", "")
        .replace(/^\w/, (char) => char.toUpperCase()),
      items: group.items.map((item) => ({
        label: item.label,
        href: normalizeStorefrontHref(item.href, storefrontData.store.slug),
      })),
    })),
    cartItemCount: 0,
  };

  const cart = await getCart(storefrontData.store.id);
  config.cartItemCount = cart?.totalQuantity ?? 0;

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-black selection:text-white flex flex-col">
      <StoreHeader config={config} />
      <main className="flex-1">{children}</main>
      <StoreFooter config={config} />
    </div>
  );
}
