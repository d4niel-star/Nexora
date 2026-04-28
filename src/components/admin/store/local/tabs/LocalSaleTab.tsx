"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Search, Plus, Trash2, Check, AlertTriangle, ShoppingBag } from "lucide-react";

import { AdminPanel } from "@/components/admin/primitives/AdminPanel";
import { createInStoreSale, searchVariantsForSaleAction } from "@/lib/local-store/actions";
import type { CashSessionSummary } from "@/lib/local-store/types";

interface Props {
  openSession: CashSessionSummary | null;
}

interface VariantSearchHit {
  variantId: string;
  productId: string;
  productTitle: string;
  variantTitle: string;
  sku: string | null;
  unitPrice: number;
  imageUrl: string | null;
  localStock: number;
}

interface CartLine {
  variantId: string;
  productTitle: string;
  variantTitle: string;
  unitPrice: number;
  quantity: number;
  localStock: number;
}

type PaymentMethod = "cash" | "card" | "transfer" | "other";

const formatARS = (value: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);

export function LocalSaleTab({ openSession }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VariantSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountAmount, setDiscountAmount] = useState<string>("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentNote, setPaymentNote] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [isSaving, startSaving] = useTransition();
  const [feedback, setFeedback] = useState<
    | { kind: "ok"; saleNumber: number; total: number }
    | { kind: "err"; msg: string }
    | null
  >(null);

  const searchAbort = useRef<AbortController | null>(null);

  // ── Debounced search ──────────────────────────────────────────────
  useEffect(() => {
    const term = query.trim();
    if (term.length < 1) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      searchAbort.current?.abort();
      const ctrl = new AbortController();
      searchAbort.current = ctrl;
      try {
        const hits = await searchVariantsForSaleAction(term);
        if (!ctrl.signal.aborted) {
          setResults(hits);
          setShowResults(true);
        }
      } finally {
        if (!ctrl.signal.aborted) setSearching(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [query]);

  function addToCart(hit: VariantSearchHit) {
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.variantId === hit.variantId);
      if (idx >= 0) {
        const next = [...prev];
        const line = next[idx];
        if (line.quantity + 1 > hit.localStock) return prev;
        next[idx] = { ...line, quantity: line.quantity + 1 };
        return next;
      }
      if (hit.localStock <= 0) return prev;
      return [
        ...prev,
        {
          variantId: hit.variantId,
          productTitle: hit.productTitle,
          variantTitle: hit.variantTitle,
          unitPrice: hit.unitPrice,
          quantity: 1,
          localStock: hit.localStock,
        },
      ];
    });
    setQuery("");
    setResults([]);
    setShowResults(false);
  }

  function updateQuantity(variantId: string, qty: number) {
    setCart((prev) =>
      prev.map((l) => {
        if (l.variantId !== variantId) return l;
        const clamped = Math.max(1, Math.min(qty, l.localStock));
        return { ...l, quantity: clamped };
      }),
    );
  }

  function removeLine(variantId: string) {
    setCart((prev) => prev.filter((l) => l.variantId !== variantId));
  }

  const subtotal = useMemo(
    () => cart.reduce((acc, l) => acc + l.unitPrice * l.quantity, 0),
    [cart],
  );
  const discountNum = Math.max(0, Math.min(subtotal, Number(discountAmount) || 0));
  const total = Math.max(0, subtotal - discountNum);

  const cashRequiresOpenSession = paymentMethod === "cash" && !openSession;
  const canSubmit = cart.length > 0 && !cashRequiresOpenSession && !isSaving;

  function handleSubmit() {
    setFeedback(null);
    if (cart.length === 0) {
      setFeedback({ kind: "err", msg: "Agregá al menos un producto" });
      return;
    }
    if (cashRequiresOpenSession) {
      setFeedback({
        kind: "err",
        msg: "Para registrar venta en efectivo, abrí la caja primero (tab Caja diaria)",
      });
      return;
    }
    startSaving(async () => {
      const res = await createInStoreSale({
        items: cart.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        paymentMethod,
        paymentNote: paymentNote || null,
        discountAmount: discountNum,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
      });
      if (res.success && res.data) {
        setFeedback({ kind: "ok", saleNumber: res.data.saleNumber, total: res.data.total });
        setCart([]);
        setDiscountAmount("0");
        setPaymentNote("");
        setCustomerName("");
        setCustomerPhone("");
      } else if (!res.success) {
        setFeedback({ kind: "err", msg: res.error });
      }
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* ── Cart + search ────────────────────────────────────────── */}
      <div className="lg:col-span-2">
        <AdminPanel
          title="Productos"
          description="Buscá en tu catálogo y agregá los productos que el cliente está llevando."
        >
          {/* Search */}
          <div style={{ position: "relative", marginBottom: 12 }}>
            <div className="nx-cmd-bar__search" style={{ width: "100%" }}>
              <Search className="nx-cmd-bar__search-icon" size={14} strokeWidth={1.75} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setShowResults(true)}
                onBlur={() => setTimeout(() => setShowResults(false), 200)}
                placeholder="Buscar producto por nombre o SKU…"
              />
            </div>
            {showResults && results.length > 0 ? (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  right: 0,
                  background: "var(--studio-paper)",
                  border: "1px solid var(--studio-line)",
                  borderRadius: 6,
                  maxHeight: 320,
                  overflowY: "auto",
                  zIndex: 20,
                  boxShadow: "0 4px 16px rgba(0,0,32,0.06)",
                }}
              >
                {results.map((hit) => (
                  <button
                    key={hit.variantId}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addToCart(hit);
                    }}
                    disabled={hit.localStock <= 0}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      background: "transparent",
                      border: "none",
                      borderBottom: "1px solid var(--studio-line)",
                      cursor: hit.localStock <= 0 ? "not-allowed" : "pointer",
                      opacity: hit.localStock <= 0 ? 0.5 : 1,
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        flexShrink: 0,
                        borderRadius: 4,
                        background: "var(--studio-paper-soft)",
                        backgroundImage: hit.imageUrl ? `url(${hit.imageUrl})` : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        border: "1px solid var(--studio-line)",
                      }}
                    />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink-0)" }}>
                        {hit.productTitle}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--ink-5)" }}>
                        {hit.variantTitle}
                        {hit.sku ? ` · ${hit.sku}` : ""}
                      </span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-1)" }}>
                      {formatARS(hit.unitPrice)}
                    </span>
                    <span
                      style={{
                        fontSize: 10.5,
                        color: hit.localStock <= 0 ? "#a3262e" : "var(--ink-5)",
                        marginLeft: 8,
                      }}
                    >
                      {hit.localStock <= 0 ? "Sin stock" : `${hit.localStock} en local`}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
            {searching ? (
              <span
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 11,
                  color: "var(--ink-5)",
                }}
              >
                Buscando…
              </span>
            ) : null}
          </div>

          {/* Cart */}
          {cart.length === 0 ? (
            <div
              style={{
                padding: "32px 12px",
                textAlign: "center",
                color: "var(--ink-5)",
                fontSize: 12.5,
              }}
            >
              <ShoppingBag size={20} strokeWidth={1.5} />
              <p style={{ marginTop: 8 }}>Buscá productos para agregar a la venta.</p>
            </div>
          ) : (
            <table className="nx-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th style={{ textAlign: "right", width: 140 }}>Cantidad</th>
                  <th style={{ textAlign: "right" }}>Precio</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                  <th style={{ width: 32 }}></th>
                </tr>
              </thead>
              <tbody>
                {cart.map((l) => (
                  <tr key={l.variantId}>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{l.productTitle}</span>
                        <span style={{ fontSize: 11.5, color: "var(--ink-5)" }}>
                          {l.variantTitle} · {l.localStock} en local
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <input
                        className="nx-input"
                        inputMode="numeric"
                        value={l.quantity.toString()}
                        onChange={(e) =>
                          updateQuantity(l.variantId, Number(e.target.value.replace(/[^0-9]/g, "")) || 1)
                        }
                        style={{
                          width: 70,
                          height: 28,
                          padding: "0 8px",
                          fontSize: 12.5,
                          textAlign: "right",
                        }}
                      />
                    </td>
                    <td style={{ textAlign: "right", fontSize: 13 }}>{formatARS(l.unitPrice)}</td>
                    <td style={{ textAlign: "right", fontSize: 13, fontWeight: 500 }}>
                      {formatARS(l.unitPrice * l.quantity)}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => removeLine(l.variantId)}
                        aria-label="Quitar"
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 4,
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--ink-5)",
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </AdminPanel>
      </div>

      {/* ── Sidebar with payment + customer ──────────────────────── */}
      <div className="lg:col-span-1 flex flex-col gap-4">
        <AdminPanel title="Pago" description="Método y descuento de la venta.">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Método de pago" required>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {(
                  [
                    { value: "cash" as const, label: "Efectivo" },
                    { value: "card" as const, label: "Tarjeta" },
                    { value: "transfer" as const, label: "Transferencia" },
                    { value: "other" as const, label: "Otro" },
                  ]
                ).map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    className="nx-chip"
                    data-active={paymentMethod === m.value ? "true" : undefined}
                    onClick={() => setPaymentMethod(m.value)}
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Detalle del pago (opcional)">
              <input
                className="nx-input"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder={
                  paymentMethod === "card"
                    ? "Visa débito, 1 cuota"
                    : paymentMethod === "transfer"
                      ? "CBU / alias"
                      : "Detalle"
                }
              />
            </Field>
            <Field label="Descuento ($)">
              <input
                className="nx-input"
                inputMode="numeric"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              />
            </Field>
          </div>
        </AdminPanel>

        <AdminPanel title="Cliente" description="Opcional — solo nombre y teléfono.">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Nombre">
              <input
                className="nx-input"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Cliente del local"
              />
            </Field>
            <Field label="Teléfono">
              <input
                className="nx-input"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </Field>
          </div>
        </AdminPanel>

        {/* Totals */}
        <div
          style={{
            border: "1px solid var(--studio-line)",
            borderRadius: 8,
            background: "var(--studio-paper)",
            padding: 14,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <Row label="Subtotal" value={formatARS(subtotal)} />
          {discountNum > 0 ? (
            <Row label="Descuento" value={`− ${formatARS(discountNum)}`} />
          ) : null}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid var(--studio-line)",
              paddingTop: 8,
              marginTop: 4,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-0)" }}>Total</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: "var(--ink-0)" }}>
              {formatARS(total)}
            </span>
          </div>

          {cashRequiresOpenSession ? (
            <div
              style={{
                marginTop: 8,
                padding: "8px 10px",
                background: "rgba(186, 116, 0, 0.10)",
                color: "#8a5a00",
                fontSize: 11.5,
                borderRadius: 4,
                display: "flex",
                gap: 6,
                alignItems: "flex-start",
              }}
            >
              <AlertTriangle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
              <span>Necesitás abrir caja antes de registrar una venta en efectivo.</span>
            </div>
          ) : null}

          {feedback?.kind === "ok" ? (
            <div
              style={{
                marginTop: 8,
                padding: "8px 10px",
                background: "rgba(34, 153, 84, 0.10)",
                color: "#1d6f3f",
                fontSize: 12,
                borderRadius: 4,
                display: "flex",
                gap: 6,
                alignItems: "center",
              }}
            >
              <Check size={14} />
              Venta #{feedback.saleNumber} registrada · {formatARS(feedback.total)}
            </div>
          ) : null}
          {feedback?.kind === "err" ? (
            <div
              style={{
                marginTop: 8,
                padding: "8px 10px",
                background: "rgba(163, 38, 46, 0.08)",
                color: "#a3262e",
                fontSize: 12,
                borderRadius: 4,
              }}
            >
              {feedback.msg}
            </div>
          ) : null}

          <button
            className="nx-action nx-action--primary"
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{ marginTop: 10, height: 36 }}
          >
            <Plus size={14} strokeWidth={2} />
            {isSaving ? "Registrando…" : "Registrar venta"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11.5, color: "var(--ink-5)", fontWeight: 500 }}>
        {label}
        {required ? <span style={{ color: "#a3262e" }}> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
      <span style={{ color: "var(--ink-5)" }}>{label}</span>
      <span style={{ color: "var(--ink-1)" }}>{value}</span>
    </div>
  );
}
