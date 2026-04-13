interface NewsletterSectionProps {
  settings: Record<string, unknown>;
}

export function NewsletterSection({ settings }: NewsletterSectionProps) {
  const title = (settings.title as string) ?? "Newsletter";
  const description = (settings.description as string) ?? "";
  const buttonLabel = (settings.buttonLabel as string) ?? "Suscribirse";

  return (
    <div className="bg-gray-900 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            {title}
          </h2>
          {description && (
            <p className="mt-4 text-base font-medium text-gray-400">
              {description}
            </p>
          )}
          <form className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              autoComplete="email"
              required
              className="w-full min-w-0 appearance-none rounded-md border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white shadow-sm placeholder:text-gray-500 focus:border-white focus:outline-none focus:ring-1 focus:ring-white sm:max-w-xs"
              placeholder="Ingresá tu email"
            />
            <button
              type="button"
              className="flex items-center justify-center rounded-md bg-white px-6 py-3 text-sm font-extrabold uppercase tracking-widest text-gray-900 shadow-sm hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 transition-colors"
            >
              {buttonLabel}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
