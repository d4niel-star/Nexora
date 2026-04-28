"use client";

import { useEffect, useState, useTransition } from "react";
import { Wallet, Plus, Minus, X, Check, AlertCircle } from "lucide-react";

import { AdminPanel } from "@/components/admin/primitives/AdminPanel";
import {
  closeCashSession,
  getCashSessionByIdAction,
  getCashSessionMovementsAction,
  getCashSessionSalesAction,
  openCashSession,
  registerCashExpense,
} from "@/lib/local-store/actions";
import type {
  CashMovementRow,
  CashSessionSummary,
  InStoreSaleRow,
} from "@/lib/local-store/types";

interface Props {
  openSession: CashSessionSummary | null;
}

const formatARS = (value: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);

export function LocalCashTab({ openSession }: Props) {
  if (!openSession) {
    return <OpenCashCard />;
  }
  return <ActiveCashCard session={openSession} />;
}

// ─── Card cuando NO hay caja abierta ─────────────────────────────────
function OpenCashCard() {
  const [opening, setOpening] = useState<string>("0");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleOpen() {
    setError(null);
    const value = Number(opening) || 0;
    if (value < 0) {
      setError("Efectivo inicial inválido");
      return;
    }
    startTransition(async () => {
      const res = await openCashSession(value);
      if (!res.success) setError(res.error);
      // On success the page re-renders via revalidatePath and the
      // server-rendered openSession appears.
    });
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <AdminPanel
        title="Abrir caja"
        description="Declarás cuánto efectivo hay en la caja al iniciar el día. Las ventas presenciales se asocian a esta caja."
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "16px 14px",
              border: "1px solid var(--studio-line)",
              borderRadius: 8,
              background: "var(--studio-paper-soft)",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--ink-9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--ink-3)",
              }}
            >
              <Wallet size={18} strokeWidth={1.75} />
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--ink-0)" }}>
                Caja sin abrir
              </span>
              <span style={{ display: "block", fontSize: 12, color: "var(--ink-5)" }}>
                Para registrar ventas en efectivo necesitás abrir caja primero.
              </span>
            </div>
          </div>

          <Field label="Efectivo inicial" hint="Lo que hay físicamente en la caja al abrir.">
            <input
              className="nx-input"
              inputMode="numeric"
              value={opening}
              onChange={(e) => setOpening(e.target.value.replace(/[^0-9.]/g, ""))}
            />
          </Field>

          {error ? (
            <div
              style={{
                padding: "8px 10px",
                background: "rgba(163, 38, 46, 0.08)",
                color: "#a3262e",
                fontSize: 12,
                borderRadius: 4,
              }}
            >
              {error}
            </div>
          ) : null}

          <button
            className="nx-action nx-action--primary"
            onClick={handleOpen}
            disabled={isPending}
            style={{ height: 36 }}
          >
            <Plus size={14} strokeWidth={2} />
            {isPending ? "Abriendo…" : "Abrir caja"}
          </button>
        </div>
      </AdminPanel>
    </div>
  );
}

