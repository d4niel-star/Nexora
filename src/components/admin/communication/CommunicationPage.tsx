"use client";

import { useState, useCallback } from "react";
import {
  MessageCircle,
  Camera,
  Globe,
  Mail,
  Phone,
  MapPin,
  Clock,
  Check,
  AlertCircle,
  Save,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CommunicationSettings } from "@/lib/communication/types";
import { saveCommunicationSettings } from "@/lib/communication/actions";

// ─── Comunicación — Admin Category Page ─────────────────────────────────
//
// Single-page architecture with six clearly separated sections:
//   1. Canales conectados: WhatsApp / Instagram / Facebook
//   2. Información de contacto
//   3. Botón de WhatsApp (storefront)
//   4. E-mails automáticos
//
// Every change is staged locally and committed on "Guardar cambios".
// The server action upserts a single StoreCommunicationSettings row
// and revalidates both admin and storefront paths.

interface Props {
  initialSettings: CommunicationSettings;
}

export function CommunicationPage({ initialSettings }: Props) {
  const [settings, setSettings] = useState<CommunicationSettings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>("channels");

  const dirty =
    JSON.stringify(settings) !== JSON.stringify(initialSettings);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    const result = await saveCommunicationSettings(settings);
    setSaving(false);
    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError(result.error ?? "Error al guardar");
    }
  }, [settings]);

  // Helpers
  const updateContact = (patch: Partial<CommunicationSettings["contact"]>) =>
    setSettings((s) => ({ ...s, contact: { ...s.contact, ...patch } }));

  const updateWhatsApp = (patch: Partial<CommunicationSettings["whatsapp"]>) =>
    setSettings((s) => ({ ...s, whatsapp: { ...s.whatsapp, ...patch } }));

  const updateInstagram = (patch: Partial<CommunicationSettings["instagram"]>) =>
    setSettings((s) => ({ ...s, instagram: { ...s.instagram, ...patch } }));

  const updateFacebook = (patch: Partial<CommunicationSettings["facebook"]>) =>
    setSettings((s) => ({ ...s, facebook: { ...s.facebook, ...patch } }));

  const updateEmails = (patch: Partial<CommunicationSettings["emails"]>) =>
    setSettings((s) => ({ ...s, emails: { ...s.emails, ...patch } }));

  const sections = [
    { id: "channels", label: "Canales", icon: MessageCircle },
    { id: "contact", label: "Contacto", icon: Phone },
    { id: "whatsapp-button", label: "Botón de WhatsApp", icon: Smartphone },
    { id: "emails", label: "E-mails automáticos", icon: Mail },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-ink-0">
            Comunicación
          </h1>
          <p className="mt-1 text-[14px] text-ink-4">
            Gestioná tus canales de contacto, redes sociales y correos automáticos.
            Los cambios se reflejan en tu tienda publicada.
          </p>
        </div>
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={handleSave}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-[var(--r-md)] px-5 text-[13px] font-semibold transition-all duration-[var(--dur-base)]",
            dirty
              ? "bg-ink-0 text-ink-12 shadow-[var(--shadow-sm)] hover:bg-ink-2 active:scale-[0.97]"
              : "bg-ink-10 text-ink-6 cursor-not-allowed",
          )}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Guardando..." : saved ? "Guardado" : "Guardar cambios"}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-[var(--r-md)] border border-[var(--signal-danger)] bg-red-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-[var(--signal-danger)]" />
          <p className="text-[13px] text-[var(--signal-danger)]">{error}</p>
        </div>
      )}

      {/* Section nav */}
      <div className="flex gap-1 rounded-[var(--r-md)] bg-ink-11 p-1">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSection(s.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-[var(--r-sm)] py-2.5 text-[13px] font-medium transition-all duration-[var(--dur-base)]",
                activeSection === s.id
                  ? "bg-white text-ink-0 shadow-sm"
                  : "text-ink-4 hover:text-ink-2",
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Section: Canales ── */}
      {activeSection === "channels" && (
        <div className="space-y-6">
          {/* WhatsApp */}
          <ChannelCard
            icon={<MessageCircle className="h-5 w-5 text-green-500" />}
            title="WhatsApp"
            description="Permite que tus clientes se comuniquen directamente por WhatsApp. Usamos enlaces wa.me oficiales — no requiere API Key."
            connected={Boolean(settings.whatsapp.number)}
            statusLabel={settings.whatsapp.number ? "Configurado" : "No configurado"}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                label="Número de WhatsApp"
                placeholder="5491112345678"
                value={settings.whatsapp.number ?? ""}
                onChange={(v) => updateWhatsApp({ number: v || null })}
                hint="Formato internacional sin + ni espacios"
              />
              <InputField
                label="Nombre visible"
                placeholder="Soporte Mi Tienda"
                value={settings.whatsapp.displayName ?? ""}
                onChange={(v) => updateWhatsApp({ displayName: v || null })}
                hint="Se muestra en la tienda junto al botón"
              />
            </div>
            {settings.whatsapp.number && (
              <div className="mt-3 flex items-center gap-2">
                <a
                  href={`https://wa.me/${settings.whatsapp.number.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12px] text-ink-4 hover:text-ink-0 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Probar enlace de WhatsApp
                </a>
              </div>
            )}
          </ChannelCard>

          {/* Instagram */}
          <ChannelCard
            icon={<Camera className="h-5 w-5 text-pink-500" />}
            title="Instagram"
            description="Vinculá tu cuenta de Instagram para que aparezca como canal de contacto en tu tienda. La mensajería directa requiere Meta Business Suite."
            connected={Boolean(settings.instagram.handle)}
            statusLabel={settings.instagram.handle ? `@${settings.instagram.handle}` : "No vinculado"}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                label="Usuario de Instagram"
                placeholder="mi_tienda"
                value={settings.instagram.handle ?? ""}
                onChange={(v) => updateInstagram({ handle: v || null })}
                hint="Sin @ — ej: mi_tienda"
              />
              <InputField
                label="URL del perfil (opcional)"
                placeholder="https://instagram.com/mi_tienda"
                value={settings.instagram.url ?? ""}
                onChange={(v) => updateInstagram({ url: v || null })}
                hint="Se autogenera si dejás vacío"
              />
            </div>
            <div className="mt-4">
              <Toggle
                label="Mostrar Instagram en la tienda"
                checked={settings.instagram.showInStore}
                onChange={(v) => updateInstagram({ showInStore: v })}
              />
            </div>
          </ChannelCard>

          {/* Facebook */}
          <ChannelCard
            icon={<Globe className="h-5 w-5 text-blue-600" />}
            title="Facebook"
            description="Conectá tu página de Facebook para mostrarla en tu tienda. Los clientes pueden contactarte vía Messenger con un enlace m.me directo."
            connected={Boolean(settings.facebook.pageUrl)}
            statusLabel={settings.facebook.pageName || (settings.facebook.pageUrl ? "Página vinculada" : "No vinculado")}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                label="URL de la página"
                placeholder="https://facebook.com/mi.tienda"
                value={settings.facebook.pageUrl ?? ""}
                onChange={(v) => updateFacebook({ pageUrl: v || null })}
                hint="Copiá la URL de tu página de Facebook"
              />
              <InputField
                label="Nombre de la página"
                placeholder="Mi Tienda"
                value={settings.facebook.pageName ?? ""}
                onChange={(v) => updateFacebook({ pageName: v || null })}
                hint="Se muestra como label en la tienda"
              />
            </div>
            <div className="mt-4">
              <Toggle
                label="Mostrar Facebook en la tienda"
                checked={settings.facebook.showInStore}
                onChange={(v) => updateFacebook({ showInStore: v })}
              />
            </div>
          </ChannelCard>
        </div>
      )}

      {/* ── Section: Contacto ── */}
      {activeSection === "contact" && (
        <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
          <div className="mb-6">
            <h2 className="text-[16px] font-semibold text-ink-0">
              Información de contacto
            </h2>
            <p className="mt-1 text-[13px] text-ink-4">
              Datos oficiales de tu tienda que se muestran en el footer y en la
              sección de contacto del storefront.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              label="E-mail de contacto"
              icon={<Mail className="h-4 w-4" />}
              placeholder="contacto@mitienda.com"
              value={settings.contact.email ?? ""}
              onChange={(v) => updateContact({ email: v || null })}
            />
            <InputField
              label="Teléfono"
              icon={<Phone className="h-4 w-4" />}
              placeholder="+54 11 1234-5678"
              value={settings.contact.phone ?? ""}
              onChange={(v) => updateContact({ phone: v || null })}
            />
            <InputField
              label="Dirección"
              icon={<MapPin className="h-4 w-4" />}
              placeholder="Av. Corrientes 1234"
              value={settings.contact.address ?? ""}
              onChange={(v) => updateContact({ address: v || null })}
            />
            <InputField
              label="Ciudad"
              placeholder="Buenos Aires"
              value={settings.contact.city ?? ""}
              onChange={(v) => updateContact({ city: v || null })}
            />
            <InputField
              label="Provincia"
              placeholder="CABA"
              value={settings.contact.province ?? ""}
              onChange={(v) => updateContact({ province: v || null })}
            />
            <InputField
              label="Horario de atención"
              icon={<Clock className="h-4 w-4" />}
              placeholder="Lun a Vie 9 a 18hs"
              value={settings.contact.schedule ?? ""}
              onChange={(v) => updateContact({ schedule: v || null })}
            />
          </div>

          <div className="mt-6 border-t border-[color:var(--hairline)] pt-4">
            <Toggle
              label="Mostrar información de contacto en la tienda"
              description="Cuando está activo, los datos de contacto se muestran en el footer de tu storefront."
              checked={settings.contact.showInStore}
              onChange={(v) => updateContact({ showInStore: v })}
            />
          </div>
        </div>
      )}

      {/* ── Section: Botón de WhatsApp ── */}
      {activeSection === "whatsapp-button" && (
        <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
          <div className="mb-6">
            <h2 className="text-[16px] font-semibold text-ink-0">
              Botón flotante de WhatsApp
            </h2>
            <p className="mt-1 text-[13px] text-ink-4">
              Mostrá un botón flotante en tu tienda para que los clientes te escriban
              directamente por WhatsApp.
            </p>
          </div>

          {!settings.whatsapp.number ? (
            <div className="flex items-start gap-3 rounded-[var(--r-md)] bg-amber-50 border border-amber-200 p-4">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="text-[13px] font-medium text-amber-800">
                  Primero configurá tu número de WhatsApp
                </p>
                <p className="mt-0.5 text-[12px] text-amber-600">
                  Andá a la sección &ldquo;Canales&rdquo; y agregá tu número de WhatsApp
                  para poder activar el botón flotante.
                </p>
              </div>
            </div>
          ) : (
            <>
              <Toggle
                label="Activar botón flotante de WhatsApp"
                description="Se muestra en todas las páginas de tu tienda"
                checked={settings.whatsapp.buttonEnabled}
                onChange={(v) => updateWhatsApp({ buttonEnabled: v })}
              />

              {settings.whatsapp.buttonEnabled && (
                <div className="mt-6 space-y-4">
                  <InputField
                    label="Texto inicial del mensaje"
                    placeholder="¡Hola! Quiero consultar sobre sus productos"
                    value={settings.whatsapp.buttonText ?? ""}
                    onChange={(v) => updateWhatsApp({ buttonText: v || null })}
                    hint="Este texto aparece pre-cargado en el chat de WhatsApp del cliente"
                  />
                  <div>
                    <label className="mb-2 block text-[13px] font-medium text-ink-2">
                      Posición del botón
                    </label>
                    <div className="flex gap-3">
                      {(
                        [
                          { value: "bottom-right", label: "Abajo derecha" },
                          { value: "bottom-left", label: "Abajo izquierda" },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            updateWhatsApp({ buttonPosition: opt.value })
                          }
                          className={cn(
                            "flex-1 rounded-[var(--r-md)] border px-4 py-2.5 text-[13px] font-medium transition-all",
                            settings.whatsapp.buttonPosition === opt.value
                              ? "border-ink-0 bg-ink-0 text-ink-12"
                              : "border-[color:var(--hairline)] bg-[var(--surface-0)] text-ink-4 hover:border-ink-6",
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="mt-4 rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-6">
                    <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-5">
                      Vista previa
                    </p>
                    <div className="relative h-32 rounded-[var(--r-md)] bg-[var(--surface-2)] border border-[color:var(--hairline)]">
                      <div
                        className={cn(
                          "absolute bottom-3 flex items-center gap-2 rounded-full bg-green-500 px-4 py-2.5 shadow-lg",
                          settings.whatsapp.buttonPosition === "bottom-right"
                            ? "right-3"
                            : "left-3",
                        )}
                      >
                        <MessageCircle className="h-5 w-5 text-white" fill="white" />
                        <span className="text-[13px] font-medium text-white">
                          WhatsApp
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Section: E-mails automáticos ── */}
      {activeSection === "emails" && (
        <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
          <div className="mb-6">
            <h2 className="text-[16px] font-semibold text-ink-0">
              E-mails automáticos
            </h2>
            <p className="mt-1 text-[13px] text-ink-4">
              Nexora envía e-mails transaccionales automáticos cuando ocurren
              eventos en tu tienda. Podés activar o desactivar cada uno.
            </p>
            <p className="mt-2 text-[12px] text-ink-5">
              Los e-mails se envían vía{" "}
              <span className="font-medium text-ink-3">Resend</span> en producción.
              En desarrollo usan un provider mock que loguea a consola.
            </p>
          </div>

          <div className="space-y-0.5">
            <EmailToggleRow
              label="Pedido recibido"
              description="Confirmación al cliente cuando se crea un nuevo pedido"
              event="ORDER_CREATED"
              checked={settings.emails.orderCreated}
              onChange={(v) => updateEmails({ orderCreated: v })}
            />
            <EmailToggleRow
              label="Pago aprobado"
              description="Notificación al cliente cuando su pago fue acreditado"
              event="PAYMENT_APPROVED"
              checked={settings.emails.paymentApproved}
              onChange={(v) => updateEmails({ paymentApproved: v })}
            />
            <EmailToggleRow
              label="Pago pendiente"
              description="Aviso cuando el pago está en proceso de acreditación"
              event="PAYMENT_PENDING"
              checked={settings.emails.paymentPending}
              onChange={(v) => updateEmails({ paymentPending: v })}
            />
            <EmailToggleRow
              label="Pago fallido"
              description="Alerta al cliente si el pago fue rechazado"
              event="PAYMENT_FAILED"
              checked={settings.emails.paymentFailed}
              onChange={(v) => updateEmails({ paymentFailed: v })}
            />
            <EmailToggleRow
              label="Pedido despachado"
              description="Notificación con tracking cuando el pedido fue enviado"
              event="ORDER_SHIPPED"
              checked={settings.emails.orderShipped}
              onChange={(v) => updateEmails({ orderShipped: v })}
            />
            <EmailToggleRow
              label="Pedido entregado"
              description="Confirmación cuando el carrier marca como entregado"
              event="ORDER_DELIVERED"
              checked={settings.emails.orderDelivered}
              onChange={(v) => updateEmails({ orderDelivered: v })}
            />
            <EmailToggleRow
              label="Pedido cancelado"
              description="Aviso al cliente cuando un pedido es cancelado"
              event="ORDER_CANCELLED"
              checked={settings.emails.orderCancelled}
              onChange={(v) => updateEmails({ orderCancelled: v })}
            />
            <EmailToggleRow
              label="Reembolso procesado"
              description="Confirmación al cliente del reembolso de su pago"
              event="PAYMENT_REFUNDED"
              checked={settings.emails.paymentRefunded}
              onChange={(v) => updateEmails({ paymentRefunded: v })}
            />
            <EmailToggleRow
              label="Carrito abandonado"
              description="Recordatorio al cliente sobre productos que dejó en el carrito"
              event="ABANDONED_CART"
              checked={settings.emails.abandonedCart}
              onChange={(v) => updateEmails({ abandonedCart: v })}
            />
            <EmailToggleRow
              label="Stock crítico (merchant)"
              description="Alerta para vos cuando un producto llega a stock mínimo"
              event="STOCK_CRITICAL"
              checked={settings.emails.stockCritical}
              onChange={(v) => updateEmails({ stockCritical: v })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────────

function ChannelCard({
  icon,
  title,
  description,
  connected,
  statusLabel,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  connected: boolean;
  statusLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6 transition-shadow hover:shadow-[var(--shadow-sm)]">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-md)] bg-[var(--surface-1)]">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="text-[15px] font-semibold text-ink-0">{title}</h3>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                connected
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-ink-10 text-ink-5",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  connected ? "bg-emerald-500" : "bg-ink-6",
                )}
              />
              {statusLabel}
            </span>
          </div>
          <p className="mt-1 text-[13px] leading-[1.5] text-ink-4">
            {description}
          </p>
        </div>
      </div>
      <div className="mt-5 border-t border-[color:var(--hairline)] pt-5">
        {children}
      </div>
    </div>
  );
}

function InputField({
  label,
  placeholder,
  value,
  onChange,
  hint,
  icon,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-ink-2">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-5">
            {icon}
          </div>
        )}
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "h-10 w-full rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] text-[14px] text-ink-0 placeholder:text-ink-6 transition-[box-shadow,border-color] duration-[var(--dur-base)] focus:border-ink-5 focus:outline-none focus:shadow-[var(--shadow-focus)]",
            icon ? "pl-10 pr-3" : "px-3",
          )}
        />
      </div>
      {hint && (
        <p className="mt-1 text-[11px] text-ink-5">{hint}</p>
      )}
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const Icon = checked ? ToggleRight : ToggleLeft;
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 text-left"
    >
      <Icon
        className={cn(
          "mt-0.5 h-5 w-5 shrink-0 transition-colors",
          checked ? "text-emerald-500" : "text-ink-6",
        )}
        strokeWidth={1.75}
      />
      <div>
        <span className="text-[13px] font-medium text-ink-1">{label}</span>
        {description && (
          <p className="mt-0.5 text-[12px] text-ink-5">{description}</p>
        )}
      </div>
    </button>
  );
}

function EmailToggleRow({
  label,
  description,
  event,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  event: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-[var(--r-md)] px-4 py-3.5 transition-colors hover:bg-[var(--surface-1)]">
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-medium text-ink-0">{label}</span>
          <span className="rounded bg-ink-10 px-1.5 py-0.5 text-[10px] font-mono text-ink-5">
            {event}
          </span>
        </div>
        <p className="mt-0.5 text-[12px] text-ink-5">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:shadow-[var(--shadow-focus)]",
          checked ? "bg-emerald-500" : "bg-ink-8",
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform duration-200",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}
