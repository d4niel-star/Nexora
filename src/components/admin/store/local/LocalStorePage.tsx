"use client";

// ─── Local físico · página principal ────────────────────────────────
//
// Studio v4 surface. Operates the merchant's physical retail location:
// perfil + horarios, retiro en tienda, stock local, venta presencial
// y caja diaria. Every action is wired to a real server action; nothing
// here is decorative.

import { useMemo, useState } from "react";
import { Plus, Power, Wallet, MapPin, Store as StoreIcon } from "lucide-react";

import { AdminPanel } from "@/components/admin/primitives/AdminPanel";
import { AdminMetric } from "@/components/admin/primitives/AdminMetric";
import { AdminPillTabs } from "@/components/admin/primitives/AdminPillTabs";
import type {
  CashSessionSummary,
  DailyOperationalSummary,
  LocalStockRow,
  LocationProfile,
  PickupOrderRow,
} from "@/lib/local-store/types";
import { LocalProfileTab } from "./tabs/LocalProfileTab";
import { LocalPickupTab } from "./tabs/LocalPickupTab";
import { LocalStockTab } from "./tabs/LocalStockTab";
import { LocalSaleTab } from "./tabs/LocalSaleTab";
import { LocalCashTab } from "./tabs/LocalCashTab";

type Tab = "profile" | "pickup" | "stock" | "sale" | "cash";

interface Props {
  profile: LocationProfile;
  summary: DailyOperationalSummary;
  stockRows: LocalStockRow[];
  openSession: CashSessionSummary | null;
  pickupOrders: PickupOrderRow[];
}

const formatARS = (value: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);

export function LocalStorePage({
  profile,
  summary,
  stockRows,
  openSession,
  pickupOrders,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>(
    summary.hasOpenCashSession ? "sale" : "profile",
  );

  const tabs = useMemo(
    () => [
      { value: "profile" as const, label: "Perfil del local" },
      { value: "pickup" as const, label: "Retiro en tienda" },
      { value: "stock" as const, label: "Stock local", count: profile ? null : null },
      { value: "sale" as const, label: "Venta presencial" },
      { value: "cash" as const, label: "Caja diaria" },
    ],
    [profile],
  );

  return (
    <div className="nx-page">
      {/* ── Header ───────────────────────────────────────────────── */}
      <header className="nx-page-header">
        <div className="nx-page-header__row">
          <div>
            <h1 className="nx-page-header__title">Local físico</h1>
            <p className="nx-page-header__sub">
              Administrá tu tienda física desde Nexora · {profile.name}
            </p>
          </div>
          <div className="nx-page-header__actions">
            <StatusPill
              icon={<MapPin size={12} strokeWidth={2} />}
              label={profile.openCloseLabel}
              tone={profile.isOpenNow ? "success" : "neutral"}
            />
            <StatusPill
              icon={<Wallet size={12} strokeWidth={2} />}
              label={openSession ? "Caja abierta" : "Caja cerrada"}
              tone={openSession ? "success" : "muted"}
            />
            <StatusPill
              icon={<Power size={12} strokeWidth={2} />}
              label={profile.pickupEnabled ? "Retiro activo" : "Retiro inactivo"}
              tone={profile.pickupEnabled ? "success" : "muted"}
            />
          </div>
        </div>
      </header>

      {/* ── Resumen operativo ────────────────────────────────────── */}
      <section className="mb-6">
        <div className="nx-stat-row" style={{ ["--nx-cols" as string]: "4" }}>
          <div className="nx-stat">
            <span className="nx-stat__label">Ventas presenciales hoy</span>
            <span className="nx-stat__row">
              <span className="nx-stat__value">{summary.salesCountToday}</span>
            </span>
            <span className="nx-stat__hint">
              {summary.salesTotalToday > 0
                ? formatARS(summary.salesTotalToday)
                : "Sin ventas registradas"}
            </span>
          </div>
          <div className="nx-stat">
            <span className="nx-stat__label">Caja</span>
            <span className="nx-stat__row">
              <span className="nx-stat__value">
                {openSession ? formatARS(openSession.cashSalesTotal + openSession.openingCash - openSession.totalExpenses) : "—"}
              </span>
            </span>
            <span className="nx-stat__hint">
              {openSession
                ? `Apertura ${formatARS(openSession.openingCash)} · ${openSession.totalSalesCount} ventas`
                : "Sin caja abierta"}
            </span>
          </div>
          <div className="nx-stat">
            <span className="nx-stat__label">Pedidos para retirar</span>
            <span className="nx-stat__row">
              <span className="nx-stat__value">{summary.pendingPickupOrders}</span>
            </span>
            <span className="nx-stat__hint">
              {profile.pickupEnabled ? "Retiro activo" : "Retiro desactivado"}
            </span>
          </div>
          <div className="nx-stat">
            <span className="nx-stat__label">Stock bajo / agotado</span>
            <span className="nx-stat__row">
              <span className="nx-stat__value">
                {summary.localLowStockCount + summary.localOutOfStockCount}
              </span>
            </span>
            <span className="nx-stat__hint">
              {summary.localOutOfStockCount > 0
                ? `${summary.localOutOfStockCount} sin stock`
                : "Todo en orden"}
            </span>
          </div>
        </div>
      </section>

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <div className="mb-5">
        <AdminPillTabs<Tab> tabs={tabs} active={activeTab} onChange={setActiveTab} />
      </div>

      {/* ── Tab content ─────────────────────────────────────────── */}
      {activeTab === "profile" ? (
        <LocalProfileTab profile={profile} />
      ) : activeTab === "pickup" ? (
        <LocalPickupTab profile={profile} pickupOrders={pickupOrders} />
      ) : activeTab === "stock" ? (
        <LocalStockTab initialRows={stockRows} />
      ) : activeTab === "sale" ? (
        <LocalSaleTab openSession={openSession} />
      ) : (
        <LocalCashTab openSession={openSession} />
      )}
    </div>
  );
}

// ─── Compact status pill used in the header ──────────────────────────
function StatusPill({
  icon,
  label,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "success" | "neutral" | "muted";
}) {
  const colors: Record<typeof tone, { bg: string; fg: string; dot: string }> = {
    success: { bg: "rgba(34, 153, 84, 0.10)", fg: "#1d6f3f", dot: "#22a05a" },
    neutral: { bg: "rgba(0, 0, 32, 0.05)", fg: "var(--ink-1)", dot: "var(--ink-3)" },
    muted: { bg: "rgba(0, 0, 32, 0.04)", fg: "var(--ink-5)", dot: "var(--ink-7)" },
  };
  const c = colors[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 26,
        padding: "0 10px",
        borderRadius: 999,
        background: c.bg,
        color: c.fg,
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      <span style={{ display: "inline-flex", color: c.dot }}>{icon}</span>
      {label}
    </span>
  );
}

// Suppress unused import warning for icons referenced indirectly.
void Plus;
void StoreIcon;
void AdminPanel;
void AdminMetric;
