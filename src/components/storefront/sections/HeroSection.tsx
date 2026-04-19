import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { normalizeStorefrontHref, storePath } from "@/lib/store-engine/urls";

// ─── Storefront Hero ───
// Optional background image behind a cool neutral scrim. Typography and CTAs
// follow global tokens — data and routes unchanged.

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

  return (
    <section className="relative isolate overflow-hidden border-b border-[color:var(--hairline-strong)] bg-[var(--surface-0)] text-ink-0">
      {settings.backgroundImageUrl ? (
        <>
          <img
            src={settings.backgroundImageUrl}
            alt=""
            className="absolute inset-0 -z-10 h-full w-full object-cover opacity-[0.22]"
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-gradient-to-b from-[var(--surface-0)] via-[var(--surface-0)]/88 to-[var(--surface-0)]"
          />
        </>
      ) : (
        <div aria-hidden className="absolute inset-0 -z-10 bg-[var(--surface-0)]" />
      )}

      <div className="mx-auto max-w-6xl px-5 pb-28 pt-28 sm:px-8 sm:pb-36 sm:pt-36 lg:pt-40">
        <div className="max-w-3xl">
          <div className="mb-8 h-px w-10 bg-[var(--accent-500)]" aria-hidden />
          <h1 className="font-bold text-[42px] leading-[0.98] tracking-[-0.045em] text-ink-0 sm:text-[64px] lg:text-[72px]">
            {settings.headline}
          </h1>
          {settings.subheadline && (
            <p className="mt-8 max-w-xl text-[16px] leading-[1.65] text-ink-4 sm:text-[17px]">
              {settings.subheadline}
            </p>
          )}
          <div className="mt-12 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Link
              href={primaryHref}
              className="inline-flex h-12 min-h-12 items-center justify-center gap-2 rounded-[var(--r-md)] bg-ink-0 px-8 text-[15px] font-medium text-ink-12 transition-colors hover:bg-ink-2 active:translate-y-px focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
            >
              {settings.primaryActionLabel}
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
            {settings.secondaryActionLabel && (
              <a
                href="#"
                className="inline-flex h-12 min-h-12 items-center justify-center gap-1.5 rounded-[var(--r-md)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-8 text-[15px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] active:translate-y-px focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
              >
                {settings.secondaryActionLabel}
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
