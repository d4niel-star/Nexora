import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { normalizeStorefrontHref, storePath } from "@/lib/store-engine/urls";

// ─── Storefront Hero Pro ───
// Premium hero with better image treatment (higher presence), refined
// typography scale, improved CTA hierarchy, and responsive vertical rhythm.
// Supports layout variants via settings.layout (centered | split | default).
// All pure CSS — no animation libraries, no client component.

export function HeroSection({
  settings,
  storeSlug,
}: {
  settings: Record<string, any>;
  storeSlug: string;
}) {
  const primaryActionLink =
    typeof settings.primaryActionLink === "string"
      ? settings.primaryActionLink.replace("/aura-essentials", storePath(storeSlug))
      : "products";
  const primaryHref = normalizeStorefrontHref(primaryActionLink, storeSlug);

  const secondaryActionLabel =
    typeof settings.secondaryActionLabel === "string" &&
    settings.secondaryActionLabel.trim()
      ? settings.secondaryActionLabel.trim()
      : null;
  const secondaryActionLink =
    typeof settings.secondaryActionLink === "string" &&
    settings.secondaryActionLink.trim()
      ? settings.secondaryActionLink.trim()
      : null;
  const secondaryHref = secondaryActionLink
    ? normalizeStorefrontHref(secondaryActionLink, storeSlug)
    : null;

  const layout = (settings.layout as string) || "default";
  const isCentered = layout === "centered";

  return (
    <section className="relative isolate overflow-hidden bg-[var(--surface-0)] text-ink-0">
      {/* Background image — calibrated for strong visual presence */}
      {settings.backgroundImageUrl ? (
        <>
          <img
            src={settings.backgroundImageUrl}
            alt=""
            loading="eager"
            fetchPriority="high"
            decoding="sync"
            className="absolute inset-0 -z-10 h-full w-full object-cover"
          />
          {/* Multi-stop gradient for readability without killing the image */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-gradient-to-r from-[var(--surface-0)]/95 via-[var(--surface-0)]/70 to-[var(--surface-0)]/40"
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-gradient-to-t from-[var(--surface-0)]/80 via-transparent to-[var(--surface-0)]/30"
          />
        </>
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-br from-[var(--surface-0)] via-[var(--surface-1)] to-[var(--surface-2)]"
        />
      )}

      <div
        className={
          "mx-auto max-w-7xl px-5 sm:px-8 lg:px-8 " +
          "py-20 sm:py-28 lg:py-36 " +
          (isCentered ? "text-center" : "")
        }
      >
        <div className={isCentered ? "mx-auto max-w-3xl" : "max-w-2xl"}>
          {/* Accent line */}
          <div
            className={
              "mb-8 h-px w-12 bg-[var(--accent-500)] " +
              (isCentered ? "mx-auto" : "")
            }
            aria-hidden
          />

          <h1
            className={
              "font-bold tracking-[-0.04em] text-ink-0 " +
              "text-[36px] leading-[0.98] " +
              "sm:text-[52px] " +
              "lg:text-[64px]"
            }
            data-editable-field="headline"
          >
            {settings.headline}
          </h1>

          {settings.subheadline && (
            <p
              className={
                "mt-6 text-[16px] leading-[1.65] text-ink-3 sm:mt-8 sm:text-[17px] lg:text-[18px] " +
                (isCentered ? "mx-auto max-w-xl" : "max-w-lg")
              }
              data-editable-field="subheadline"
            >
              {settings.subheadline}
            </p>
          )}

          <div
            className={
              "mt-10 flex gap-3 sm:mt-12 sm:gap-4 " +
              (isCentered
                ? "flex-col items-center sm:flex-row sm:justify-center"
                : "flex-col items-stretch sm:flex-row sm:items-center")
            }
          >
            <Link
              href={primaryHref}
              className="inline-flex h-12 min-h-12 items-center justify-center gap-2.5 bg-ink-0 px-8 text-[15px] font-semibold text-ink-12 transition-all duration-300 hover:bg-ink-2 hover:shadow-[var(--shadow-elevated)] active:translate-y-px focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
              style={{ borderRadius: "var(--theme-radius-buttons, var(--r-md))" }}
            >
              {settings.primaryActionLabel}
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
            {secondaryActionLabel && secondaryHref && (
              <Link
                href={secondaryHref}
                className="inline-flex h-12 min-h-12 items-center justify-center gap-2 border border-ink-0/20 bg-transparent px-8 text-[15px] font-medium text-ink-0 transition-all duration-300 hover:border-ink-0/40 hover:bg-ink-0/5 active:translate-y-px focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
                style={{ borderRadius: "var(--theme-radius-buttons, var(--r-md))" }}
              >
                {secondaryActionLabel}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
