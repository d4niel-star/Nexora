import { NextRequest, NextResponse } from "next/server";
import { processLogisticsWebhook } from "@/lib/logistics/webhook";
import { logSystemEvent } from "@/lib/observability/audit";

// Example payload for mock_carrier to this route:
// POST /api/logistics/webhook/mock_carrier
// Headers: Authorization: Bearer mock-secret
// Body: { "eventId": "123", "trackingCode": "MC-...", "status": "delivered" }

export async function POST(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const resolvedParams = await params;
  try {
    const providerId = resolvedParams.provider;

    const result = await processLogisticsWebhook(providerId, request);

    if (result.status === "ignored_duplicate" || result.status === "ignored_backwards_transition") {
      return NextResponse.json({ received: true, note: result.status }, { status: 200 });
    }

    if (result.status === "error_not_found") {
       return NextResponse.json({ received: true, note: "order_not_found" }, { status: 200 }); 
    }

    return NextResponse.json({ success: true, orderId: result.orderId });

  } catch (error: any) {
    await logSystemEvent({
      entityType: "webhook_logistics",
      eventType: "logistics_webhook_exception",
      severity: "critical",
      source: `logistics_webhook_${resolvedParams.provider}`,
      message: `Excepción no controlada en webhook logístico`,
      metadata: { error: error.message, provider: resolvedParams.provider }
    });

    if (error.message?.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // HARDENING: Don't leak internal error details to external callers
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
