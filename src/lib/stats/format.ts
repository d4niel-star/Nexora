// ─── Stats formatting utilities ─────────────────────────────────────────
// Pure functions with zero server dependencies. Safe for client bundles.

const ARS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const NUM = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

export function fmtCurrency(v: number): string {
  return ARS.format(v);
}

export function fmtNumber(v: number): string {
  return NUM.format(v);
}

export function fmtPercent(v: number | null): string {
  if (v === null) return "—";
  return `${v >= 0 ? "+" : ""}${NUM.format(v)}%`;
}