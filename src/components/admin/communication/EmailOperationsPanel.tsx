"use client";

import { useState } from "react";
import {
  Eye, Send, Check, X, AlertCircle, Loader2, Clock,
  Mail, ChevronDown, ChevronUp, CheckCircle, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EMAIL_AUTOMATIONS, type EmailAutomationDefinition } from "@/lib/email/registry";
import {
  getEmailPreview, sendTestEmail, getEmailLogs,
  type EmailLogRow, type PreviewResult,
} from "@/lib/email/email-actions";

// ─── Email Operations Panel ─────────────────────────────────────────────
//
// Shows email automation overview with preview, test send, and recent logs.
// Rendered inside the "E-mails automáticos" section of CommunicationPage.

interface Props {
  storeEmail?: string | null;
}

export function EmailOperationsPanel({ storeEmail }: Props) {
  const [activePreview, setActivePreview] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [testSendEvent, setTestSendEvent] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState(storeEmail ?? "");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<EmailLogRow[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsLoading, setLogsLoading] = useState(false);

  // ── Preview ───────────────────────────────────────────────────────
  async function handlePreview(event: string) {
    if (activePreview === event) {
      setActivePreview(null);
      setPreviewData(null);
      return;
    }
    setActivePreview(event);
    setPreviewLoading(true);
    setPreviewData(null);
    const result = await getEmailPreview(event);
    setPreviewData(result);
    setPreviewLoading(false);
  }

  // ── Test send ─────────────────────────────────────────────────────
  async function handleTestSend() {
    if (!testSendEvent || !testEmail.trim()) return;
    setTestSending(true);
    setTestResult(null);
    const result = await sendTestEmail(testSendEvent, testEmail.trim());
    setTestResult(result);
    setTestSending(false);
  }

  // ── Logs ──────────────────────────────────────────────────────────
  async function handleLoadLogs() {
    if (showLogs) {
      setShowLogs(false);
      return;
    }
    setShowLogs(true);
    setLogsLoading(true);
    const result = await getEmailLogs(25);
    setLogs(result.logs);
    setLogsTotal(result.total);
    setLogsLoading(false);
  }

  const customerEmails = EMAIL_AUTOMATIONS.filter((a) => a.customerFacing && a.implemented);
  const merchantEmails = EMAIL_AUTOMATIONS.filter((a) => !a.customerFacing && a.implemented);

  return (
    <div className="space-y-6">
      {/* Automation cards */}
      <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-card)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[color:var(--hairline)]">
          <h3 className="text-[14px] font-semibold text-ink-0 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Herramientas de email
          </h3>
          <p className="text-[12px] text-ink-5 mt-0.5">
            Vista previa y envío de prueba para emails automáticos.
          </p>
        </div>

        {/* Customer-facing */}
        <div className="px-5 pt-4 pb-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-5 mb-2">
            Notificaciones al cliente
          </p>
        </div>
        <div className="divide-y divide-[color:var(--hairline)]">
          {customerEmails.map((def) => (
            <EmailAutomationRow
              key={def.event}
              def={def}
              isPreviewActive={activePreview === def.event}
              onPreview={() => handlePreview(def.event)}
              onTestSend={() => {
                setTestSendEvent(def.event);
                setTestResult(null);
              }}
            />
          ))}
        </div>

        {/* Merchant-facing */}
        <div className="px-5 pt-4 pb-2 border-t border-[color:var(--hairline)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-5 mb-2">
            Operativas — para vos
          </p>
        </div>
        <div className="divide-y divide-[color:var(--hairline)]">
          {merchantEmails.map((def) => (
            <EmailAutomationRow
              key={def.event}
              def={def}
              isPreviewActive={activePreview === def.event}
              onPreview={() => handlePreview(def.event)}
              onTestSend={() => {
                setTestSendEvent(def.event);
                setTestResult(null);
              }}
            />
          ))}
        </div>
      </div>

      {/* Preview iframe */}
      {activePreview && (
        <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[color:var(--hairline)] flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-5">
                Vista previa
              </p>
              {previewData?.subject && (
                <p className="text-[13px] font-medium text-ink-0 mt-0.5">
                  Asunto: {previewData.subject}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => { setActivePreview(null); setPreviewData(null); }}
              className="p-1.5 text-ink-5 hover:text-ink-0 rounded-[var(--r-sm)] hover:bg-[var(--surface-2)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {previewLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-ink-5 text-[13px]">
              <Loader2 className="w-4 h-4 animate-spin" />
              Renderizando...
            </div>
          ) : previewData?.success ? (
            <div className="p-0">
              {previewData.warnings && previewData.warnings.length > 0 && (
                <div className="mx-5 mt-3 p-3 rounded-[var(--r-sm)] bg-amber-50 border border-amber-200 text-[12px] text-amber-700">
                  {previewData.warnings.join(". ")}
                </div>
              )}
              <iframe
                srcDoc={previewData.html}
                sandbox="allow-same-origin"
                className="w-full border-0"
                style={{ height: "500px" }}
                title="Email preview"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 px-5 py-8 text-[13px] text-[color:var(--signal-danger)]">
              <AlertCircle className="w-4 h-4" />
              {previewData?.error ?? "Error desconocido"}
            </div>
          )}
        </div>
      )}

      {/* Test send dialog */}
      {testSendEvent && (
        <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-card)] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[14px] font-semibold text-ink-0">Enviar email de prueba</p>
              <p className="text-[12px] text-ink-5 mt-0.5">
                Se enviará con asunto prefijado [PRUEBA]. No activa la automatización real.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setTestSendEvent(null); setTestResult(null); }}
              className="p-1.5 text-ink-5 hover:text-ink-0 rounded-[var(--r-sm)] hover:bg-[var(--surface-2)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-[12px] font-medium text-ink-3 mb-1">
                Email destino
              </label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="tu@email.com"
                className="h-10 w-full rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-3 text-[14px] text-ink-0 placeholder:text-ink-6 focus:border-ink-5 focus:outline-none focus:shadow-[var(--shadow-focus)]"
              />
            </div>
            <button
              type="button"
              disabled={testSending || !testEmail.trim()}
              onClick={handleTestSend}
              className={cn(
                "h-10 px-5 rounded-[var(--r-md)] text-[13px] font-semibold flex items-center gap-2 transition-all",
                testSending
                  ? "bg-ink-8 text-ink-5 cursor-wait"
                  : "bg-ink-0 text-ink-12 hover:bg-ink-2 active:scale-[0.97]",
              )}
            >
              {testSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {testSending ? "Enviando..." : "Enviar prueba"}
            </button>
          </div>

          {testResult && (
            <div className={cn(
              "mt-3 flex items-center gap-2 text-[13px] px-3 py-2 rounded-[var(--r-sm)]",
              testResult.success
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200",
            )}>
              {testResult.success ? (
                <><CheckCircle className="w-4 h-4 shrink-0" /> Email de prueba enviado correctamente</>
              ) : (
                <><XCircle className="w-4 h-4 shrink-0" /> {testResult.error}</>
              )}
            </div>
          )}
        </div>
      )}

      {/* Email logs */}
      <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-card)] overflow-hidden">
        <button
          type="button"
          onClick={handleLoadLogs}
          className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-[var(--surface-1)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-ink-5" />
            <span className="text-[14px] font-medium text-ink-0">Últimos envíos</span>
          </div>
          {showLogs ? <ChevronUp className="w-4 h-4 text-ink-5" /> : <ChevronDown className="w-4 h-4 text-ink-5" />}
        </button>

        {showLogs && (
          <div className="border-t border-[color:var(--hairline)]">
            {logsLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-ink-5 text-[13px]">
                <Loader2 className="w-4 h-4 animate-spin" /> Cargando logs...
              </div>
            ) : logs.length === 0 ? (
              <div className="px-5 py-8 text-center text-[13px] text-ink-5">
                No hay emails registrados todavía.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-[var(--surface-1)]">
                      <th className="text-left px-4 py-2 text-[11px] font-medium uppercase tracking-[0.1em] text-ink-5">Fecha</th>
                      <th className="text-left px-4 py-2 text-[11px] font-medium uppercase tracking-[0.1em] text-ink-5">Evento</th>
                      <th className="text-left px-4 py-2 text-[11px] font-medium uppercase tracking-[0.1em] text-ink-5">Destino</th>
                      <th className="text-left px-4 py-2 text-[11px] font-medium uppercase tracking-[0.1em] text-ink-5">Estado</th>
                      <th className="text-left px-4 py-2 text-[11px] font-medium uppercase tracking-[0.1em] text-ink-5 hidden sm:table-cell">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-t border-[color:var(--hairline)] hover:bg-[var(--surface-1)] transition-colors">
                        <td className="px-4 py-2.5 font-mono text-[11px] text-ink-5 whitespace-nowrap" suppressHydrationWarning>
                          {new Date(log.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-4 py-2.5 text-ink-0 font-medium">{log.eventLabel}</td>
                        <td className="px-4 py-2.5 text-ink-5 truncate max-w-[180px]">{log.recipient}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium",
                            log.status === "sent" ? "bg-emerald-50 text-emerald-700" :
                            log.status === "failed" ? "bg-red-50 text-red-700" :
                            "bg-amber-50 text-amber-700",
                          )}>
                            {log.status === "sent" ? <CheckCircle className="w-3 h-3" /> : log.status === "failed" ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {log.status === "sent" ? "Enviado" : log.status === "failed" ? "Falló" : "Pendiente"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-[12px] text-red-500 truncate max-w-[200px] hidden sm:table-cell">
                          {log.errorMessage || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-2 text-[11px] text-ink-6 border-t border-[color:var(--hairline)]">
                  Mostrando {logs.length} de {logsTotal} emails
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Automation Row ─────────────────────────────────────────────────────

function EmailAutomationRow({
  def,
  isPreviewActive,
  onPreview,
  onTestSend,
}: {
  def: EmailAutomationDefinition;
  isPreviewActive: boolean;
  onPreview: () => void;
  onTestSend: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3 hover:bg-[var(--surface-1)] transition-colors">
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-medium text-ink-0">{def.label}</span>
          <span className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-medium",
            def.customerFacing ? "bg-sky-50 text-sky-600" : "bg-violet-50 text-violet-600",
          )}>
            {def.customerFacing ? "Al cliente" : "Para vos"}
          </span>
        </div>
        <p className="text-[11px] text-ink-5 mt-0.5">{def.description}</p>
        <p className="text-[10px] text-ink-6 mt-0.5">Trigger: {def.trigger}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {def.supportsPreview && (
          <button
            type="button"
            onClick={onPreview}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-[var(--r-sm)] text-[12px] font-medium transition-all",
              isPreviewActive
                ? "bg-ink-0 text-ink-12"
                : "bg-[var(--surface-1)] text-ink-3 hover:bg-[var(--surface-2)] border border-[color:var(--hairline)]",
            )}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Preview</span>
          </button>
        )}
        {def.supportsTestSend && (
          <button
            type="button"
            onClick={onTestSend}
            className="flex items-center gap-1 px-3 py-1.5 rounded-[var(--r-sm)] text-[12px] font-medium bg-[var(--surface-1)] text-ink-3 hover:bg-[var(--surface-2)] border border-[color:var(--hairline)] transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Prueba</span>
          </button>
        )}
      </div>
    </div>
  );
}
