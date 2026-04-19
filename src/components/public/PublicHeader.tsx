import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PublicWordmark } from "./PublicWordmark";
import { PageReveal } from "./PublicMotion";

export function PublicHeader() {
  return (
    <header className="border-b border-[color:var(--chrome-border)] bg-[var(--chrome-bg)]">
      <PageReveal className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <PublicWordmark chrome />

        <nav className="flex items-center gap-1 sm:gap-2 text-[13px]">
          <Link
            href="/home/pricing"
            className="hidden rounded-[var(--r-sm)] px-3 py-2.5 text-[var(--chrome-fg-muted)] transition-colors hover:bg-[var(--chrome-hover)] hover:text-[var(--chrome-fg)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus-on-dark)] sm:inline-flex sm:min-h-11 sm:items-center"
          >
            Planes
          </Link>
          <Link
            href="/home/login"
            className="inline-flex min-h-11 items-center rounded-[var(--r-sm)] px-3 py-2.5 text-[var(--chrome-fg-muted)] transition-colors hover:bg-[var(--chrome-hover)] hover:text-[var(--chrome-fg)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus-on-dark)]"
          >
            Ingresar
          </Link>
          <Link
            href="/home/register"
            className="group inline-flex min-h-11 items-center gap-1.5 rounded-[var(--r-md)] bg-[var(--accent-500)] px-4 text-[13px] font-medium text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-600)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus-on-dark)]"
          >
            Empezar
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform duration-[var(--dur-base)] group-hover:translate-x-0.5"
              strokeWidth={1.75}
            />
          </Link>
        </nav>
      </PageReveal>
    </header>
  );
}
