interface NewsletterSectionProps {
  settings: Record<string, unknown>;
}

export function NewsletterSection({ settings }: NewsletterSectionProps) {
  const title = (settings.title as string) ?? "Newsletter";
  const description = (settings.description as string) ?? "";
  const buttonLabel = (settings.buttonLabel as string) ?? "Suscribirse";

  return (
    <section className="border-y border-[color:var(--hairline)] bg-[var(--surface-0)] py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-semibold text-[28px] leading-[1.08] tracking-[-0.035em] text-ink-0 sm:text-[40px]">
            {title}
          </h2>
          {description && (
            <p className="mx-auto mt-4 max-w-md text-[14px] leading-[1.55] text-ink-5">
              {description}
            </p>
          )}
          <form className="mx-auto mt-8 flex max-w-lg flex-col gap-3 sm:flex-row sm:justify-center">
            <label htmlFor="newsletter-email" className="sr-only">
              Email
            </label>
            <input
              id="newsletter-email"
              type="email"
              autoComplete="email"
              required
              className="h-12 w-full min-w-0 appearance-none rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-3.5 text-[15px] text-ink-0 placeholder:text-ink-6 transition-[box-shadow,border-color] duration-[var(--dur-base)] ease-[var(--ease-out)] focus:border-[var(--accent-500)] focus:outline-none focus:shadow-[var(--shadow-focus)] sm:max-w-xs"
              placeholder="Ingresá tu email"
            />
            <button
              type="button"
              className="inline-flex h-12 items-center justify-center rounded-[var(--r-sm)] bg-ink-0 px-6 text-[14px] font-medium text-ink-12 transition-colors hover:bg-ink-2 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
            >
              {buttonLabel}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
