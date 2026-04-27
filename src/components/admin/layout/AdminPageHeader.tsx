import type { ReactNode } from "react";
import { NexoraPageHeader } from "@/components/admin/nexora/NexoraPageHeader";

// ─── AdminPageHeader · Studio v4 wrapper ────────────────────────────────
//
// This component now exists ONLY as a back-compat shim that delegates to
// `NexoraPageHeader` (Studio v4). The previous v3 stack (uppercase
// eyebrow + 30px display title + subtitle paragraph + bottom hairline
// + actions cluster on the right) has been retired in favour of a
// compact single-row inline header.
//
// Migration policy: every existing call site keeps working without
// touching props. `eyebrow`, `index`, `quiet` and `children` are
// accepted for source compatibility but no longer rendered — Studio v4
// is intentionally flatter and shorter, so these legacy slots have no
// place in the new visual language.
//
// New code should import `NexoraPageHeader` directly from
// `@/components/admin/nexora` instead of going through this shim.

interface AdminPageHeaderProps {
  /** @deprecated Kept for back-compat; Studio v4 ignores it. */
  index?: string;
  /** @deprecated Kept for back-compat; Studio v4 ignores it. */
  eyebrow?: string;
  /** Page title — kept short, displayed inline. */
  title: string;
  /** Optional one-line description shown below the row. */
  subtitle?: string;
  /** Right-aligned action cluster (CTA buttons, filters, etc). */
  actions?: ReactNode;
  /** @deprecated Studio v4 always ships the same hairline rhythm. */
  quiet?: boolean;
  /** @deprecated Studio v4 does not render arbitrary children inside the
   *  header. Move them into the page body. */
  children?: ReactNode;
  className?: string;
}

export function AdminPageHeader({
  title,
  subtitle,
  actions,
  className,
}: AdminPageHeaderProps) {
  return (
    <NexoraPageHeader
      title={title}
      subtitle={subtitle}
      actions={actions}
      className={className}
    />
  );
}
