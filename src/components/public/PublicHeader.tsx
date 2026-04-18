import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PublicWordmark } from "./PublicWordmark";

export function PublicHeader() {
  return (
    <header className="border-b border-[color:var(--hairline)] bg-[var(--surface-0)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <PublicWordmark />

        <nav className="flex items-center gap-6 text-[13px]">
          <Link
            href="/home/pricing"
            className="hidden text-ink-5 transition-colors hover:text-ink-0 sm:inline"
          >
            Planes
          </Link>
          <Link
            href="/home/login"
            className="text-ink-5 transition-colors hover:text-ink-0"
          >
            Ingresar
          </Link>
          <Link
            href="/home/register"
            className="inline-flex h-10 items-center gap-1.5 rounded-[var(--r-sm)] bg-ink-0 px-4 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2"
          >
            Empezar
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
