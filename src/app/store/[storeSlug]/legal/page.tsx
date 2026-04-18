import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";

// ─── Legal ───
// Single, hairline-bordered document surface. No shadow-sm card, no pastel
// tint. Long-form policy text rendered in an editorial reading column.

export default async function LegalPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string }>;
  searchParams: Promise<{ policy?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;

  const store = await prisma.store.findUnique({
    where: { slug: resolvedParams.storeSlug },
  });
  if (!store) notFound();

  const settings = await prisma.storeLegalSettings.findUnique({
    where: { storeId: store.id },
  });

  const policyType = resolvedSearch.policy || "privacy";

  let title = "Aviso legal";
  let content = "Esta tienda aún no ha configurado esta política.";

  if (settings) {
    switch (policyType) {
      case "privacy":
        title = "Política de privacidad";
        content = settings.privacyPolicy || content;
        break;
      case "terms":
        title = "Términos y condiciones";
        content = settings.termsOfService || content;
        break;
      case "refunds":
        title = "Política de devoluciones";
        content = settings.refundPolicy || content;
        break;
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
      <div className="mb-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-5">
          Legal
        </p>
        <h1 className="mt-3 font-semibold text-[32px] leading-[1.08] tracking-[-0.035em] text-ink-0 sm:text-[42px]">
          {title}
        </h1>
        {settings?.businessInfo && (
          <p className="mt-4 text-[13px] text-ink-5">
            Responsable · {settings.businessInfo}
          </p>
        )}
      </div>

      <article className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-6 py-7 text-[14px] leading-[1.65] text-ink-3 whitespace-pre-wrap sm:px-10 sm:py-10 sm:text-[15px]">
        {content}
      </article>

      <div className="mt-10 border-t border-[color:var(--hairline)] pt-8">
        <p className="text-[12px] leading-[1.6] text-ink-6">
          La recopilación y tratamiento de datos personales se realiza de
          acuerdo a la Ley N° 25.326 de Protección de los Datos Personales de
          la República Argentina y la AAIP.
        </p>
      </div>
    </div>
  );
}
