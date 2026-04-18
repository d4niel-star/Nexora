import Script from "next/script";

/**
 * Injects the analytics beacons only if the corresponding env var is present.
 * Completely no-op when no provider is configured — nothing to clean up later.
 *
 * Supported providers:
 * - Plausible: set `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` to your site domain.
 * - Google Analytics 4: set `NEXT_PUBLIC_GA_ID` to your measurement ID (G-XXXX).
 *
 * Rendered inside the root layout so every route (marketing, admin, storefront)
 * gets the same tracking. Individual routes can still opt-out via the
 * `data-exclude-analytics` attribute on the body if needed.
 */
export function AnalyticsScripts() {
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <>
      {plausibleDomain && (
        <Script
          strategy="afterInteractive"
          data-domain={plausibleDomain}
          src="https://plausible.io/js/script.js"
        />
      )}
      {gaId && (
        <>
          <Script
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}', { send_page_view: true });
            `}
          </Script>
        </>
      )}
    </>
  );
}
