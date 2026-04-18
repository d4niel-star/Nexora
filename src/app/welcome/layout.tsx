import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentStore } from "@/lib/auth/session";

export default async function WelcomeLayout({ children }: { children: ReactNode }) {
  const store = await getCurrentStore();
  if (!store) {
    redirect("/home/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface-1)] font-sans text-ink-0 antialiased">
      <header className="border-b border-[color:var(--hairline)] bg-[var(--surface-0)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-2">
            <span className="relative inline-flex items-center justify-center" aria-hidden>
              <span className="block h-3 w-3 translate-x-[2px] translate-y-[2px] rounded-[2px] bg-ink-0" />
              <span className="absolute h-3 w-3 -translate-x-[2px] -translate-y-[2px] rounded-[2px] bg-[var(--accent-500)]" />
            </span>
            <span className="font-semibold text-[15px] leading-none tracking-[-0.03em] text-ink-0">
              nexora
            </span>
          </div>

          <div className="hidden items-center gap-4 text-[12px] font-medium text-ink-5 sm:flex">
            <span>Configuración de cuenta</span>
            <span className="h-3 w-px bg-[color:var(--hairline)]" aria-hidden />
            <span>Ayuda</span>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 py-10 sm:px-6 sm:py-14 md:px-8">
        <div className="w-full max-w-6xl">{children}</div>
      </main>

      <footer className="border-t border-[color:var(--hairline)] bg-[var(--surface-0)] py-5 text-center text-[11px] font-medium text-ink-6">
        © {new Date().getFullYear()} Nexora. Infraestructura para ecommerce inteligente.
      </footer>
    </div>
  );
}
