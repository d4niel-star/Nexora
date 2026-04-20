import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

// ─── SettingsCategoryPanel ───────────────────────────────────────────────
//
// Sober, minimal layout used by every /admin/settings/<slug> page that
// is fundamentally a status-plus-deep-link surface (plan, finanzas,
// integraciones, dominios, comunicacion). Renders:
//
//   · a small eyebrow label,
//   · the category title,
//   · an honest description,
//   · an optional list of real status facts (tone-coded chips),
//   · primary + optional secondary actions.
//
// No gradients, no oversized badges, no decorative pills. Colours come
// from the existing signal-* and ink-* tokens so the panel reads the
// same as every other admin card.
//
// When the settings data for a category is a real form (legal, pagos),
// that page renders its own form component instead of this panel.

export type StatusTone = "ok" | "warn" | "muted" | "danger";

export interface StatusFact {
  label: string;
  value: string;
  tone?: StatusTone;
}

export interface PanelAction {
  href: string;
  label: string;
  /** External routes open in a new tab (ops tooling). Defaults to false. */
  external?: boolean;
  /** Primary looks like the main admin button; secondary is ghost. */
  variant?: "primary" | "secondary";
}

interface Props {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Real facts derived from DB rows. Never hardcoded values. */
  facts?: readonly StatusFact[];
  actions: readonly PanelAction[];
  /** Optional long-form body (JSX) rendered below the facts. */
  children?: React.ReactNode;
}

function toneClass(tone: StatusTone | undefined): string {
  switch (tone) {
    case "ok":
      return "text-[color:var(--signal-success)]";
    case "warn":
      return "text-[color:var(--signal-warning)]";
    case "danger":
      return "text-[color:var(--signal-danger)]";
    default:
      return "text-ink-0";
  }
}

export function SettingsCategoryPanel({
  eyebrow,
  title,
  description,
  icon: Icon,
  facts,
  actions,
  children,
}: Props) {
  return (
    <div className="space-y-6">
      <header className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
          <Icon className="h-4 w-4 text-ink-0" strokeWidth={1.75} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-6">
            {eyebrow}
          </span>
          <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.02em] text-ink-0">
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-[1.55] text-ink-5">
            {description}
          </p>
        </div>
      </header>

      {facts && facts.length > 0 ? (
        <dl className="grid grid-cols-1 gap-3 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5 sm:grid-cols-2">
          {facts.map((fact) => (
            <div key={fact.label} className="min-w-0">
              <dt className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-6">
                {fact.label}
              </dt>
              <dd className={`mt-1 truncate text-[13px] font-medium ${toneClass(fact.tone)}`}>
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {children ? (
        <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5 text-[13px] leading-[1.55] text-ink-3">
          {children}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {actions.map((action, idx) => {
          const isPrimary = (action.variant ?? (idx === 0 ? "primary" : "secondary")) === "primary";
          const className = isPrimary
            ? "inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-[var(--r-sm)] bg-ink-0 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
            : "inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] text-[13px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]";
          return action.external ? (
            <a
              key={action.href + action.label}
              href={action.href}
              target="_blank"
              rel="noreferrer"
              className={className}
            >
              {action.label}
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} />
            </a>
          ) : (
            <Link key={action.href + action.label} href={action.href} className={className}>
              {action.label}
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
