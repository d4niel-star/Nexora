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
import { getStorefrontAnalyticsConfig } from "@/lib/ads/pixels/storefront-query";
import { StorefrontAnalyticsScripts } from "@/components/storefront/analytics/StorefrontAnalyticsScripts";
import {
  getStoreButtonRadius,
  normalizeThemeColor,
  resolveStoreFontOption,
} from "@/lib/store-engine/theme-tokens";
import { prisma } from "@/lib/db/prisma";
import {
  resolveThemeTokens,
  tokensToCSSVariables,
  sanitizeCSSVariables,
  applyVariant,
  getAutoVariantScript,
} from "@/lib/store-engine/theme";
import type { ThemeVariant } from "@/lib/store-engine/theme";
import { AnnouncementBar, type AnnouncementConfig } from "@/components/storefront/layout/AnnouncementBar";

// ─── Announcement parsing & sanitization ───
// Hardens user-provided announcement config against CSS / URL injection.
// Colors: only hex (#abc, #aabbcc) or rgb()/rgba() with strict shape.
// Links: only relative paths, http(s) URLs, mailto: and tel: — blocks
// javascript:, data:, vbscript:, file: and any malformed scheme.
const SAFE_COLOR_RE = /^(#[0-9a-f]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*[\d.]+\s*)?\))$/i;
const ALLOWED_ICONS = ["megaphone", "tag", "truck", "gift", "sparkles"] as const;
const ALLOWED_VISIBILITY = ["always", "homepage", "collection"] as const;

function safeColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return SAFE_COLOR_RE.test(trimmed) ? trimmed : fallback;
}

function safeLink(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  // Relative path
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  // Absolute http(s), mailto, tel
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return undefined;
}

function parseAnnouncementJson(json: string | null | undefined): AnnouncementConfig | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed.message !== "string" || !parsed.message.trim()) return null;
    const icon = ALLOWED_ICONS.includes(parsed.icon) ? parsed.icon : undefined;
    const visibility = ALLOWED_VISIBILITY.includes(parsed.visibility) ? parsed.visibility : "always";
    return {
      message: String(parsed.message).slice(0, 200),
      link: safeLink(parsed.link),
      bgColor: safeColor(parsed.bgColor, "#0F172A"),
      textColor: safeColor(parsed.textColor, "#FFFFFF"),
      dismissible: parsed.dismissible ?? true,
      icon,
      visibility,
    };
  } catch {
    return null;
  }
}

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

  // Fetch communication + cart + tracking + analytics + theme tokens in parallel
  const [cart, trackingEnabled, commData, analyticsConfig, storeTheme] = await Promise.all([
    getCart(storefrontData.store.id),
    isTrackingWidgetActive(storefrontData.store.id),
    getStorefrontCommunication(storefrontData.store.id),
    getStorefrontAnalyticsConfig(storefrontData.store.id),
    prisma.storeTheme.findUnique({
      where: { storeId: storefrontData.store.id },
      select: { tokensJson: true, themeVariant: true, activePreset: true },
    }),
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
    // Announcement bar
    announcement: parseAnnouncementJson(storefrontData.branding.announcementJson),
  };

  // ─── Resolve theme tokens (backward-compatible) ───
  const themeVariant = (storeTheme?.themeVariant as ThemeVariant) ?? "light";
  const themeConfig = resolveThemeTokens({
    presetId: storeTheme?.activePreset ?? null,
    variant: themeVariant,
    brandingPrimary: primaryColor,
    brandingSecondary: secondaryColor,
    brandingFont: storefrontData.branding.fontFamily,
    brandingButtonStyle: storefrontData.branding.buttonStyle,
    tokensJson: storeTheme?.tokensJson ?? null,
  });
  const resolvedTokens = applyVariant(themeConfig.tokens, themeVariant);
  const themeVars = sanitizeCSSVariables(tokensToCSSVariables(resolvedTokens, themeVariant));

  // Merge: theme token variables + legacy bridge (backward compat)
  const storefrontStyle = {
    ...themeVars,
    // Legacy overrides that components still reference directly
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
      data-theme-variant={themeVariant}
      data-storefront=""
      style={storefrontStyle}
    >
      {themeVariant === "auto" && (
        <script dangerouslySetInnerHTML={{ __html: getAutoVariantScript() }} />
      )}
      {config.announcement && (
        <AnnouncementBar
          config={config.announcement}
          storeSlug={config.slug}
          currentPath={`/store/${config.slug}`}
        />
      )}
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
      <StorefrontAnalyticsScripts config={analyticsConfig} />
    </div>
  );
}

