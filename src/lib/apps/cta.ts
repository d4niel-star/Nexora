// ─── Nexora Apps · Central CTA resolver ───
//
// Single source of truth for the primary action button shown on every
// internal-app surface (detail page, marketplace cards, in-product widgets).
//
// IMPORTANT: this file resolves CTAs for *internal Nexora tools* — every
// item in `APP_REGISTRY` is built by us and either lives as a `builtin`
// capability or as a `deep-link` to another admin screen. None of these
// are third-party apps. That's why we deliberately avoid the "Instalar"
// label here:
//
//   coming-soon                                       → "Próximamente"  (disabled)
//   plan-locked                                       → "Ver plan <X>"  → /admin/billing
//   available + !installed + installMode=builtin      → "Activar"       (install action — toggles a tenant row)
//   available + !installed + installMode=deep-link    → "Configurar"    → setupRoute (no fake install)
//   available + installed + needs_setup               → "Configurar"    → setupRoute
//   available + installed + disabled                  → "Reactivar"     (toggle action)
//   available + installed + active                    → "Abrir"         → manageRoute
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
    // deep-link tools live elsewhere in the admin — installing them is a
    // no-op from the user's point of view, so the CTA should just take
    // them to the configuration screen that owns the capability.
    if (definition.installMode === "deep-link") {
      const href = definition.setupRoute ?? definition.manageRoute ?? `/admin/apps/${definition.slug}`;
      return { kind: "setup", label: "Configurar", href };
    }
    // builtin tools need a tenant-level row in InstalledApp before the
    // capability runs (cron, page mount, etc.). The action label reflects
    // that this is an internal Nexora tool, not a third-party install.
    return { kind: "install", label: "Activar", action: "install" };
  }

  if (state.status === "needs_setup") {
    const href = definition.setupRoute ?? definition.manageRoute ?? `/admin/apps/${definition.slug}`;
    return { kind: "setup", label: "Configurar", href };
  }

  if (state.status === "disabled") {
    return { kind: "reactivate", label: "Reactivar", action: "toggle" };
  }

  // status === "active"
  const href = definition.manageRoute ?? definition.setupRoute ?? `/admin/apps/${definition.slug}`;
  return { kind: "open", label: "Abrir", href };
}
