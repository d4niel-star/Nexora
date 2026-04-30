"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, Package, Check } from "lucide-react";

import { setLocalStock } from "@/lib/local-store/actions";
import type { LocalStockRow } from "@/lib/local-store/types";

interface Props {
  initialRows: LocalStockRow[];
}

const formatARS = (value: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);

type Filter = "all" | "low" | "out";

export function LocalStockTab({ initialRows }: Props) {
  const [rows, setRows] = useState<LocalStockRow[]>(initialRows);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filteredRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "low" && r.status !== "low_stock") return false;
      if (filter === "out" && r.status !== "out_of_stock") return false;
      if (!term) return true;
      const haystack = `${r.productTitle} ${r.variantTitle} ${r.sku ?? ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [rows, query, filter]);

  const counts = useMemo(() => {
    let low = 0;
    let out = 0;
    for (const r of rows) {
      if (r.status === "low_stock") low++;
      else if (r.status === "out_of_stock") out++;
    }
    return { all: rows.length, low, out };
  }, [rows]);

  function handleStockChange(variantId: string, newStock: number) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.variantId !== variantId) return r;
        let status: LocalStockRow["status"] = "ok";
        if (newStock <= 0) status = "out_of_stock";
        else if (newStock <= r.lowStockThreshold) status = "low_stock";
        return { ...r, localStock: newStock, status };
      }),
    );
  }

  return (
    <div className="nx-table-shell">
      {/* ── Toolbar ──────────────────────────────────────────────── */}
      <div className="nx-cmd-bar">
        <div className="nx-cmd-bar__search">
          <Search className="nx-cmd-bar__search-icon" size={14} strokeWidth={1.75} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar producto, variante o SKU…"
          />
        </div>
        <div className="nx-cmd-bar__filters">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="Todos" count={counts.all} />
          <FilterChip active={filter === "low"} onClick={() => setFilter("low")} label="Stock bajo" count={counts.low} />
          <FilterChip active={filter === "out"} onClick={() => setFilter("out")} label="Sin stock" count={counts.out} />
        </div>
      </div>

      {/* ── Tabla ────────────────────────────────────────────────── */}
      {filteredRows.length === 0 ? (
        <EmptyState
          message={
            rows.length === 0
              ? "No hay productos cargados todavía. Cargá productos desde Catálogo y volvé acá para asignarles stock local."
              : "No hay coincidencias con tus filtros."
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="nx-table">
            <thead>
              <tr>
                <th style={{ width: 56 }}></th>
                <th>Producto</th>
                <th>SKU</th>
                <th style={{ textAlign: "right" }}>Precio</th>
                <th style={{ textAlign: "right" }}>Stock online</th>
                <th style={{ textAlign: "right", width: 200 }}>Stock local</th>
                <th style={{ width: 110 }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => (
                <StockRow
                  key={r.variantId}
                  row={r}
                  onLocalChange={(value) => handleStockChange(r.variantId, value)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Channel decoupling note */}
      <div
        style={{
          padding: "8px 12px",
          borderTop: "1px solid var(--studio-line)",
          background: "var(--studio-paper-soft)",
          fontSize: 11.5,
          color: "var(--ink-5)",
          lineHeight: 1.5,
        }}
      >
        El stock local es independiente del stock online. Las ventas presenciales
        y los pedidos con retiro en local descuentan estas unidades; marcar un
        pickup como listo o retirado no vuelve a descontar stock.
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      className="nx-chip"
      data-active={active ? "true" : undefined}
      onClick={onClick}
    >
      {label}
      <span style={{ marginLeft: 6, opacity: 0.7 }}>{count}</span>
    </button>
  );
}

function StockRow({
  row,
  onLocalChange,
}: {
  row: LocalStockRow;
  onLocalChange: (value: number) => void;
}) {
  const [draftStock, setDraftStock] = useState<string>(row.localStock.toString());
  const [draftThreshold, setDraftThreshold] = useState<string>(row.lowStockThreshold.toString());
  const [isPending, startTransition] = useTransition();
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty =
    draftStock !== row.localStock.toString() ||
    draftThreshold !== row.lowStockThreshold.toString();

  function handleSave() {
    setError(null);
    const stockNum = Number(draftStock);
    const thresholdNum = Number(draftThreshold);
    if (!Number.isFinite(stockNum) || stockNum < 0) {
      setError("Stock inválido");
      return;
    }
    if (!Number.isFinite(thresholdNum) || thresholdNum < 0) {
      setError("Umbral inválido");
      return;
    }
    startTransition(async () => {
      const res = await setLocalStock(row.variantId, stockNum, thresholdNum);
      if (res.success) {
        onLocalChange(stockNum);
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1500);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <tr data-selected={savedFlash ? "true" : undefined}>
      <td>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 6,
            border: "1px solid var(--studio-line)",
            background: "var(--studio-paper-soft)",
            backgroundImage: row.imageUrl ? `url(${row.imageUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      </td>
      <td>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-0)" }}>
            {row.productTitle}
          </span>
          <span style={{ fontSize: 11.5, color: "var(--ink-5)" }}>{row.variantTitle}</span>
        </div>
      </td>
      <td>
        <span style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "monospace" }}>
          {row.sku ?? "—"}
        </span>
      </td>
      <td style={{ textAlign: "right", fontSize: 13 }}>{formatARS(row.unitPrice)}</td>
      <td style={{ textAlign: "right", fontSize: 13, color: "var(--ink-3)" }}>
        {row.onlineStock}
      </td>
      <td style={{ textAlign: "right" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <input
            className="nx-input"
            inputMode="numeric"
            value={draftStock}
            onChange={(e) => setDraftStock(e.target.value.replace(/[^0-9]/g, ""))}
            style={{ width: 60, height: 28, padding: "0 8px", fontSize: 12.5, textAlign: "right" }}
            aria-label="Stock local"
          />
          <span style={{ fontSize: 11, color: "var(--ink-7)" }}>·</span>
          <input
            className="nx-input"
            inputMode="numeric"
            value={draftThreshold}
            onChange={(e) => setDraftThreshold(e.target.value.replace(/[^0-9]/g, ""))}
            style={{ width: 44, height: 28, padding: "0 8px", fontSize: 12.5, textAlign: "right" }}
            aria-label="Umbral stock bajo"
            title="Umbral de stock bajo"
          />
          <button
            className="nx-action nx-action--sm"
            onClick={handleSave}
            disabled={!isDirty || isPending}
            style={{ height: 28 }}
            title={error ?? "Guardar"}
          >
            {savedFlash ? <Check size={12} /> : isPending ? "…" : "OK"}
          </button>
        </div>
        {error ? (
          <div style={{ fontSize: 10.5, color: "#a3262e", marginTop: 2 }}>{error}</div>
        ) : null}
      </td>
      <td>
        <StatusBadge status={row.status} />
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: LocalStockRow["status"] }) {
  if (status === "out_of_stock") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "2px 8px",
          borderRadius: 999,
          background: "rgba(163, 38, 46, 0.10)",
          color: "#a3262e",
          fontSize: 11,
          fontWeight: 600,
        }}
      >
        Sin stock
      </span>
    );
  }
  if (status === "low_stock") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "2px 8px",
          borderRadius: 999,
          background: "rgba(186, 116, 0, 0.12)",
          color: "#8a5a00",
          fontSize: 11,
          fontWeight: 600,
        }}
      >
        Stock bajo
      </span>
    );
  }
  return (
    <span style={{ fontSize: 11, color: "var(--ink-5)" }}>OK</span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "60px 20px",
        textAlign: "center",
      }}
    >
      <Package size={28} strokeWidth={1.5} color="var(--ink-7)" />
      <p style={{ fontSize: 13, color: "var(--ink-5)", maxWidth: 360 }}>{message}</p>
    </div>
  );
}
