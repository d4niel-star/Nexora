"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Boxes,
  Building2,
  Check,
  Clock,
  ExternalLink,
  Globe2,
  Mail,
  MessageSquare,
  Package,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { AppCatalogItem } from "@/lib/apps/queries";
import { resolveAppCta } from "@/lib/apps/cta";
import { APP_CATEGORIES, type AppCategory } from "@/lib/apps/registry";
import {
  EXTERNAL_APP_CATEGORIES,
  type ExternalAppAvailability,
  type ExternalAppCategory,
  type ExternalAppDefinition,
} from "@/lib/marketplace/external-registry";
import { getAppIcon } from "../apps/appIcons";
import { AppStatusBadge } from "../apps/AppStatusBadge";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { AdminPillTabs } from "@/components/admin/primitives/AdminPillTabs";

// ─── Marketplace UI ───────────────────────────────────────────────────────
//
// Two clearly separated tabs: "Herramientas Nexora" (internal) and "Apps
// externas" (third-party). Each tab has its own search and category
// filter. Cards are intentionally different between sides so the merchant
// always knows what's Nexora-built vs. third-party.

interface Props {
  internalCatalog: AppCatalogItem[];
  internalSummary: { installed: number; total: number; comingSoon: number };
  externalCatalog: ExternalAppDefinition[];
}

type TabValue = "internal" | "external";

