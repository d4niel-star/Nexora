// ─── CSV Helpers (Phase 7D.4) ────────────────────────────────────────
// RFC-4180 compliant CSV serialization. UTF-8 BOM prepended so Excel
// renders accents (Spanish: é, ñ, á…) correctly without import wizardry.

const UTF8_BOM = "\uFEFF";

export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : String(v);
  // Quote if contains comma, quote, newline, or carriage return.
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function csvRow(cells: unknown[]): string {
  return cells.map(csvCell).join(",");
}

/** Builds a UTF-8-BOM-prefixed CSV string from a header + rows. */
export function buildCsv(header: string[], rows: unknown[][]): string {
  const lines: string[] = [];
  lines.push(csvRow(header));
  for (const r of rows) lines.push(csvRow(r));
  return UTF8_BOM + lines.join("\n");
}

export { UTF8_BOM };
