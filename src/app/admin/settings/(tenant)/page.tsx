import Link from "next/link";
import {
  ArrowUpRight,
  ChevronRight,
  Crown,
  FileText,
  Globe,
  MessageSquare,
  Plug,
  ShieldCheck,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { isCurrentUserOps } from "@/lib/auth/ops";
import { getCurrentStore } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getPublicWhatsappSettings } from "@/lib/apps/whatsapp-recovery/settings";
import { getMercadoPagoPlatformReadiness } from "@/lib/payments/mercadopago/platform-readiness";

// NOTE: we intentionally do NOT import SETTINGS_CATEGORIES from
// SettingsShell here. SettingsShell is a "use client" module whose
// categories reference Lucide icon components; importing that value
// into a server component forces the runtime to cross the client
// boundary for non-serialisable references, which crashes some
// deployment targets (Render with the current Next runtime returns a
// generic 500 when this happens). The overview keeps its own grouped
// list and stays in sync with the shell via `scripts/smoke-settings.mjs`.

// ─── Settings overview ──────────────────────────────────────────────────
//
// The /admin/settings index is the dashboard entry point of the settings
// center. We render a Shopify-style grouped grid: every section holds
// one or more category cards, each card carrying its own icon, an
// honest status chip sourced from prisma, and a deep link into the
// dedicated category page where the real form lives.
//
// Status logic:
//   · Medios de pago     → reads StorePaymentProvider for Mercado Pago.
//   · Dominios           → counts StoreDomain rows + verified subset.
//   · WhatsApp y mensajes → reads InstalledApp + WhatsappSettings.
//   · Integraciones      → counts ProviderConnection rows.
//   · Legal · Plan       → render as informational (no boolean state).
//
// We deliberately omit "Finanzas y retiros": Nexora does not run an
// internal payouts pipeline yet, so the surface had nothing real to
// configure. Removing it from this overview AND from `SettingsShell`
// avoids advertising a dead route.

export const dynamic = "force-dynamic";

type Tone = "ok" | "warn" | "muted";

interface CategoryCard {
  href: string;
  label: string;
  summary: string;
  status?: { label: string; tone: Tone };
  icon: LucideIcon;
}

interface CategoryGroup {
  title: string;
  description?: string;
  cards: readonly CategoryCard[];
}

