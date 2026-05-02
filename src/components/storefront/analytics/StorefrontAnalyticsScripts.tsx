"use client";

import Script from "next/script";
import type { StorefrontAnalyticsConfig } from "@/lib/ads/pixels/storefront-query";

// ─── Storefront Analytics Scripts ───────────────────────────────────────
//
// Renders real tracking scripts for a specific store's configured pixels.
// This component is rendered inside the storefront layout — NOT in admin.
//
// Rules:
//  1. Only public IDs — no secrets, tokens, or API keys.
//  2. One script per unique ID — no duplicates.
//  3. Renders nothing if config is empty.
//  4. Uses next/script with afterInteractive strategy.
//  5. Stable `id` attributes to prevent React key warnings.
//
// Events implemented (base page tracking only):
//  - GA4: gtag config + page_view
//  - Meta Pixel: fbq init + PageView
//  - TikTok Pixel: ttq.load + page
//
// NOT implemented in this phase:
//  - Purchase, AddToCart, InitiateCheckout, ViewContent
//  - Conversion API (server-side)
//  - Enhanced ecommerce
//  - Attribution

interface Props {
  config: StorefrontAnalyticsConfig;
}

export function StorefrontAnalyticsScripts({ config }: Props) {
  const hasGA4 = config.ga4MeasurementIds.length > 0;
  const hasMeta = config.metaPixelIds.length > 0;
  const hasTikTok = config.tiktokPixelIds.length > 0;

  if (!hasGA4 && !hasMeta && !hasTikTok) return null;

  return (
    <>
      {/* ── GA4 / Google Tag ────────────────────────────────────────── */}
      {hasGA4 && (
        <>
          <Script
            id="storefront-gtag-js"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${config.ga4MeasurementIds[0]}`}
          />
          <Script id="storefront-gtag-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              ${config.ga4MeasurementIds
                .map((id) => `gtag('config', '${escapeJs(id)}', { send_page_view: true });`)
                .join("\n              ")}
            `}
          </Script>
        </>
      )}

      {/* ── Meta Pixel ──────────────────────────────────────────────── */}
      {hasMeta && (
        <Script id="storefront-meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            ${config.metaPixelIds
              .map((id) => `fbq('init', '${escapeJs(id)}');`)
              .join("\n            ")}
            fbq('track', 'PageView');
          `}
        </Script>
      )}

      {/* ── TikTok Pixel ────────────────────────────────────────────── */}
      {hasTikTok && (
        <Script id="storefront-tiktok-pixel" strategy="afterInteractive">
          {`
            !function (w, d, t) {
              w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e+""]=+new Date,ttq._o=ttq._o||{},ttq._o[e+""]=n||{};var i=d.createElement("script");i.type="text/javascript",i.async=!0,i.src=r+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(i,a)};
              ${config.tiktokPixelIds
                .map((id) => `ttq.load('${escapeJs(id)}');`)
                .join("\n              ")}
              ttq.page();
            }(window, document, 'ttq');
          `}
        </Script>
      )}
    </>
  );
}

/** Escape a string for safe insertion inside JS string literals. */
function escapeJs(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '\\"');
}
