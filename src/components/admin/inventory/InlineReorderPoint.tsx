"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, Loader2, X } from "lucide-react";
import { updateReorderPoint } from "@/lib/store-engine/inventory/queries";

interface InlineReorderPointProps {
  variantId: string;
  currentValue: number | null;
}

export function InlineReorderPoint({ variantId, currentValue }: InlineReorderPointProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [displayValue, setDisplayValue] = useState(currentValue);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = () => {
    setValue(displayValue !== null ? String(displayValue) : "");
    setError(null);
    setSaved(false);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const cancelEditing = () => {
    setEditing(false);
    setError(null);
  };

  const save = () => {
    const trimmed = value.trim();
    const newValue = trimmed === "" ? null : parseInt(trimmed, 10);

    if (newValue !== null) {
      if (isNaN(newValue) || !isFinite(newValue)) { setError("Número entero válido"); return; }
      if (newValue < 0) { setError("No puede ser negativo"); return; }
    }

    setError(null);
    startTransition(async () => {
      const result = await updateReorderPoint(variantId, newValue);
      if (result.success) {
        setDisplayValue(newValue);
        setEditing(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        // Clear focus params after successful action to remove visual highlight
        router.replace("/admin/inventory", { scroll: false });
      } else {
        setError(result.error || "Error al guardar");
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); save(); }
    if (e.key === "Escape") { cancelEditing(); }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 mt-0.5">
        <input
          ref={inputRef}
          type="number"
          min="0"
          step="1"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(null); }}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          placeholder="—"
          className="w-16 text-[11px] font-bold text-[#111111] tabular-nums bg-white border border-[#EAEAEA] rounded px-1.5 py-0.5 focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition-all disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          onClick={save}
          disabled={isPending}
          className="p-0.5 text-emerald-600 hover:bg-emerald-50 rounded transition-all disabled:opacity-40"
          title="Guardar"
        >
          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
        </button>
        <button
          onClick={cancelEditing}
          disabled={isPending}
          className="p-0.5 text-gray-400 hover:text-[#111111] hover:bg-gray-100 rounded transition-all disabled:opacity-50"
          title="Cancelar"
        >
          <X className="w-3 h-3" />
        </button>
        {error && <span className="text-[9px] font-bold text-red-500 ml-1">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 mt-0.5">
      {saved ? (
        <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 animate-in fade-in">
          <Check className="w-2.5 h-2.5" /> Guardado
        </span>
      ) : (
        <>
          <span className="text-[10px] text-gray-400 font-medium">
            Reorden: {displayValue !== null ? `${displayValue} u.` : <span className="italic">sistema (10)</span>}
          </span>
          <button
            onClick={startEditing}
            className="p-0.5 text-gray-300 hover:text-[#111111] hover:bg-gray-100 rounded transition-all"
            title="Editar punto de reorden"
          >
            <Pencil className="w-2.5 h-2.5" />
          </button>
        </>
      )}
    </div>
  );
}