export default async function SettingsHubPage() {
  const [store, isOps] = await Promise.all([
    getCurrentStore(),
    isCurrentUserOps(),
  ]);

  const storeId = store?.id ?? null;

  // ── Real status lookups (parallel) ─────────────────────────────────
  // Each query is wrapped in a fallback so a missing store still
  // renders a muted card instead of throwing the page.
  const [mpRow, domains, whatsappApp, whatsappSettings, integrationsCount] =
    await Promise.all([
      storeId
        ? prisma.storePaymentProvider.findUnique({
            where: { storeId_provider: { storeId, provider: "mercadopago" } },
            select: { status: true, externalAccountId: true },
          })
        : Promise.resolve(null),
      storeId
        ? prisma.storeDomain.findMany({
            where: { storeId },
            select: { isPrimary: true, status: true },
          })
        : Promise.resolve([]),
      storeId
        ? prisma.installedApp.findUnique({
            where: { storeId_appSlug: { storeId, appSlug: "whatsapp-recovery" } },
            select: { status: true },
          })
        : Promise.resolve(null),
      storeId ? getPublicWhatsappSettings(storeId) : Promise.resolve(null),
      storeId
        ? prisma.providerConnection.count({ where: { storeId, status: "active" } })
        : Promise.resolve(0),
    ]);

  // ── Derive presentational chips from the raw data ──────────────────
  const mpConnected =
    mpRow?.status === "connected" && !!mpRow.externalAccountId;

  const verifiedDomains = domains.filter((d) => d.status === "active").length;
  const hasCustomDomain = domains.length > 0;

  const whatsappActive =
    whatsappApp?.status === "active" && whatsappSettings?.status === "active";

  // ── Card registry · grouped by topic ───────────────────────────────
  // Adding a new card requires also registering the route in
  // SettingsShell.tsx; the smoke test asserts both stay in sync.
  const groups: readonly CategoryGroup[] = [
    {
      title: "Pagos y checkout",
      description: "Cobros y conexión al gateway",
      cards: [
        {
          href: "/admin/settings/pagos",
          label: "Medios de pago",
          summary:
            "Mercado Pago OAuth y estado del checkout público de tu tienda.",
          status: mpConnected
            ? { label: "Conectado", tone: "ok" }
            : { label: "Sin conectar", tone: "warn" },
          icon: Wallet,
        },
      ],
    },
    {
      title: "Tienda y dominios",
      description: "Identidad pública del storefront",
      cards: [
        {
          href: "/admin/settings/dominios",
          label: "Dominios",
          summary:
            "Subdominio de Nexora y hasta un dominio propio verificado por DNS.",
          status: hasCustomDomain
            ? verifiedDomains === domains.length
              ? { label: `${verifiedDomains}/${domains.length} verificados`, tone: "ok" }
              : { label: `${verifiedDomains}/${domains.length} verificados`, tone: "warn" }
            : { label: "Sólo subdominio", tone: "muted" },
          icon: Globe,
        },
      ],
    },
    {
      title: "Legal y fiscal",
      description: "Cumplimiento, ARCA y políticas",
      cards: [
        {
          href: "/admin/settings/legal",
          label: "Legal y ARCA",
          summary:
            "Perfil fiscal, facturación electrónica y políticas legales del checkout.",
          icon: FileText,
        },
      ],
    },
    {
      title: "Comunicación",
      description: "Mensajes automáticos al cliente",
      cards: [
        {
          href: "/admin/settings/comunicacion",
          label: "WhatsApp y mensajes",
          summary:
            "Recuperación por WhatsApp y mensajes post-compra. Cada canal degrada en silencio si falta credencial.",
          status: whatsappActive
            ? { label: "WhatsApp activo", tone: "ok" }
            : whatsappApp
              ? { label: "Sin credenciales", tone: "warn" }
              : { label: "No instalado", tone: "muted" },
          icon: MessageSquare,
        },
      ],
    },
    {
      title: "Cuenta y plataforma",
      description: "Tu suscripción y el ecosistema conectado",
      cards: [
        {
          href: "/admin/settings/plan",
          label: "Plan y facturación",
          summary:
            "Suscripción de Nexora, límites operativos del plan y compra de créditos IA.",
          icon: Crown,
        },
        {
          href: "/admin/settings/integraciones",
          label: "Integraciones",
          summary:
            "Proveedores externos, APIs y webhooks conectados a tu tienda.",
          status:
            integrationsCount > 0
              ? { label: `${integrationsCount} activas`, tone: "ok" }
              : { label: "Sin conexiones", tone: "muted" },
          icon: Plug,
        },
      ],
    },
  ];

  const totalCards = groups.reduce((acc, g) => acc + g.cards.length, 0);
  const platformReadiness = isOps ? getMercadoPagoPlatformReadiness() : null;

  return (
    <div className="space-y-10">
      {/* Grouped grid — one section per topic. The SettingsShell already
          draws the page title; we don't repeat it here. */}
      {groups.map((group) => (
        <section
          key={group.title}
          aria-label={group.title}
          className="space-y-3"
        >
          <header className="flex items-end justify-between gap-4 px-1">
            <div className="min-w-0">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-6">
                {group.title}
              </h2>
              {group.description ? (
                <p className="mt-0.5 text-[12px] leading-[1.5] text-ink-5">
                  {group.description}
                </p>
              ) : null}
            </div>
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-6">
              {group.cards.length === 1
                ? "1 ajuste"
                : `${group.cards.length} ajustes`}
            </span>
          </header>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {group.cards.map((card) => (
              <CategoryCardLink key={card.href} card={card} />
            ))}
          </div>
        </section>
      ))}

      {/* Ops-only block: visible ONLY when the current user is on the
          Nexora ops allowlist. Never shown to merchants. Keeps the
          existing /admin/settings/integrations/mercadopago diagnostic
          reachable without leaking to regular tenants. */}
      {isOps && platformReadiness ? (
        <section aria-label="Operaciones de plataforma">
          <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)]">
                <ShieldCheck className="h-4 w-4 text-ink-0" strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-6">
                    Operaciones · Nexora
                  </span>
                  <span
                    className={
                      platformReadiness.ready
                        ? "inline-flex items-center rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.14em] text-[color:var(--signal-success)]"
                        : "inline-flex items-center rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.14em] text-[color:var(--signal-warning)]"
                    }
                  >
                    {platformReadiness.ready ? "Listo" : "Faltan variables"}
                  </span>
                </div>
                <h3 className="mt-1 text-[14px] font-semibold text-ink-0">
                  Mercado Pago · Plataforma
                </h3>
                <p className="mt-1 text-[12px] leading-[1.55] text-ink-5">
                  Readiness global de OAuth con Mercado Pago. Diagnóstico de solo lectura; los secretos viven
                  como variables de entorno.
                </p>
              </div>
              <Link
                href="/admin/settings/integrations/mercadopago"
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-0 transition-colors hover:text-ink-2"
              >
                Abrir diagnóstico
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} />
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* Footnote keeps the page honest: every card on the dashboard
          maps to an existing /admin/settings/<slug>/page.tsx and the
          smoke test enforces no orphan links. */}
      <p className="text-[11px] text-ink-6">
        {totalCards} categorías · Todas apuntan a una página real dentro de Configuración.
      </p>
    </div>
  );
}

