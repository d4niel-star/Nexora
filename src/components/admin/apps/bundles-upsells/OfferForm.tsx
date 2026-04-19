"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  createOfferAction,
  updateOfferAction,
  type OfferInput,
} from "@/lib/apps/bundles-upsells/actions";
import type { AdminOfferDetail } from "@/lib/apps/bundles-upsells/queries";

interface ProductOption {
  id: string;
  title: string;
  handle: string;
  price: number;
}

interface Props {
  mode: "create" | "edit";
  offer?: AdminOfferDetail;
  products: ProductOption[];
  planAllows: boolean;
}

const inputCls =
  "w-full h-10 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 text-[13px] text-ink-0 outline-none transition-[box-shadow,border-color] placeholder:text-ink-6 focus:bg-[var(--surface-0)] focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)]";
const textareaCls =
  "w-full rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 py-2.5 text-[13px] text-ink-0 outline-none transition-[box-shadow,border-color] placeholder:text-ink-6 focus:bg-[var(--surface-0)] focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)] resize-none";
const labelCls =
  "text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5";
const primaryBtn =
  "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[var(--r-sm)] bg-ink-0 text-[12px] font-medium text-ink-12 transition-colors hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]";
const secondaryBtn =
  "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] text-[12px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]";
const chipBtn =
  "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[var(--r-xs)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] text-[11px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)]";

