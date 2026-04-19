import type { AppEmailMetrics } from "@/lib/apps/_shared/metrics";

interface Props {
  title: string;
  /** Natural-language description of WHAT counts as a "send" for this
   *  specific app (e.g. "mensaje WhatsApp entregado al proveedor",
   *  "pedido de reseña entregado al email"). Shown as a caveat under the
   *  card so nobody confuses "sent" with "opened". */
  sentCaveat: string;
  metrics: AppEmailMetrics;
}

const chipBase =
  "inline-flex items-center h-6 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 text-[10px] font-medium uppercase tracking-[0.14em]";

export function AppMetricsCard({ title, sentCaveat, metrics }: Props) {
  const hasActivity = metrics.sentTotal > 0;

  return (
    <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[14px] font-semibold text-ink-0">{title}</h2>
        <span
          className={
            hasActivity
              ? chipBase + " text-[color:var(--signal-success)]"
              : chipBase + " text-ink-5"
          }
        >
          {hasActivity ? "Con actividad" : "Sin actividad todavía"}
        </span>
      </div>

      {!hasActivity ? (
        <p className="mt-4 text-[13px] leading-[1.55] text-ink-5">
          Todavía no hay envíos registrados para esta tienda. Cuando el cron
          dispare el primer mensaje, los contadores se actualizan
          automáticamente desde <code className="font-mono">EmailLog</code>.
        </p>
      ) : (
        <dl className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Últimos 7 días" value={metrics.sentLast7d} />
          <Stat label="Últimos 30 días" value={metrics.sentLast30d} />
          <Stat label="Total histórico" value={metrics.sentTotal} />
          <Stat
            label="Fallos 30 días"
            value={metrics.failedLast30d}
            tone={metrics.failedLast30d > 0 ? "warning" : "neutral"}
          />
        </dl>
      )}

      {metrics.lastSentAt && (
        <p className="mt-4 text-[11px] text-ink-5 tabular-nums">
          Último envío exitoso:{" "}
          <span className="text-ink-3">
            {new Intl.DateTimeFormat("es-AR", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(metrics.lastSentAt)}
          </span>
        </p>
      )}

      <p className="mt-4 text-[11px] leading-[1.55] text-ink-5">
        {sentCaveat} Nexora no estima aperturas, clicks ni conversiones — esos
        números no existen en la infraestructura actual, así que no se muestran.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "warning";
}) {
  return (
    <div className="rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-4">
      <dt className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
        {label}
      </dt>
      <dd
        className={
          "mt-1 text-[20px] font-semibold tabular-nums " +
          (tone === "warning" && value > 0
            ? "text-[color:var(--signal-warning)]"
            : "text-ink-0")
        }
      >
        {value}
      </dd>
    </div>
  );
}