// ─── Card primitive ────────────────────────────────────────────────────
//
// One-row card with an icon medallion at the left, the category label
// + description in the middle, an optional tone-coded status chip on
// the right, and a chevron to communicate "this opens its own page".
function CategoryCardLink({ card }: { card: CategoryCard }) {
  const Icon = card.icon;
  return (
    <Link
      href={card.href}
      className="group flex items-start gap-4 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-5 py-4 transition-colors hover:border-[color:var(--hairline-strong)] hover:bg-[var(--surface-1)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] transition-colors group-hover:bg-[var(--surface-0)]">
        <Icon className="h-4 w-4 text-ink-0" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] font-semibold text-ink-0">{card.label}</h3>
          {card.status ? <StatusChip status={card.status} /> : null}
        </div>
        <p className="mt-1 text-[12px] leading-[1.55] text-ink-5">
          {card.summary}
        </p>
      </div>
      <ChevronRight
        className="mt-1 h-4 w-4 shrink-0 text-ink-6 transition-colors group-hover:text-ink-0"
        strokeWidth={1.75}
      />
    </Link>
  );
}

function StatusChip({ status }: { status: { label: string; tone: Tone } }) {
  const palette: Record<Tone, string> = {
    ok: "border-[color:var(--hairline)] bg-[var(--surface-0)] text-[color:var(--signal-success)]",
    warn: "border-[color:var(--hairline)] bg-[var(--surface-0)] text-[color:var(--signal-warning)]",
    muted: "border-[color:var(--hairline)] bg-[var(--surface-0)] text-ink-5",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] ${palette[status.tone]}`}
    >
      <span
        aria-hidden
        className={
          status.tone === "ok"
            ? "h-1.5 w-1.5 rounded-full bg-[color:var(--signal-success)]"
            : status.tone === "warn"
              ? "h-1.5 w-1.5 rounded-full bg-[color:var(--signal-warning)]"
              : "h-1.5 w-1.5 rounded-full bg-ink-7"
        }
      />
      {status.label}
    </span>
  );
}
