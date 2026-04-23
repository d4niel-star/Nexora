// ─── GET /api/shipping/label?carrier=&id= ────────────────────────────────
// Returns the carrier's label PDF when supported. Today only Andreani
// exposes a label endpoint; Correo Argentino doesn't, so we explicitly
// reject those requests with a 422 + honest message.

import { NextRequest, NextResponse } from "next/server";

import { getCurrentStore } from "@/lib/auth/session";
import { getCarrierById } from "@/lib/shipping/registry";
import { loadAuthContext } from "@/lib/shipping/store-connection";
import type { CarrierId } from "@/lib/shipping/types";

export const dynamic = "force-dynamic";

const VALID_CARRIERS = new Set<CarrierId>(["correo_argentino", "andreani"]);

export async function GET(request: NextRequest) {
  const store = await getCurrentStore();
  if (!store) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const carrierParam = url.searchParams.get("carrier");
  const idParam = url.searchParams.get("id");

  if (!carrierParam || !idParam) {
    return NextResponse.json(
      { error: "Faltan parámetros carrier / id." },
      { status: 400 },
    );
  }
  if (!VALID_CARRIERS.has(carrierParam as CarrierId)) {
    return NextResponse.json({ error: "Carrier no soportado." }, { status: 400 });
  }
  const carrierId = carrierParam as CarrierId;
  const meta = getCarrierById(carrierId);
  if (!meta) {
    return NextResponse.json({ error: "Carrier no soportado." }, { status: 400 });
  }
  if (!meta.adapter.capabilities.labelPdf || !meta.adapter.getLabelPdf) {
    return NextResponse.json(
      {
        error: `${meta.name} no expone descarga de etiqueta vía API. Imprimila desde su portal.`,
      },
      { status: 422 },
    );
  }

  const ctx = await loadAuthContext(store.id, carrierId);
  if (!ctx) {
    return NextResponse.json(
      { error: "Conectá la cuenta del carrier para descargar etiquetas." },
      { status: 412 },
    );
  }

  const result = await meta.adapter.getLabelPdf(ctx, idParam);
  if (!result.ok) {
    const status = result.code === "not_supported" ? 404 : 502;
    return NextResponse.json({ error: result.message }, { status });
  }

  return new NextResponse(result.pdf as unknown as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="etiqueta-${meta.id}-${idParam}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
