"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import { APP_CATEGORIES, type AppCategory } from "@/lib/apps/registry";
import type { AppCatalogItem } from "@/lib/apps/queries";

import { AppStatusBadge } from "./AppStatusBadge";
import { getAppIcon } from "./appIcons";

interface Props {
  catalog: AppCatalogItem[];
  summary: { installed: number; total: number; comingSoon: number };
}

type FilterKey = "all" | "installed" | "available" | "coming-soon" | AppCategory;

export function AppsCatalog({ catalog, summary }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((item) => {
      const { definition, availability, state } = item;

      // Text search across name, short description and tags.
      if (q) {
        const haystack = [
          definition.name,
          definition.shortDescription,
          ...(definition.tags ?? []),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (filter === "all") return true;
      if (filter === "installed") return state.installed && state.status === "active";
      if (filter === "available")
        return availability.kind === "available" && !state.installed;
      if (filter === "coming-soon") return availability.kind === "coming-soon";
      return definition.category === filter;
    });
  }, [catalog, query, filter]);

  const categoriesWithCounts = useMemo(() => {
    return APP_CATEGORIES.map((c) => ({
      ...c,
      count: catalog.filter((a) => a.definition.category === c.key).length,
    })).filter((c) => c.count > 0);
  }, [catalog]);

  return (
    <div className="space-y-8">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-5"
            strokeWidth={1.75}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar apps por nombre, problema o tag…"
            className="w-full h-10 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] pl-9 pr-3 text-[13px] text-ink-0 outline-none transition-[box-shadow,border-color] placeholder:text-ink-6 focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)]"
          />
        </div>
        <div className="inline-flex items-center gap-1.5 h-10 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-3">
          <SlidersHorizontal className="h-3.5 w-3.5 text-ink-5" strokeWidth={1.75} />
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">
            {summary.installed} / {summary.total} instaladas
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5">
        <FilterPill
          label="Todas"
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
        <FilterPill
          label={`Instaladas (${summary.installed})`}
          active={filter === "installed"}
          onClick={() => setFilter("installed")}
        />
        <FilterPill
          label="Disponibles"
          active={filter === "available"}
          onClick={() => setFilter("available")}
        />
        {summary.comingSoon > 0 && (
          <FilterPill
            label={`Próximamente (${summary.comingSoon})`}
            active={filter === "coming-soon"}
            onClick={() => setFilter("coming-soon")}
          />
        )}
        <span className="mx-1 h-6 w-px self-center bg-[color:var(--hairline)]" />
        {categoriesWithCounts.map((c) => (
          <FilterPill
            key={c.key}
            label={c.label}
            active={filter === c.key}
            onClick={() => setFilter(c.key)}
          />
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[var(--r-md)] border border-dashed border-[color:var(--hairline)] bg-[var(--surface-1)] py-20 text-center">
          <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)]">
            <Search className="h-5 w-5 text-ink-5" strokeWidth={1.5} />
          </div>
          <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-ink-0">
            Sin resultados
          </h3>
          <p className="mt-2 max-w-sm text-[13px] leading-[1.55] text-ink-5">
            Probá otro término o cambiá el filtro. No vas a encontrar apps
            inventadas — solo las que resuelven algo real.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <AppCard key={item.definition.slug} item={item} />
          ))}
        </div>
      )}
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
        "inline-flex items-center h-8 px-3 rounded-[var(--r-sm)] text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
        active
          ? "bg-ink-0 text-ink-12"
          : "border border-[color:var(--hairline)] bg-[var(--surface-0)] text-ink-3 hover:bg-[var(--surface-2)]",
      )}
    >
      {label}
    </button>
  );
}

function AppCard({ item }: { item: AppCatalogItem }) {
  const { definition, availability, state } = item;
  const Icon = getAppIcon(definition.iconName);
  const categoryLabel =
    APP_CATEGORIES.find((c) => c.key === definition.category)?.label ??
    definition.category;

  return (
    <Link
      href={`/admin/apps/${definition.slug}`}
      className="group relative flex flex-col rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5 transition-colors hover:bg-[var(--surface-1)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
          <Icon className="h-5 w-5 text-ink-0" strokeWidth={1.6} />
        </div>
        <AppStatusBadge availability={availability} installState={state} />
      </div>

      <h3 className="mt-4 text-[15px] font-semibold tracking-[-0.01em] text-ink-0">
        {definition.name}
      </h3>
      <p className="mt-1.5 line-clamp-3 text-[13px] leading-[1.55] text-ink-5">
        {definition.shortDescription}
      </p>

      <div className="mt-auto pt-4 flex items-center justify-between text-[11px] text-ink-5">
        <span className="font-medium uppercase tracking-[0.14em]">
          {categoryLabel}
        </span>
        {definition.setupTime && !definition.isComingSoon && (
          <span className="tabular-nums">{definition.setupTime}</span>
        )}
      </div>
    </Link>
  );
}
