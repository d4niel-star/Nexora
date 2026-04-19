import { PublicWordmark } from "./PublicWordmark";
import { Reveal } from "./PublicMotion";

export function PublicFooter() {
  return (
    <footer className="border-t border-[color:var(--chrome-border)] bg-[var(--chrome-bg)]">
      <Reveal className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-5 py-10 sm:flex-row sm:items-center sm:px-8">
        <PublicWordmark chrome />
        <p className="max-w-md text-[12px] leading-relaxed text-[var(--chrome-fg-muted)]">
          © {new Date().getFullYear()} Nexora. Infraestructura operativa para ecommerce.
        </p>
      </Reveal>
    </footer>
  );
}