export function OfferForm({ mode, offer, products, planAllows }: Props) {
  const router = useRouter();
  const [name, setName] = useState(offer?.name ?? "");
  const [title, setTitle] = useState(offer?.title ?? "");
  const [description, setDescription] = useState(offer?.description ?? "");
  const [triggerId, setTriggerId] = useState(offer?.triggerProductId ?? "");
  const [itemIds, setItemIds] = useState<string[]>(
    offer?.items.map((i) => i.productId) ?? [],
  );
  const [itemToAdd, setItemToAdd] = useState("");
  const [status, setStatus] = useState<"draft" | "active">(offer?.status ?? "draft");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const productById = useMemo(() => {
    const m = new Map<string, ProductOption>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  const availableItems = useMemo(() => {
    return products.filter(
      (p) => p.id !== triggerId && !itemIds.includes(p.id),
    );
  }, [products, triggerId, itemIds]);

  function addItem() {
    if (!itemToAdd) return;
    if (itemIds.includes(itemToAdd)) return;
    if (itemToAdd === triggerId) return;
    setItemIds([...itemIds, itemToAdd]);
    setItemToAdd("");
  }

  function removeItem(id: string) {
    setItemIds(itemIds.filter((x) => x !== id));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    const input: OfferInput = {
      name,
      title: title || undefined,
      description: description || undefined,
      triggerProductId: triggerId,
      itemProductIds: itemIds,
      status,
    };
    startTransition(async () => {
      const res = mode === "create"
        ? await createOfferAction(input)
        : await updateOfferAction(offer!.id, input);
      if (!res.ok) {
        setErrorMsg(mapError(res.error));
        return;
      }
      router.push("/admin/apps/bundles-upsells/offers");
      router.refresh();
    });
  }

  const canSubmit =
    planAllows &&
    name.trim().length > 0 &&
    triggerId.length > 0 &&
    itemIds.length > 0 &&
    !isPending;

  return (
    <div className="animate-in fade-in duration-[var(--dur-slow)] space-y-6">
      <Link
        href="/admin/apps/bundles-upsells/offers"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-5 hover:text-ink-0 transition-colors focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
        Volver a ofertas
      </Link>

      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
          {mode === "create" ? "Nueva oferta" : "Editar oferta"}
        </span>
        <h1 className="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-ink-0">
          {mode === "create" ? "Crear una nueva oferta" : name || "Oferta"}
        </h1>
        <p className="mt-2 max-w-2xl text-[13px] leading-[1.55] text-ink-5">
          Asociá un producto trigger con los complementarios que querés
          mostrar en su PDP. Los complementarios sin stock o no publicados se
          ocultan automáticamente al cliente.
        </p>
      </div>

      {!planAllows && (
        <div
          role="alert"
          className="rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 py-3 text-[13px] font-medium text-[color:var(--signal-warning)]"
        >
          Tu plan actual no incluye esta app.
        </div>
      )}

      {products.length === 0 && (
        <div
          role="alert"
          className="rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 py-3 text-[13px] font-medium text-[color:var(--signal-warning)]"
        >
          No hay productos publicados en tu tienda. Creá al menos 2 productos
          desde Catálogo antes de armar una oferta.
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6 space-y-6"
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label className={labelCls} htmlFor="offer-name">
              Nombre interno (requerido)
            </label>
            <input
              id="offer-name"
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="Bundle set crema"
              disabled={!planAllows}
            />
            <p className="text-[11px] text-ink-5">
              Para identificarla en el panel. No se muestra al cliente.
            </p>
          </div>

          <div className="space-y-2">
            <label className={labelCls} htmlFor="offer-title">
              Título público (opcional)
            </label>
            <input
              id="offer-title"
              maxLength={140}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
              placeholder="También podrías sumar…"
              disabled={!planAllows}
            />
            <p className="text-[11px] text-ink-5">
              Si lo dejás vacío, el storefront usa “Productos complementarios”.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className={labelCls} htmlFor="offer-description">
            Descripción pública (opcional, máx. 500 caracteres)
          </label>
          <textarea
            id="offer-description"
            rows={2}
            maxLength={500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={textareaCls}
            placeholder="Texto breve que acompaña el bloque de complementarios."
            disabled={!planAllows}
          />
        </div>

        <div className="space-y-2">
          <label className={labelCls} htmlFor="offer-trigger">
            Producto trigger (requerido)
          </label>
          <select
            id="offer-trigger"
            required
            value={triggerId}
            onChange={(e) => setTriggerId(e.target.value)}
            className={inputCls}
            disabled={!planAllows || products.length === 0}
          >
            <option value="">Seleccioná un producto…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-ink-5">
            El bloque aparecerá en la PDP de este producto.
          </p>
        </div>

        <div className="space-y-2">
          <span className={labelCls}>Productos complementarios</span>
          <div className="flex gap-2">
            <select
              value={itemToAdd}
              onChange={(e) => setItemToAdd(e.target.value)}
              className={inputCls}
              disabled={!planAllows || availableItems.length === 0}
            >
              <option value="">Seleccioná un producto…</option>
              {availableItems.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addItem}
              disabled={!itemToAdd || !planAllows}
              className={secondaryBtn}
            >
              Agregar
            </button>
          </div>
          {itemIds.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5 pt-1">
              {itemIds.map((id) => {
                const p = productById.get(id);
                return (
                  <li key={id}>
                    <span className={cn(chipBtn, "cursor-default")}>
                      {p?.title ?? id}
                      <button
                        type="button"
                        onClick={() => removeItem(id)}
                        className="ml-1 inline-flex h-3 w-3 items-center justify-center rounded-[var(--r-xs)] text-ink-5 hover:text-ink-0"
                        aria-label="Quitar"
                      >
                        <X className="h-3 w-3" strokeWidth={2} />
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[11px] text-ink-5 pt-1">
              Agregá al menos un producto complementario.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <span className={labelCls}>Estado</span>
          <div className="flex gap-1.5">
            {(["draft", "active"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                disabled={!planAllows}
                className={cn(
                  "inline-flex items-center h-8 px-3 rounded-[var(--r-sm)] text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
                  status === s
                    ? "bg-ink-0 text-ink-12"
                    : "border border-[color:var(--hairline)] bg-[var(--surface-0)] text-ink-3 hover:bg-[var(--surface-2)]",
                )}
              >
                {s === "draft" ? "Borrador" : "Activa"}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-ink-5">
            Solo las ofertas en estado <code className="font-mono">activa</code>{" "}
            se muestran en el storefront.
          </p>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="flex items-start gap-2 text-[12px] font-medium text-[color:var(--signal-danger)]"
          >
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            {errorMsg}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={!canSubmit} className={primaryBtn}>
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            )}
            {mode === "create" ? "Crear oferta" : "Guardar cambios"}
          </button>
          <Link
            href="/admin/apps/bundles-upsells/offers"
            className={secondaryBtn}
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}

function mapError(code: string | undefined): string {
  switch (code) {
    case "plan_locked":
      return "Tu plan no incluye esta app.";
    case "no_active_store":
      return "No hay una tienda activa.";
    case "invalid_name":
      return "Ingresá un nombre interno.";
    case "invalid_trigger":
      return "Producto trigger inválido o no pertenece a tu tienda.";
    case "invalid_items":
      return "Uno o más complementarios no pertenecen a tu tienda.";
    case "offer_not_found":
      return "No encontramos esta oferta.";
    default:
      return "No se pudo guardar la oferta.";
  }
}
