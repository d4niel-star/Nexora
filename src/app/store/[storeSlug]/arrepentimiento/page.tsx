"use client";

import { useState, use } from "react";
import { AlertCircle, CheckCircle2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";

// ─── Arrepentimiento (Res. 424/2020) ───
// Form preserves every field, handler and API call. Visual pass only:
// token inputs, rect CTA, hairline warning block, monochrome shell.

const inputClass =
  "flex h-11 w-full rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-3.5 text-[15px] text-ink-0 placeholder:text-ink-6 " +
  "transition-[box-shadow,border-color] duration-[var(--dur-base)] ease-[var(--ease-out)] " +
  "focus:border-[var(--accent-500)] focus:outline-none focus:shadow-[var(--shadow-focus)]";

const labelClass = "block text-[12px] font-medium text-ink-5 mb-1.5";

export default function WithdrawalPage({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = use(params);
  const router = useRouter();
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/storefront/withdrawal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeSlug, orderId, email, name, reason }),
      });
      if (res.ok) setSuccess(true);
      else throw new Error("Error");
    } catch (e) {
      alert("No se pudo procesar la solicitud. Por favor contactá a soporte.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <div className="mx-auto mb-7 inline-flex h-12 w-12 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)]">
          <CheckCircle2
            className="h-5 w-5 text-[color:var(--signal-success)]"
            strokeWidth={1.75}
          />
        </div>
        <h1 className="font-semibold text-[28px] leading-[1.1] tracking-[-0.035em] text-ink-0">
          Solicitud recibida.
        </h1>
        <p className="mx-auto mt-4 text-[14px] leading-[1.55] text-ink-5">
          Hemos registrado tu solicitud de arrepentimiento. En breve te
          contactaremos para procesar la devolución de fondos y el retorno
          logístico según corresponda.
        </p>
        <button
          onClick={() => router.push(`/${storeSlug}`)}
          className="mt-10 inline-flex h-12 items-center justify-center rounded-[var(--r-sm)] bg-ink-0 px-7 text-[14px] font-medium text-ink-12 transition-colors hover:bg-ink-2"
        >
          Volver a la tienda
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-16 sm:px-8 sm:py-20">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-5 inline-flex h-12 w-12 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] text-ink-4">
          <RotateCcw className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-5">
          Resolución 424/2020
        </p>
        <h1 className="mt-3 font-semibold text-[32px] leading-[1.08] tracking-[-0.035em] text-ink-0 sm:text-[40px]">
          Botón de arrepentimiento.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[14px] leading-[1.55] text-ink-5">
          Tenés derecho a revocar la aceptación del producto dentro de los 10
          días computados a partir de la celebración del contrato o de la
          entrega del bien.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6 sm:p-8 space-y-5"
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClass}>
              Nombre completo <span className="text-ink-6">*</span>
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              placeholder="Juan Pérez"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Email de compra <span className="text-ink-6">*</span>
            </label>
            <input
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="juan@email.com"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>
            Número de orden / pedido <span className="text-ink-6">*</span>
          </label>
          <input
            required
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            type="text"
            placeholder="Ej: ORD-10204"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Motivo (opcional)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Contanos por qué decidiste solicitar la revocación…"
            className={
              "block w-full resize-none rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-3.5 py-2.5 text-[14px] leading-[1.55] text-ink-0 placeholder:text-ink-6 transition-[box-shadow,border-color] duration-[var(--dur-base)] ease-[var(--ease-out)] focus:border-[var(--accent-500)] focus:outline-none focus:shadow-[var(--shadow-focus)]"
            }
          />
        </div>

        <div className="flex items-start gap-2.5 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-2)] px-3.5 py-3">
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--signal-warning)]"
            strokeWidth={1.75}
          />
          <p className="text-[12px] leading-[1.55] text-ink-4">
            Al enviar este formulario se procesará una solicitud de cancelación.
            Los costos logísticos de devolución del bien aplican según términos
            legales vigentes y políticas de la tienda.
          </p>
        </div>

        <button
          disabled={isSubmitting}
          type="submit"
          className="inline-flex h-12 w-full items-center justify-center rounded-[var(--r-sm)] bg-ink-0 text-[14px] font-medium text-ink-12 transition-colors hover:bg-ink-2 active:translate-y-px disabled:bg-ink-8 disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? "Procesando solicitud…"
            : "Solicitar revocación"}
        </button>
      </form>
    </div>
  );
}