// ─── Card cuando HAY caja abierta ────────────────────────────────────
function ActiveCashCard({ session }: { session: CashSessionSummary }) {
  const [movements, setMovements] = useState<CashMovementRow[]>([]);
  const [sales, setSales] = useState<InStoreSaleRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Refresh movements + sales whenever the session id changes.
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    Promise.all([getCashSessionMovementsAction(session.id), getCashSessionSalesAction(session.id)])
      .then(([m, s]) => {
        if (cancelled) return;
        setMovements(m);
        setSales(s);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session.id]);

  // Expense form
  const [expenseAmount, setExpenseAmount] = useState<string>("");
  const [expenseReason, setExpenseReason] = useState<string>("");
  const [expensePending, startExpense] = useTransition();
  const [expenseError, setExpenseError] = useState<string | null>(null);

  function handleAddExpense() {
    setExpenseError(null);
    const amount = Number(expenseAmount) || 0;
    if (amount <= 0) {
      setExpenseError("Indicá un monto mayor a 0");
      return;
    }
    if (expenseReason.trim().length < 2) {
      setExpenseError("Indicá un motivo");
      return;
    }
    startExpense(async () => {
      const res = await registerCashExpense(session.id, amount, expenseReason.trim());
      if (!res.success) {
        setExpenseError(res.error);
        return;
      }
      // Pull fresh data
      const [m, latest] = await Promise.all([
        getCashSessionMovementsAction(session.id),
        getCashSessionByIdAction(session.id),
      ]);
      setMovements(m);
      // local mutate the totals from latest summary, but the page
      // header summary will refresh via revalidatePath as well.
      if (latest) {
        // total expenses display lives in the summary panel on the right;
        // the easiest way is to refresh that local state.
        setLocalSummary(latest);
      }
      setExpenseAmount("");
      setExpenseReason("");
    });
  }

  // Allow optimistic updates of the summary panel without waiting for
  // a full server round-trip on every interaction.
  const [localSummary, setLocalSummary] = useState<CashSessionSummary>(session);
  useEffect(() => setLocalSummary(session), [session]);

  // Close form
  const [counted, setCounted] = useState<string>(
    (session.openingCash + session.cashSalesTotal - session.totalExpenses).toString(),
  );
  const [closeNotes, setCloseNotes] = useState("");
  const [closePending, startClose] = useTransition();
  const [closeError, setCloseError] = useState<string | null>(null);
  const [closeResult, setCloseResult] = useState<{ difference: number; expectedCash: number } | null>(
    null,
  );

  function handleClose() {
    setCloseError(null);
    const value = Number(counted) || 0;
    if (value < 0) {
      setCloseError("Efectivo contado inválido");
      return;
    }
    startClose(async () => {
      const res = await closeCashSession(session.id, value, closeNotes || null);
      if (!res.success) {
        setCloseError(res.error);
        return;
      }
      setCloseResult(res.data ?? null);
    });
  }

  const expectedNow =
    localSummary.openingCash + localSummary.cashSalesTotal - localSummary.totalExpenses;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* ── Resumen ─────────────────────────────────────────────── */}
      <div className="lg:col-span-1">
        <AdminPanel title="Resumen de la caja" description="Lo que estuvo entrando y saliendo.">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <SummaryRow label="Efectivo inicial" value={formatARS(localSummary.openingCash)} />
            <SummaryRow label="Ventas en efectivo" value={`+ ${formatARS(localSummary.cashSalesTotal)}`} />
            <SummaryRow label="Egresos" value={`− ${formatARS(localSummary.totalExpenses)}`} />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: 8,
                marginTop: 4,
                borderTop: "1px solid var(--studio-line)",
              }}
            >
              <span style={{ fontSize: 12.5, color: "var(--ink-5)" }}>Esperado en caja</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--ink-0)" }}>
                {formatARS(expectedNow)}
              </span>
            </div>
            <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--ink-5)" }}>
              Otros métodos · tarjeta {formatARS(localSummary.cardSalesTotal)} · transf{" "}
              {formatARS(localSummary.transferSalesTotal)} · otro {formatARS(localSummary.otherSalesTotal)}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ink-5)" }}>
              Ventas registradas · {localSummary.totalSalesCount} · total{" "}
              {formatARS(localSummary.totalSales)}
            </div>
          </div>
        </AdminPanel>
      </div>

      {/* ── Egresos ─────────────────────────────────────────────── */}
      <div className="lg:col-span-2">
        <AdminPanel title="Egresos" description="Cualquier dinero que sale de la caja.">
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "120px 1fr 110px", alignItems: "end" }}>
            <Field label="Monto">
              <input
                className="nx-input"
                inputMode="numeric"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="0"
              />
            </Field>
            <Field label="Motivo">
              <input
                className="nx-input"
                value={expenseReason}
                onChange={(e) => setExpenseReason(e.target.value)}
                placeholder="Compra de café para el local"
              />
            </Field>
            <button
              className="nx-action"
              onClick={handleAddExpense}
              disabled={expensePending}
              style={{ height: 32 }}
            >
              <Minus size={12} strokeWidth={2} />
              {expensePending ? "…" : "Registrar"}
            </button>
          </div>
          {expenseError ? (
            <div
              style={{
                marginTop: 8,
                padding: "6px 10px",
                background: "rgba(163, 38, 46, 0.08)",
                color: "#a3262e",
                fontSize: 12,
                borderRadius: 4,
              }}
            >
              {expenseError}
            </div>
          ) : null}

          <div style={{ marginTop: 14 }}>
            {isLoading ? (
              <p style={{ fontSize: 12, color: "var(--ink-5)" }}>Cargando movimientos…</p>
            ) : movements.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--ink-5)" }}>
                Sin egresos registrados todavía.
              </p>
            ) : (
              <table className="nx-table">
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Motivo</th>
                    <th style={{ textAlign: "right" }}>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id}>
                      <td style={{ fontSize: 12, color: "var(--ink-5)" }}>
                        {new Date(m.createdAt).toLocaleTimeString("es-AR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td style={{ fontSize: 12.5 }}>{m.reason}</td>
                      <td style={{ textAlign: "right", fontSize: 12.5, color: "#a3262e" }}>
                        − {formatARS(m.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </AdminPanel>
      </div>

      {/* ── Ventas presenciales del día ─────────────────────────── */}
      <div className="lg:col-span-3">
        <AdminPanel title="Ventas presenciales de la caja">
          {isLoading ? (
            <p style={{ fontSize: 12, color: "var(--ink-5)" }}>Cargando ventas…</p>
          ) : sales.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--ink-5)" }}>
              Todavía no se registraron ventas presenciales en esta caja.
            </p>
          ) : (
            <table className="nx-table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Venta</th>
                  <th>Cliente</th>
                  <th>Método</th>
                  <th style={{ textAlign: "right" }}>Items</th>
                  <th>Hora</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontSize: 12.5, fontWeight: 600 }}>#{s.saleNumber}</td>
                    <td style={{ fontSize: 12.5, color: "var(--ink-1)" }}>
                      {s.customerName ?? "—"}
                    </td>
                    <td style={{ fontSize: 12, color: "var(--ink-5)" }}>{s.paymentMethod}</td>
                    <td style={{ textAlign: "right", fontSize: 12.5 }}>{s.itemCount}</td>
                    <td style={{ fontSize: 12, color: "var(--ink-5)" }}>
                      {new Date(s.createdAt).toLocaleTimeString("es-AR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td style={{ textAlign: "right", fontSize: 12.5, fontWeight: 500 }}>
                      {formatARS(s.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </AdminPanel>
      </div>

      {/* ── Cierre de caja ──────────────────────────────────────── */}
      <div className="lg:col-span-3">
        <AdminPanel
          title="Cerrar caja"
          description="Contás el efectivo físico y registrás la diferencia con lo esperado."
        >
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "200px 1fr 140px", alignItems: "end" }}>
            <Field label="Efectivo contado" hint={`Esperado: ${formatARS(expectedNow)}`}>
              <input
                className="nx-input"
                inputMode="numeric"
                value={counted}
                onChange={(e) => setCounted(e.target.value.replace(/[^0-9.]/g, ""))}
              />
            </Field>
            <Field label="Notas de cierre (opcional)">
              <input
                className="nx-input"
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                placeholder="Observaciones del cierre"
              />
            </Field>
            <button
              className="nx-action nx-action--primary"
              onClick={handleClose}
              disabled={closePending || closeResult !== null}
              style={{ height: 36 }}
            >
              <X size={14} strokeWidth={2} />
              {closeResult !== null ? "Cerrada" : closePending ? "Cerrando…" : "Cerrar caja"}
            </button>
          </div>

          {closeError ? (
            <div
              style={{
                marginTop: 10,
                padding: "8px 10px",
                background: "rgba(163, 38, 46, 0.08)",
                color: "#a3262e",
                fontSize: 12,
                borderRadius: 4,
                display: "flex",
                gap: 6,
                alignItems: "center",
              }}
            >
              <AlertCircle size={14} />
              {closeError}
            </div>
          ) : null}

          {closeResult !== null ? (
            <div
              style={{
                marginTop: 10,
                padding: "10px 12px",
                background: "rgba(34, 153, 84, 0.10)",
                color: "#1d6f3f",
                fontSize: 12.5,
                borderRadius: 4,
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              <Check size={14} />
              <span>
                Caja cerrada · esperado <strong>{formatARS(closeResult.expectedCash)}</strong> ·
                diferencia{" "}
                <strong style={{ color: Math.abs(closeResult.difference) > 0.001 ? "#8a5a00" : "inherit" }}>
                  {closeResult.difference >= 0 ? "+" : "−"}
                  {formatARS(Math.abs(closeResult.difference))}
                </strong>
              </span>
            </div>
          ) : null}
        </AdminPanel>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
      <span style={{ color: "var(--ink-5)" }}>{label}</span>
      <span style={{ color: "var(--ink-1)" }}>{value}</span>
    </div>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11.5, color: "var(--ink-5)", fontWeight: 500 }}>{label}</span>
      {children}
      {hint ? (
        <span style={{ fontSize: 10.5, color: "var(--ink-7)" }}>{hint}</span>
      ) : null}
    </label>
  );
}
