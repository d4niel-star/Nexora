import { PublicWordmark } from "./PublicWordmark";
import { Reveal } from "./PublicMotion";

export function PublicFooter() {
  return (
    <footer className="border-t border-[color:var(--hairline)] bg-[var(--surface-0)]">
      <Reveal className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-5 py-8 sm:flex-row sm:items-center sm:px-8">
        <PublicWordmark />
        <p className="text-[12px] text-ink-5">
          © {new Date().getFullYear()} Nexora. Infraestructura operativa para ecommerce.
        </p>
      </Reveal>
    </footer>
  );
}
