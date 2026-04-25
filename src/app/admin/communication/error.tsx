"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCw } from "lucide-react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function CommunicationError({ error, reset }: Props) {
  useEffect(() => {
    console.error("[Communication] Route error boundary:", error);
  }, [error]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-ink-0">
          Comunicación
        </h1>
        <p className="mt-1 text-[14px] text-ink-4">
          Gestioná tus canales de contacto, redes sociales y correos automáticos.
        </p>
      </div>

      <div className="rounded-[var(--r-lg)] border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div className="flex-1">
            <h2 className="text-[15px] font-semibold text-amber-900">
              No pudimos cargar la configuración
            </h2>
            <p className="mt-1 text-[13px] text-amber-800">
              Hubo un problema al recuperar los datos de Comunicación. Esto suele
              ser temporal y se resuelve volviendo a intentar.
            </p>
            {error.digest && (
              <p className="mt-2 text-[11px] font-mono text-amber-700">
                Ref: {error.digest}
              </p>
            )}
            <button
              type="button"
              onClick={reset}
              className="mt-4 inline-flex items-center gap-2 rounded-[var(--r-md)] bg-ink-0 px-4 py-2 text-[13px] font-semibold text-ink-12 hover:bg-ink-2 transition-colors"
            >
              <RotateCw className="h-4 w-4" />
              Reintentar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
