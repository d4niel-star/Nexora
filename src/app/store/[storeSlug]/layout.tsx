import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { StoreHeader } from "@/components/storefront/layout/StoreHeader";
import { StoreFooter } from "@/components/storefront/layout/StoreFooter";
import { WhatsAppFloatingButton } from "@/components/storefront/layout/WhatsAppFloatingButton";
import { getStorefrontData } from "@/lib/store-engine/queries";
import { getCart } from "@/lib/store-engine/cart/queries";
import { normalizeStorefrontHref } from "@/lib/store-engine/urls";
import type { StoreConfig } from "@/types/storefront";
import { isTrackingWidgetActive } from "@/lib/apps/order-tracking-widget/queries";
import { getStorefrontCommunication } from "@/lib/communication/queries";
import {
  getStoreButtonRadius,
  normalizeThemeColor,
  resolveStoreFontOption,
} from "@/lib/store-engine/theme-tokens";

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

  const primaryColor = normalizeThemeColor(storefrontData.branding.primaryColor, "#07080d");
  const secondaryColor = normalizeThemeColor(storefrontData.branding.secondaryColor, "#e9ecf3");
  const fontOption = resolveStoreFontOption(storefrontData.branding.fontFamily);
  const buttonRadius = getStoreButtonRadius(storefrontData.branding.buttonStyle);

  // Fetch communication + cart + tracking in parallel
  const [cart, trackingEnabled, commData] = await Promise.all([
    getCart(storefrontData.store.id),
    isTrackingWidgetActive(storefrontData.store.id),
    getStorefrontCommunication(storefrontData.store.id),
  ]);

  const config: StoreConfig = {
    slug: storefrontData.store.slug,
    name: storefrontData.store.name,
    logoUrl: storefrontData.branding.logoUrl ?? storefrontData.store.logo ?? undefined,
    description: storefrontData.store.description ?? `${storefrontData.store.name} en Nexora`,
    currency: storefrontData.store.currency,
    primaryColor,
    secondaryColor,
    fontFamily: storefrontData.branding.fontFamily,
    tone: storefrontData.branding.tone,
    buttonStyle: storefrontData.branding.buttonStyle,
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
    cartItemCount: cart?.totalQuantity ?? 0,
    // Communication data
    contactInfo: commData.contact,
    socialLinks: commData.socialLinks,
    whatsapp: commData.whatsapp,
  };

  const storefrontStyle = {
    "--store-primary": primaryColor,
    "--store-secondary": secondaryColor,
    "--store-button-radius": buttonRadius,
    "--store-font-sans": fontOption.bodyStack,
    "--store-font-display": fontOption.displayStack,
    "--font-sans": "var(--store-font-sans)",
    "--font-display": "var(--store-font-display)",
    "--surface-1": `color-mix(in srgb, ${secondaryColor} 14%, #f7f8fb)`,
    "--surface-2": `color-mix(in srgb, ${secondaryColor} 20%, #ffffff)`,
  } as CSSProperties;

  return (
    <div
      className="flex min-h-screen flex-col bg-[var(--surface-1)] font-sans text-ink-0 selection:bg-ink-0 selection:text-ink-12"
      data-button-style={storefrontData.branding.buttonStyle}
      data-store-tone={storefrontData.branding.tone}
      data-storefront=""
      style={storefrontStyle}
    >
      <StoreHeader config={config} />
      <main className="flex-1">{children}</main>
      <StoreFooter config={config} showTrackingLink={trackingEnabled} />
      {/* WhatsApp floating button — rendered only when enabled */}
      {config.whatsapp?.buttonEnabled && config.whatsapp.number && (
        <WhatsAppFloatingButton
          number={config.whatsapp.number}
          buttonText={config.whatsapp.buttonText}
          position={config.whatsapp.buttonPosition}
        />
      )}
    </div>
  );
}

