import Link from "next/link";

export function PublicWordmark() {
  return (
    <Link href="/home" className="flex items-center gap-2" aria-label="Nexora">
      <span className="relative inline-flex items-center justify-center" aria-hidden>
        <span className="block h-3 w-3 translate-x-[2px] translate-y-[2px] rounded-[2px] bg-ink-0" />
        <span className="absolute h-3 w-3 -translate-x-[2px] -translate-y-[2px] rounded-[2px] bg-[var(--accent-500)]" />
      </span>
      <span className="font-semibold text-[15px] leading-none tracking-[-0.03em] text-ink-0">
        nexora
      </span>
    </Link>
  );
}
