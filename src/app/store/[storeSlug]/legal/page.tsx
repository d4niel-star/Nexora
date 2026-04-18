import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";

export default async function LegalPage({ params, searchParams }: { params: Promise<{ storeSlug: string }>, searchParams: Promise<{ policy?: string }> }) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  // Find the exact tenant store requested via the URL slug
  const store = await prisma.store.findUnique({
    where: { slug: resolvedParams.storeSlug }
  });
  if (!store) notFound();

  const settings = await prisma.storeLegalSettings.findUnique({
    where: { storeId: store.id }
  });

  const policyType = resolvedSearch.policy || "privacy";
  
  let title = "Aviso Legal";
  let content = "Esta tienda aún no ha configurado esta política.";

  if (settings) {
    switch (policyType) {
      case "privacy":
        title = "Política de Privacidad";
        content = settings.privacyPolicy || content;
        break;
      case "terms":
        title = "Términos y Condiciones";
        content = settings.termsOfService || content;
        break;
      case "refunds":
        title = "Política de Devoluciones";
        content = settings.refundPolicy || content;
        break;
    }
  }

  // Very basic markdown handling using div -> whitespace-pre-wrap
  return (
    <div className="max-w-3xl mx-auto py-16 px-6 relative min-h-[70vh]">
      <div className="mb-12">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#111111] mb-2">{title}</h1>
        {settings?.businessInfo && (
           <p className="text-sm font-semibold uppercase tracking-wider text-[#888888]">Responsable: {settings.businessInfo}</p>
        )}
      </div>

      <article className="prose prose-sm md:prose-base prose-slate max-w-none bg-white p-8 md:p-12 rounded-3xl border border-[#EAEAEA] shadow-sm whitespace-pre-wrap">
         {content}
      </article>

      <div className="mt-8 pt-8 border-t border-[#EAEAEA] text-center">
         <p className="text-xs text-[#888888]">La recopilación y tratamiento de datos personales se realiza de acuerdo a la Ley N° 25.326 de Protección de los Datos Personales de la República Argentina y la AAIP.</p>
      </div>
    </div>
  );
}
