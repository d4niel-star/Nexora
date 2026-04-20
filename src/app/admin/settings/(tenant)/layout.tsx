import { SettingsShell } from "@/components/admin/settings/SettingsShell";

// ─── Tenant-scoped settings layout ──────────────────────────────────────
//
// This layout wraps every tenant-facing settings page with the SettingsShell
// (right-side category nav + main content area). It lives inside the
// (tenant) route group on purpose: anything outside the group — e.g. the
// ops-only /admin/settings/integrations/mercadopago diagnostic — should
// NOT inherit this shell. Ops diagnostics render standalone.
//
// Keeping this as a thin server layout means each category page stays a
// real server component and can fetch its own data without going through
// a client boundary.

export default function TenantSettingsLayout({ children }: { children: React.ReactNode }) {
  return <SettingsShell>{children}</SettingsShell>;
}
