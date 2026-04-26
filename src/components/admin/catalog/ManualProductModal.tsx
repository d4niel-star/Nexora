"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Package, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createManualProductAction } from "@/lib/store-engine/catalog/actions";

interface ManualProductModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (info: { id: string; handle: string }) => void;
}

// ─── Manual product creation modal ─────────────────────────────────────────
//
// Single-screen form for the "Agregar manual" flow. The merchant fills the
// minimum that makes a product sellable (title + price + stock) and can
// optionally tune category / cost / image / status. The form validates
// client-side for instant feedback and again server-side; if either layer
// rejects the input we surface the message inline.
//
// We keep this self-contained so it can be re-used from the catalog page
// or any deep-link / quick-action that requires "add a product now".

export function ManualProductModal({ open, onClose, onCreated }: ManualProductModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);

  // Form state (deliberately kept as plain strings — we coerce on submit
  // so we never have to fight controlled-input quirks with empty values).
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [costInput, setCostInput] = useState("");
  const [stockInput, setStockInput] = useState("0");
  const [image, setImage] = useState("");
  const [supplier, setSupplier] = useState("");
  const [publish, setPublish] = useState(false);

  // Reset whenever the modal closes so the next open always starts fresh.
  useEffect(() => {
    if (!open) return;
    setError(null);
    // Defer focus until the modal is actually painted.
    const id = window.setTimeout(() => titleRef.current?.focus(), 30);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", onEsc);
    };
  }, [open, isPending, onClose]);

  if (!open) return null;

  const submit = () => {
    setError(null);

    const cleanTitle = title.trim();
    if (cleanTitle.length < 2) {
      setError("Ingresá un nombre de producto (mínimo 2 caracteres)");
      titleRef.current?.focus();
      return;
    }

    const price = Number(priceInput.replace(",", "."));
    if (!Number.isFinite(price) || price <= 0) {
      setError("Ingresá un precio válido mayor a cero");
      return;
    }

    const stock = Number.parseInt(stockInput, 10);
    if (!Number.isInteger(stock) || stock < 0) {
      setError("El stock debe ser un entero igual o mayor a cero");
      return;
    }

    let cost: number | null = null;
    if (costInput.trim().length > 0) {
      const parsedCost = Number(costInput.replace(",", "."));
      if (!Number.isFinite(parsedCost) || parsedCost < 0) {
        setError("El costo debe ser un número igual o mayor a cero");
        return;
      }
      cost = parsedCost;
    }

    if (image.trim().length > 0 && !/^https?:\/\/\S+$/i.test(image.trim())) {
      setError("La imagen debe ser una URL pública (https://...)");
      return;
    }

    startTransition(async () => {
      const result = await createManualProductAction({
        title: cleanTitle,
        category: category.trim() || null,
        description: description.trim() || null,
        price,
        cost,
        stock,
        image: image.trim() || null,
        supplier: supplier.trim() || null,
        publish,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      // Reset form so the modal is clean if the merchant re-opens it.
      setTitle("");
      setCategory("");
      setDescription("");
      setPriceInput("");
      setCostInput("");
      setStockInput("0");
      setImage("");
      setSupplier("");
      setPublish(false);

      onCreated?.(result.data!);
      router.refresh();
      onClose();
    });
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-ink-0/40 backdrop-blur-[2px]"
        onClick={() => !isPending && onClose()}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Agregar producto manual"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="elev-card-strong w-full max-w-xl overflow-hidden rounded-[var(--r-lg)] animate-in fade-in zoom-in-95 duration-[var(--dur-base)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[color:var(--hairline)] bg-[var(--surface-0)]/80 px-6 py-4 backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-ink-3">
                <Package className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <div>
                <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink-0">Agregar producto manual</h2>
                <p className="text-[11px] text-ink-5">Crea un producto desde cero, sin importar de un proveedor.</p>
              </div>
            </div>
            <button
              onClick={() => !isPending && onClose()}
              className="rounded-[var(--r-sm)] p-2 text-ink-5 transition-colors hover:bg-[var(--surface-2)] hover:text-ink-0"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="space-y-5 bg-[var(--surface-0)] p-6 max-h-[70vh] overflow-y-auto"
          >
            {error && (
              <div
                role="alert"
                className="rounded-[var(--r-sm)] border border-[color:color-mix(in_srgb,var(--signal-danger)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--signal-danger)_6%,var(--surface-0))] px-3 py-2 text-[12px] font-medium text-[color:var(--signal-danger)]"
              >
                {error}
              </div>
            )}

            {/* Title */}
            <Field label="Nombre del producto" required>
              <input
                ref={titleRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Cafetera italiana inox 6 pocillos"
                className={inputCls}
                disabled={isPending}
                maxLength={120}
              />
            </Field>

            {/* Price + Stock + Cost */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Precio" required>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-medium text-ink-5">$</span>
                  <input
                    inputMode="decimal"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value.replace(/[^0-9.,]/g, ""))}
                    placeholder="0,00"
                    className={cn(inputCls, "pl-7")}
                    disabled={isPending}
                  />
                </div>
              </Field>
              <Field label="Costo (opcional)" hint="Para margen real">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-medium text-ink-5">$</span>
                  <input
                    inputMode="decimal"
                    value={costInput}
                    onChange={(e) => setCostInput(e.target.value.replace(/[^0-9.,]/g, ""))}
                    placeholder="0,00"
                    className={cn(inputCls, "pl-7")}
                    disabled={isPending}
                  />
                </div>
              </Field>
              <Field label="Stock inicial">
                <input
                  inputMode="numeric"
                  value={stockInput}
                  onChange={(e) => setStockInput(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="0"
                  className={inputCls}
                  disabled={isPending}
                />
              </Field>
            </div>

            {/* Category + Supplier */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Categoría">
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ej. Cocina"
                  className={inputCls}
                  disabled={isPending}
                  maxLength={60}
                />
              </Field>
              <Field label="Proveedor">
                <input
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="Propio / nombre del proveedor"
                  className={inputCls}
                  disabled={isPending}
                  maxLength={80}
                />
              </Field>
            </div>

            {/* Image URL */}
            <Field label="Imagen (URL pública)" hint="JPG / PNG accesible vía https">
              <input
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://…"
                className={inputCls}
                disabled={isPending}
              />
            </Field>

            {/* Description */}
            <Field label="Descripción">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalles que ayuden al cliente a decidir."
                rows={3}
                className={cn(inputCls, "py-2 resize-none")}
                disabled={isPending}
                maxLength={600}
              />
            </Field>

            {/* Publish toggle */}
            <label className="flex items-start gap-3 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-3">
              <input
                type="checkbox"
                checked={publish}
                onChange={(e) => setPublish(e.target.checked)}
                className="mt-0.5 h-4 w-4 cursor-pointer accent-ink-0"
                disabled={isPending}
              />
              <div className="leading-tight">
                <span className="block text-[13px] font-medium text-ink-0">Publicar al guardar</span>
                <span className="block text-[11px] text-ink-5">Si está apagado, queda como borrador para revisar más tarde.</span>
              </div>
            </label>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-[color:var(--hairline)] bg-[var(--surface-1)] px-6 py-4">
            <button
              type="button"
              onClick={() => !isPending && onClose()}
              disabled={isPending}
              className="inline-flex h-10 items-center rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-4 text-[13px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={isPending}
              className="inline-flex h-10 items-center gap-2 rounded-[var(--r-sm)] bg-ink-0 px-5 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2 disabled:opacity-60"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isPending ? "Guardando…" : publish ? "Crear y publicar" : "Crear borrador"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Internals ─────────────────────────────────────────────────────────────

const inputCls =
  "h-10 w-full rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-paper)] px-3 text-[13px] font-medium text-ink-0 outline-none transition-[box-shadow,border-color] placeholder:text-ink-6 focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)] disabled:opacity-50";

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">
          {label}
          {required && <span className="ml-1 text-[color:var(--signal-danger)]">*</span>}
        </label>
        {hint && <span className="text-[10px] text-ink-6">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