export function MarketplacePage({
  internalCatalog,
  internalSummary,
  externalCatalog,
}: Props) {
  const [tab, setTab] = useState<TabValue>("internal");
  const [internalQuery, setInternalQuery] = useState("");
  const [internalCategory, setInternalCategory] = useState<AppCategory | "all">("all");
  const [externalQuery, setExternalQuery] = useState("");
  const [externalCategory, setExternalCategory] = useState<ExternalAppCategory | "all">("all");

  // ── Filtering ──
  const filteredInternal = useMemo(() => {
    const q = internalQuery.trim().toLowerCase();
    return internalCatalog.filter((item) => {
      if (internalCategory !== "all" && item.definition.category !== internalCategory) return false;
      if (!q) return true;
      const haystack = [
        item.definition.name,
        item.definition.shortDescription,
        ...(item.definition.tags ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [internalCatalog, internalQuery, internalCategory]);

  const filteredExternal = useMemo(() => {
    const q = externalQuery.trim().toLowerCase();
    return externalCatalog.filter((app) => {
      if (externalCategory !== "all" && app.category !== externalCategory) return false;
      if (!q) return true;
      const haystack = [app.name, app.vendor, app.shortDescription, ...(app.tags ?? [])]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [externalCatalog, externalQuery, externalCategory]);

  const totalInternal = internalCatalog.length;
  const totalExternal = externalCatalog.length;
  const externalAvailable = externalCatalog.filter((a) => a.availability === "available").length;

  return (
    <div className="space-y-7 pb-24">
      <AdminPageHeader
        eyebrow="Marketplace · Apps"
        title="Marketplace"
        subtitle="Apps oficiales y de terceros para extender tu operación. Activá lo que necesites, sin fricción."
        actions={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--hairline)] bg-[var(--surface-paper)] px-2.5 h-8 text-[11.5px] font-medium text-ink-3">
              <BadgeCheck className="h-3 w-3" strokeWidth={1.75} />
              {internalSummary.installed} / {internalSummary.total} activas
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--hairline)] bg-[var(--surface-paper)] px-2.5 h-8 text-[11.5px] font-medium text-ink-3">
              <ExternalLink className="h-3 w-3" strokeWidth={1.75} />
              {externalAvailable} externas
            </span>
          </div>
        }
      />

      {/* Tab switch — explicit Internal vs External separation */}
      <AdminPillTabs
        tabs={[
          { value: "internal", label: "Herramientas Nexora", count: totalInternal },
          { value: "external", label: "Apps externas", count: totalExternal },
        ]}
        active={tab}
        onChange={(v) => setTab(v as "internal" | "external")}
      />

      {tab === "internal" ? (
        <InternalSection
          query={internalQuery}
          onQueryChange={setInternalQuery}
          category={internalCategory}
          onCategoryChange={setInternalCategory}
          items={filteredInternal}
          totalCount={totalInternal}
        />
      ) : (
        <ExternalSection
          query={externalQuery}
          onQueryChange={setExternalQuery}
          category={externalCategory}
          onCategoryChange={setExternalCategory}
          apps={filteredExternal}
          totalCount={totalExternal}
        />
      )}
    </div>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[12px] font-medium transition-colors",
        active
          ? "bg-[var(--surface-paper)] text-ink-0 shadow-[var(--shadow-card)]"
          : "text-ink-5 hover:text-ink-0",
      )}
    >
      {icon}
      {label}
      <span
        className={cn(
          "tabular-nums inline-flex items-center rounded-[var(--r-xs)] px-1.5 py-px text-[10px] font-semibold uppercase tracking-[0.12em]",
          active ? "bg-[var(--surface-2)] text-ink-0" : "bg-transparent text-ink-6",
        )}
      >
        {count}
      </span>
    </button>
  );
}

// ─── INTERNAL section ─────────────────────────────────────────────────────

function InternalSection({
  query,
  onQueryChange,
  category,
  onCategoryChange,
  items,
  totalCount,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  category: AppCategory | "all";
  onCategoryChange: (c: AppCategory | "all") => void;
  items: AppCatalogItem[];
  totalCount: number;
}) {
  const categoriesWithCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      const k = item.definition.category;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return APP_CATEGORIES.map((c) => ({ ...c, count: counts.get(c.key) ?? 0 })).filter(
      (c) => c.count > 0,
    );
  }, [items]);

  return (
    <div className="space-y-5">
      {/* Subheader explanation */}
      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 py-3 text-[12px] leading-[1.5] text-ink-5">
        <span className="font-medium text-ink-0">Herramientas internas de Nexora.</span> Son módulos
        construidos por nosotros: no se instalan de un tercero, se activan o se configuran. Lo que ya
        está activo en tu plan se abre directo; lo que requiere setup te lleva al módulo correcto sin
        duplicar configuración.
      </div>

      {/* Toolbar */}
      <Toolbar
        placeholder="Buscar herramienta por nombre, categoría o tag…"
        query={query}
        onQueryChange={onQueryChange}
        rightSlot={
          <span className="tabular-nums text-[11px] text-ink-5">
            {items.length} de {totalCount} herramienta{totalCount !== 1 ? "s" : ""}
          </span>
        }
      />

      {/* Category pills */}
      <div className="flex flex-wrap gap-1.5">
        <FilterPill label="Todas" active={category === "all"} onClick={() => onCategoryChange("all")} />
        {categoriesWithCounts.map((c) => (
          <FilterPill
            key={c.key}
            label={c.label}
            active={category === c.key}
            onClick={() => onCategoryChange(c.key)}
          />
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyResults
          icon={<Sparkles className="h-5 w-5 text-ink-5" strokeWidth={1.5} />}
          title="No encontramos herramientas con ese filtro"
          subtitle="Probá con otro término o limpiá los filtros."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <InternalCard key={item.definition.slug} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function InternalCard({ item }: { item: AppCatalogItem }) {
  const { definition, availability, state } = item;
  const cta = resolveAppCta(item);
  const Icon = getAppIcon(definition.iconName);
  const categoryLabel =
    APP_CATEGORIES.find((c) => c.key === definition.category)?.label ?? definition.category;

  return (
    <Link
      href={`/admin/apps/${definition.slug}`}
      className="elev-card-interactive group relative flex flex-col rounded-[var(--r-md)] p-5 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
          <Icon className="h-5 w-5 text-ink-0" strokeWidth={1.6} />
        </div>
        <AppStatusBadge availability={availability} installState={state} />
      </div>

      <h3 className="mt-4 text-[14px] font-semibold tracking-[-0.01em] text-ink-0">
        {definition.name}
      </h3>
      <p className="mt-1.5 line-clamp-3 text-[12px] leading-[1.5] text-ink-5">
        {definition.shortDescription}
      </p>

      <div className="mt-auto pt-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
          <span className="inline-flex items-center gap-1 rounded-[var(--r-xs)] bg-[var(--surface-2)] px-1.5 py-0.5">
            <BadgeCheck className="h-2.5 w-2.5" strokeWidth={2} />
            Nexora
          </span>
          <span>{categoryLabel}</span>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[12px] font-medium transition-colors",
            cta.kind === "coming-soon" ? "text-ink-6" : "text-ink-0 group-hover:text-[color:var(--accent-500)]",
          )}
        >
          {cta.label}
          {cta.kind !== "coming-soon" && <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />}
        </span>
      </div>
    </Link>
  );
}

// ─── EXTERNAL section ─────────────────────────────────────────────────────

function ExternalSection({
  query,
  onQueryChange,
  category,
  onCategoryChange,
  apps,
  totalCount,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  category: ExternalAppCategory | "all";
  onCategoryChange: (c: ExternalAppCategory | "all") => void;
  apps: ExternalAppDefinition[];
  totalCount: number;
}) {
  const categoriesWithCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const app of apps) counts.set(app.category, (counts.get(app.category) ?? 0) + 1);
    return EXTERNAL_APP_CATEGORIES.map((c) => ({ ...c, count: counts.get(c.key) ?? 0 })).filter(
      (c) => c.count > 0,
    );
  }, [apps]);

  return (
    <div className="space-y-5">
      <div className="rounded-[var(--r-md)] border border-[color:color-mix(in_srgb,var(--accent-500)_18%,var(--hairline))] bg-[color:color-mix(in_srgb,var(--accent-500)_4%,var(--surface-0))] px-4 py-3 text-[12px] leading-[1.5] text-ink-5">
        <span className="font-medium text-ink-0">Apps de terceros.</span> Cada app declara qué
        datos usa, si modifica el storefront y qué permisos pide. No instalamos nada que no tenga
        integración real: las que aún no están listas se marcan como{" "}
        <strong className="font-medium text-ink-0">Próximamente</strong> o{" "}
        <strong className="font-medium text-ink-0">En revisión</strong>.
      </div>

      <Toolbar
        placeholder="Buscar app externa por nombre, vendor o categoría…"
        query={query}
        onQueryChange={onQueryChange}
        rightSlot={
          <span className="tabular-nums text-[11px] text-ink-5">
            {apps.length} de {totalCount} app{totalCount !== 1 ? "s" : ""}
          </span>
        }
      />

      <div className="flex flex-wrap gap-1.5">
        <FilterPill label="Todas" active={category === "all"} onClick={() => onCategoryChange("all")} />
        {categoriesWithCounts.map((c) => (
          <FilterPill
            key={c.key}
            label={c.label}
            active={category === c.key}
            onClick={() => onCategoryChange(c.key)}
          />
        ))}
      </div>

      {apps.length === 0 ? (
        <EmptyResults
          icon={<ExternalLink className="h-5 w-5 text-ink-5" strokeWidth={1.5} />}
          title="No encontramos apps con ese filtro"
          subtitle="Probá con otro término. El catálogo crece cada release con nuevas integraciones."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {apps.map((app) => (
            <ExternalCard key={app.appId} app={app} />
          ))}
        </div>
      )}
    </div>
  );
}

