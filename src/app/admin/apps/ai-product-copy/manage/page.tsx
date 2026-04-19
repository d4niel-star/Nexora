// ─── AI product copy · Manage surface ───
// Dedicated surface so "Abrir app" for ai-product-copy lands somewhere
// that explains what the app actually does — instead of the generic
// /admin/catalog page which doesn't mention AI copy.
//
// The app itself is a thin layer over the catalog's AI draft flow: the
// merchant opens a product, requests copy, reviews the draft, and
// publishes. This surface explains that flow and deep-links into it.

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  PenLine,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { getActiveStoreInfo } from "@/lib/store-engine/admin/queries";
import { getAppDetail } from "@/lib/apps/queries";
import { AppStatusBadge } from "@/components/admin/apps/AppStatusBadge";

export const dynamic = "force-dynamic";

const APP_SLUG = "ai-product-copy";

export default async function AiProductCopyManagePage() {
  const store = await getActiveStoreInfo();
  const item = await getAppDetail(store.id, APP_SLUG);
  if (!item) {
    return (
      <div className="p-10 text-[13px] text-ink-5">App no encontrada.</div>
    );
  }

  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [productCount, appliedLast30d, appliedTotal] = await Promise.all([
    prisma.product.count({ where: { storeId: store.id } }),
    prisma.systemEvent.count({
      where: {
        storeId: store.id,
        eventType: "ai_product_sheet_applied",
        createdAt: { gte: since30d },
      },
    }),
    prisma.systemEvent.count({
      where: {
        storeId: store.id,
        eventType: "ai_product_sheet_applied",
      },
    }),
  ]);

  return (
    <div className="animate-in fade-in duration-[var(--dur-slow)] space-y-8">
      <Link
        href={`/admin/apps/${APP_SLUG}`}
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-5 hover:text-ink-0 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
        Volver a la app
      </Link>

      {/* Header */}
      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6 lg:p-8">
        <div className="flex items-start gap-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
            <PenLine className="h-5 w-5 text-ink-0" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
                IA
              </span>
              <span className="text-ink-6">·</span>
              <AppStatusBadge
                availability={item.availability}
                installState={item.state}
              />
            </div>
            <h1 className="mt-2 text-[24px] lg:text-[28px] font-semibold leading-[1.12] tracking-[-0.025em] text-ink-0">
              IA para copys de producto
            </h1>
            <p className="mt-2 max-w-2xl text-[14px] leading-[1.55] text-ink-5">
              Generá títulos, bullets y descripciones SEO-ready desde el
              detalle de cada producto. La IA propone un draft y vos revisás
              antes de publicar. Nada se publica sin tu OK.
            </p>
          </div>
        </div>
      </div>

      {/* State */}
      <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
        <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
          Estado operativo
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-px overflow-hidden rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[color:var(--hairline)] md:grid-cols-3">
          <Stat
            icon={PenLine}
            label="Productos en catálogo"
            value={productCount.toLocaleString("es-AR")}
            hint="Todos pueden recibir un draft generado por IA."
          />
          <Stat
            icon={CheckCircle2}
            label="Aplicadas (30d)"
            value={appliedLast30d.toLocaleString("es-AR")}
            hint="Fichas IA aprobadas y aplicadas a un producto en los últimos 30 días. Auditado desde SystemEvent."
          />
          <Stat
            icon={Clock}
            label="Total histórico"
            value={appliedTotal.toLocaleString("es-AR")}
            hint="Todas las fichas IA que pasaron del draft a producto publicado."
          />
        </div>
      </section>

      {/* How to use */}
      <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
        <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
          Cómo usarla
        </h2>
        <ol className="mt-4 space-y-3 text-[13px] leading-[1.6] text-ink-3">
          <Step n={1}>
            Abrí un producto desde el{" "}
            <Link
              href="/admin/catalog"
              className="underline decoration-[color:var(--hairline-strong)] underline-offset-2 hover:decoration-ink-0"
            >
              catálogo
            </Link>
            .
          </Step>
          <Step n={2}>
            En el drawer del producto, usá la acción <strong>Generar con IA</strong>{" "}
            para pedir un draft de título, bullets y descripción.
          </Step>
          <Step n={3}>
            Revisá el <code className="text-[12px] font-mono">AIGenerationDraft</code>{" "}
            resultante y aplicalo al producto si te convence. Si no, regenerás
            o descartás.
          </Step>
          <Step n={4}>
            El draft queda versionado para auditoría — podés ver qué texto
            reemplazó al anterior y revertir si hace falta.
          </Step>
        </ol>
      </section>

      {/* Actions */}
      <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
        <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
          Acciones
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
          <RelatedLink
            href="/admin/catalog"
            title="Ir al catálogo"
            description="Abrir el listado de productos para generar o revisar drafts de copy."
          />
          <RelatedLink
            href="/admin/ai"
            title="Hub de IA"
            description="Ver créditos disponibles y el resto de las capacidades de IA."
          />
        </div>
      </section>

      {/* Credits / honesty footer */}
      <div className="rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 py-3 text-[11px] leading-[1.55] text-ink-6">
        Cada generación consume créditos IA del plan. El costo unitario está
        documentado en <code className="font-mono">CREDIT_COSTS.ai_product_sheet</code>{" "}
        dentro de <code className="font-mono">src/lib/billing/plans.ts</code>.
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="bg-[var(--surface-0)] p-5">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-ink-5" strokeWidth={1.75} />
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
          {label}
        </span>
      </div>
      <p className="mt-3 text-[22px] font-semibold tracking-[-0.02em] text-ink-0 tabular-nums">
        {value}
      </p>
      <p className="mt-2 text-[11px] leading-[1.5] text-ink-6">{hint}</p>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-[10px] font-semibold text-ink-3 tabular-nums">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}

function RelatedLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start justify-between gap-3 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-4 transition-colors hover:bg-[var(--surface-2)]"
    >
      <div>
        <p className="text-[13px] font-semibold text-ink-0">{title}</p>
        <p className="mt-1 text-[12px] leading-[1.5] text-ink-5">
          {description}
        </p>
      </div>
      <ArrowRight
        className="mt-1 h-3.5 w-3.5 shrink-0 text-ink-5 transition-transform group-hover:translate-x-0.5"
        strokeWidth={1.75}
      />
    </Link>
  );
}
