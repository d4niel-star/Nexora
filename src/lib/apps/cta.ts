// ─── Nexora Apps · Central CTA resolver ───
//
// Single source of truth for the primary action button shown on every app
// surface (detail page, catalogue cards, in-product widgets). The rule set
// comes from the V3 go-live spec:
//
//   coming-soon                                    → "Próximamente"        (disabled)
//   plan-locked                                    → "Ver plan <minPlan>"  → /admin/billing
//   available + !installed                         → "Instalar app"       (install action)
//   available + installed + needs_setup            → "Configurar app"     → setupRoute
//   available + installed + disabled               → "Reactivar app"      (toggle action)
//   available + installed + active                 → "Abrir app"          → manageRoute
//
// No callsite should re-derive the label or the href outside of this file.
// The only input needed is the serialised catalogue item (already carries
// the tenant-resolved availability and install state).

import type { AppCatalogItem } from "./queries";

export type AppCtaKind =
  | "coming-soon"
  | "plan-locked"
  | "install"
  | "setup"
  | "reactivate"
  | "open";

export type AppCta =
  | {
      kind: "open" | "setup" | "plan-locked";
      label: string;
      href: string;
      disabled?: false;
    }
  | {
      kind: "install" | "reactivate";
      label: string;
      action: "install" | "toggle";
      disabled?: false;
    }
  | {
      kind: "coming-soon";
      label: string;
      disabled: true;
    };

/**
 * Resolve the single primary CTA that every app surface must render.
 *
 * The resolver deliberately picks `manageRoute` for the "open" case and
 * `setupRoute` for the "setup" case. When a definition provides only one
 * of the two, the resolver falls back so nothing ever silently renders
 * "Abrir app" with a null href — which was the exact class of bug we're
 * here to close.
 *
 * Fail-safe: when an "active" app has no manageRoute and no setupRoute
 * at all, the CTA degrades to a plain label-less "open" pointing at the
 * catalogue entry; callers must decide to hide the button or show a
 * placeholder. This should never happen in practice (every app in the
 * registry declares at least one route) but we don't throw from a pure
 * presentation helper.
 */
export function resolveAppCta(item: AppCatalogItem): AppCta {
  const { definition, availability, state } = item;

  if (availability.kind === "coming-soon") {
    return { kind: "coming-soon", label: "Próximamente", disabled: true };
  }

  if (availability.kind === "plan-locked") {
    return {
      kind: "plan-locked",
      label: `Ver plan ${availability.minPlan}`,
      href: "/admin/billing",
    };
  }

  // availability.kind === "available" beyond this point.
  if (!state.installed) {
    return { kind: "install", label: "Instalar app", action: "install" };
  }

  if (state.status === "needs_setup") {
    const href = definition.setupRoute ?? definition.manageRoute ?? `/admin/apps/${definition.slug}`;
    return { kind: "setup", label: "Configurar app", href };
  }

  if (state.status === "disabled") {
    return { kind: "reactivate", label: "Reactivar app", action: "toggle" };
  }

  // status === "active"
  const href = definition.manageRoute ?? definition.setupRoute ?? `/admin/apps/${definition.slug}`;
  return { kind: "open", label: "Abrir app", href };
}