function ExternalCard({ app }: { app: ExternalAppDefinition }) {
  const Icon = getExternalIcon(app.iconName);
  const categoryLabel =
    EXTERNAL_APP_CATEGORIES.find((c) => c.key === app.category)?.label ?? app.category;

  return (
    <article className="elev-card relative flex flex-col rounded-[var(--r-md)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
          <Icon className="h-5 w-5 text-ink-0" strokeWidth={1.6} />
        </div>
        <ExternalAvailabilityBadge availability={app.availability} />
      </div>

      <h3 className="mt-4 text-[14px] font-semibold tracking-[-0.01em] text-ink-0">{app.name}</h3>
      <p className="mt-0.5 text-[11px] text-ink-5">
        Por <span className="font-medium text-ink-3">{app.vendor}</span>
      </p>
      <p className="mt-2 line-clamp-3 text-[12px] leading-[1.5] text-ink-5">{app.shortDescription}</p>

      {/* Permission hints — decisive for trust */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {app.modifiesStorefront && (
          <span
            className="inline-flex items-center gap-1 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-1.5 py-0.5 text-[10px] font-medium text-ink-5"
            title="Esta app inyecta scripts o widgets en tu storefront"
          >
            <Globe2 className="h-2.5 w-2.5" /> Modifica storefront
          </span>
        )}
        {app.sendsDataExternal && (
          <span
            className="inline-flex items-center gap-1 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-1.5 py-0.5 text-[10px] font-medium text-ink-5"
            title="Esta app envía datos fuera de Nexora"
          >
            <ShieldCheck className="h-2.5 w-2.5" /> Envía datos externos
          </span>
        )}
      </div>

      <div className="mt-auto pt-4 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1 rounded-[var(--r-xs)] bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
          <ExternalLink className="h-2.5 w-2.5" strokeWidth={2} />
          Tercero · {categoryLabel}
        </span>
        <ExternalAction app={app} />
      </div>

      {/* Note when not available */}
      {app.availability !== "available" && app.availabilityNote && (
        <p className="mt-3 border-t border-[color:var(--hairline)] pt-3 text-[11px] leading-[1.5] text-ink-6">
          {app.availabilityNote}
        </p>
      )}
    </article>
  );
}

function ExternalAction({ app }: { app: ExternalAppDefinition }) {
  if (app.action.kind === "none") {
    return (
      <span className="inline-flex h-8 cursor-not-allowed items-center gap-1 rounded-full border border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 text-[12px] font-medium text-ink-6">
        {app.availability === "review" ? (
          <Clock className="h-3 w-3" strokeWidth={2} />
        ) : (
          <Clock className="h-3 w-3" strokeWidth={2} />
        )}
        {app.availability === "review" ? "En revisión" : "Próximamente"}
      </span>
    );
  }

  if (app.action.kind === "deep-link") {
    return (
      <Link href={app.action.href} className="btn-primary h-8 px-3 text-[12px]">
        {app.action.label}
        <ArrowUpRight className="h-3 w-3" strokeWidth={2} />
      </Link>
    );
  }

  // open-website
  return (
    <a
      href={app.action.href}
      target="_blank"
      rel="noopener noreferrer"
      className="btn-secondary h-8 px-3 text-[12px]"
    >
      {app.action.label}
      <ExternalLink className="h-3 w-3" strokeWidth={2} />
    </a>
  );
}

function ExternalAvailabilityBadge({ availability }: { availability: ExternalAppAvailability }) {
  if (availability === "available") {
    return (
      <span className="inline-flex h-6 items-center gap-1 rounded-[var(--r-xs)] border border-[color:color-mix(in_srgb,var(--signal-success)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--signal-success)_10%,var(--surface-0))] px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--signal-success)]">
        <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
        Disponible
      </span>
    );
  }
  if (availability === "review") {
    return (
      <span className="inline-flex h-6 items-center gap-1 rounded-[var(--r-xs)] border border-[color:color-mix(in_srgb,var(--signal-warning)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--signal-warning)_10%,var(--surface-0))] px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--signal-warning)]">
        <Clock className="h-2.5 w-2.5" strokeWidth={2.5} />
        En revisión
      </span>
    );
  }
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-5">
      <Clock className="h-2.5 w-2.5" strokeWidth={2.5} />
      Próximamente
    </span>
  );
}

