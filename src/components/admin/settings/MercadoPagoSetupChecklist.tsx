"use client";

import { useState } from "react";
import { AlertTriangle, Check, Copy, ExternalLink } from "lucide-react";

// ─── Mercado Pago Dashboard setup checklist ──────────────────────────────
// Purpose: help Nexora ops debug the "La aplicación no está preparada para
// conectarse a Mercado Pago" rejection, which is always a misconfiguration
// on the MP Developer Dashboard side (redirect URI not whitelisted, app
// type wrong, OAuth product not enabled on the app, etc.).
//
// This is a pure client component. It receives the canonical redirect URI
// and client_id so the operator can copy them verbatim and compare against
// what they see in the MP Dashboard.

interface Props {
  clientIdPreview: string | null;
  redirectUri: string | null;
}

export function MercadoPagoSetupChecklist({ clientIdPreview, redirectUri }: Props) {
  return (
    <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
          <AlertTriangle className="h-4 w-4 text-[color:var(--signal-warning)]" strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="text-[14px] font-semibold text-ink-0">
            Checklist Developer Dashboard de Mercado Pago
          </h2>
          <p className="mt-1 text-[12px] leading-[1.55] text-ink-5">
            Si al conectar ves <em>“La aplicación no está preparada para conectarse a Mercado Pago”</em>, el
            rechazo viene de los servidores de MP, no de Nexora. Revisá estos 4 puntos en el dashboard de MP
            usando los valores exactos de abajo.
          </p>
        </div>
      </div>

      <ol className="mt-6 space-y-4">
        <Step
          index={1}
          title="Tu app en MP debe tener OAuth habilitado"
          body={
            <>
              Entrá a{" "}
              <a
                href="https://www.mercadopago.com.ar/developers/panel/app"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-ink-0 underline underline-offset-4"
              >
                Mercado Pago · Tus aplicaciones
                <ExternalLink className="h-3 w-3" strokeWidth={1.75} />
              </a>{" "}
              y abrí la aplicación cuyo <code>Client ID</code> termina en{" "}
              <CopyableInline value={clientIdPreview ?? "—"} />. En <strong>Integración</strong> / <strong>Productos</strong> tiene que estar activado <strong>“Checkout Pro”</strong> o <strong>“Marketplace”</strong> (el que corresponda). Sin un producto con OAuth, MP rechaza toda autorización de terceros.
            </>
          }
        />

        <Step
          index={2}
          title="Cargá el Redirect URI exacto"
          body={
            <>
              En la misma app, sección <strong>Redirect URIs</strong>, pegá <em>exactamente</em> este valor (sin
              espacios, sin barra final extra, misma capitalización):
              <CopyableBlock value={redirectUri ?? "NEXT_PUBLIC_APP_URL no configurado"} />
              MP valida byte a byte. Cualquier diferencia (<code>http</code> vs <code>https</code>, un slash
              de más, subdominio distinto) dispara el mismo error genérico.
            </>
          }
        />

        <Step
          index={3}
          title="Verificá el tipo de aplicación"
          body={
            <>
              Si la app fue creada como <em>“Integración propia”</em> (solo tu cuenta), <strong>no soporta
              OAuth de terceros</strong> y MP siempre va a rechazar. Debe ser creada como aplicación de tipo{" "}
              <strong>“Checkout Pro / Marketplace”</strong> para aceptar que otros vendedores la vinculen. Si
              el tipo está mal, hay que crear una app nueva: el tipo no se puede cambiar post-creación.
            </>
          }
        />

        <Step
          index={4}
          title="La app debe estar en modo productivo"
          body={
            <>
              Revisá que la aplicación no esté marcada como <em>pausada</em> o <em>en revisión</em>. En{" "}
              <strong>Credenciales de producción</strong> debe aparecer un Client ID y Client Secret
              <strong>activos</strong>. El <code>MP_CLIENT_ID</code> cargado como env debe corresponder a las
              credenciales de <strong>producción</strong>, no a las de prueba (<code>TEST-…</code>).
            </>
          }
        />
      </ol>

      <div className="mt-6 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 py-3 text-[12px] leading-[1.6] text-ink-5">
        <p className="font-semibold text-ink-3">Nota diagnóstica</p>
        <p className="mt-1">
          La URL que Nexora construye es válida según los docs de MP (<code>client_id</code>,{" "}
          <code>response_type=code</code>, <code>platform_id=mp</code>, <code>redirect_uri</code>, <code>state</code>{" "}
          firmado HMAC). Si después de verificar los 4 puntos el error persiste, probablemente corresponde abrir
          ticket de soporte con MP adjuntando el Client ID y la URL exacta de autorización que ves en el
          navegador; el equipo de MP puede auditar el estado de habilitación de la app desde su lado.
        </p>
      </div>
    </section>
  );
}

function Step({
  index,
  title,
  body,
}: {
  index: number;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <li className="grid grid-cols-[28px_1fr] items-start gap-3">
      <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[color:var(--hairline-strong)] bg-[var(--surface-1)] text-[11px] font-semibold text-ink-0">
        {index}
      </div>
      <div>
        <p className="text-[13px] font-semibold text-ink-0">{title}</p>
        <div className="mt-1 text-[12px] leading-[1.6] text-ink-5">{body}</div>
      </div>
    </li>
  );
}

function CopyableBlock({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard permission denied → intentionally silent.
    }
  };

  return (
    <div className="mt-2 flex items-center gap-2 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-2">
      <code className="block flex-1 overflow-auto whitespace-nowrap font-mono text-[12px] text-ink-0">
        {value}
      </code>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[color:var(--hairline)] bg-[var(--surface-0)] px-2.5 text-[11px] font-medium text-ink-3 transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
      >
        {copied ? (
          <>
            <Check className="h-3 w-3 text-[color:var(--signal-success)]" strokeWidth={2} />
            Copiado
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" strokeWidth={1.75} />
            Copiar
          </>
        )}
      </button>
    </div>
  );
}

function CopyableInline({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Silent clipboard failure.
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copiar"
      className="inline-flex items-center gap-1 rounded-full border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 py-0.5 font-mono text-[11px] text-ink-0 transition-colors hover:bg-[var(--surface-2)]"
    >
      {value}
      {copied ? (
        <Check className="h-3 w-3 text-[color:var(--signal-success)]" strokeWidth={2} />
      ) : (
        <Copy className="h-3 w-3 text-ink-5" strokeWidth={1.75} />
      )}
    </button>
  );
}
