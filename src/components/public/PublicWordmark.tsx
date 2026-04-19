import Link from "next/link";
import { cn } from "@/lib/utils";

export function PublicWordmark({ chrome = false }: { chrome?: boolean }) {
  return (
    <Link href="/home" className="flex items-center gap-2.5" aria-label="Nexora">
      <span className="relative inline-flex items-center justify-center" aria-hidden>
        <span
          className={cn(
            "block h-3 w-3 translate-x-[2px] translate-y-[2px] rounded-[2px]",
            chrome ? "bg-[var(--chrome-fg)]" : "bg-ink-0",
          )}
        />
        <span
          className={cn(
            "absolute h-3 w-3 -translate-x-[2px] -translate-y-[2px] rounded-[2px] bg-[var(--accent-500)]",
            chrome && "opacity-95",
          )}
        />
      </span>
      <span
        className={cn(
          "text-[15px] font-semibold leading-none tracking-[-0.03em]",
          chrome ? "text-[var(--chrome-fg)]" : "text-ink-0",
        )}
      >
        nexora
      </span>
    </Link>
  );
}