// ─── Shared bits ──────────────────────────────────────────────────────────

function Toolbar({
  query,
  onQueryChange,
  placeholder,
  rightSlot,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  placeholder: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="relative w-full md:max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-6"
          strokeWidth={1.75}
        />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          className="h-10 w-full rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-paper)] pl-9 pr-3 text-[13px] font-medium text-ink-0 outline-none transition-[box-shadow,border-color] placeholder:text-ink-6 focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)]"
        />
      </div>
      {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center rounded-full px-3 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
        active
          ? "bg-ink-0 text-ink-12"
          : "border border-[color:var(--hairline)] bg-[var(--surface-paper)] text-ink-3 hover:bg-[var(--surface-2)]",
      )}
    >
      {label}
    </button>
  );
}

function EmptyResults({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--r-md)] border border-dashed border-[color:var(--hairline)] bg-[var(--surface-1)] py-16 text-center">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-paper)]">
        {icon}
      </div>
      <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink-0">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[12px] leading-[1.5] text-ink-5">{subtitle}</p>
    </div>
  );
}

// ─── External icon resolver ──────────────────────────────────────────────
// Self-contained map for the external registry so we don't depend on the
// internal app-icon list (which may grow on its own cadence).

const EXTERNAL_ICONS: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  BarChart3,
  Activity,
  Mail,
  Send,
  Zap,
  Users,
  MessageSquare,
  Target,
  Building2,
  Boxes,
  Package,
  ShieldCheck,
  Sparkles,
  Globe2,
};

function getExternalIcon(name: string) {
  return EXTERNAL_ICONS[name] ?? Package;
}
