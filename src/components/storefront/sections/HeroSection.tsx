import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function HeroSection({ settings, storeSlug }: { settings: Record<string, any>, storeSlug: string }) {
  return (
    <div className="relative isolate overflow-hidden bg-gray-900 pb-16 pt-14 sm:pb-20">
      <img
        src={settings.backgroundImageUrl}
        alt=""
        className="absolute inset-0 -z-10 h-full w-full object-cover opacity-60 mix-blend-overlay"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-gray-900/80 via-gray-900/40" />
      
      <div className="mx-auto max-w-7xl px-6 lg:px-8 pt-20 sm:pt-32 lg:pt-40 text-center">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
            {settings.headline}
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-300 font-medium">
            {settings.subheadline}
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href={settings.primaryActionLink.replace('/aura-essentials', `/${storeSlug}`)}
              className="rounded-sm bg-white px-8 py-3.5 text-sm font-extrabold text-gray-900 uppercase tracking-widest shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-colors"
            >
              {settings.primaryActionLabel}
            </Link>
            {settings.secondaryActionLabel && (
              <a href="#" className="text-sm font-bold leading-6 text-white uppercase tracking-widest flex items-center gap-1 hover:text-gray-300 transition-colors">
                {settings.secondaryActionLabel} <ArrowRight className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
