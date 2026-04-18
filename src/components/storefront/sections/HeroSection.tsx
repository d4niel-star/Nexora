import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { normalizeStorefrontHref, storePath } from "@/lib/store-engine/urls";

// ─── Storefront Hero ───
// Editorial store hero. Keeps the optional background image but softens it
// behind a clean surface so headlines stay readable at all scales. Copy and
// routing props remain identical; only typography and surfaces changed.

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
    <section className="relative isolate overflow-hidden border-b border-[color:var(--hairline)] bg-[var(--surface-0)] text-ink-0">
      {settings.backgroundImageUrl ? (
        <>
          <img
            src={settings.backgroundImageUrl}
            alt=""
            className="absolute inset-0 -z-10 h-full w-full object-cover opacity-20"
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[var(--surface-0)]/70"
          />
        </>
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[var(--surface-0)]"
        />
      )}

      <div className="mx-auto max-w-6xl px-5 pb-20 pt-20 sm:px-8 sm:pb-28 sm:pt-28 lg:pt-32">
        <div className="max-w-3xl">
          <h1 className="font-semibold text-[42px] leading-[0.98] tracking-[-0.035em] text-ink-0 sm:text-[68px]">
            {settings.headline}
          </h1>
          {settings.subheadline && (
            <p className="mt-6 max-w-xl text-[16px] leading-[1.55] text-ink-5 sm:text-[17px]">
              {settings.subheadline}
            </p>
          )}
          <div className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <Link
              href={primaryHref}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--r-sm)] bg-ink-0 px-7 text-[14px] font-medium text-ink-12 transition-colors hover:bg-ink-2 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
            >
              {settings.primaryActionLabel}
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
            {settings.secondaryActionLabel && (
              <a
                href="#"
                className="inline-flex h-12 items-center justify-center gap-1.5 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-transparent px-7 text-[14px] font-medium text-ink-0 transition-colors hover:bg-ink-11 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
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
