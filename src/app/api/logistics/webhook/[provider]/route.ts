import { NextResponse } from "next/server";
import { logSystemEvent } from "@/lib/observability/audit";

export async function POST(_request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const resolvedParams = await params;

  await logSystemEvent({
    entityType: "webhook_logistics",
    eventType: "legacy_mock_logistics_disabled",
    severity: "warn",
    source: `legacy_logistics_webhook_${resolvedParams.provider}`,
    message: "Legacy mock logistics webhook disabled. Use the shipping subsystem instead.",
    metadata: { provider: resolvedParams.provider },
  });

  return NextResponse.json(
    {
      error: "legacy_mock_logistics_disabled",
      message: "Legacy mock logistics disabled. Use shipping subsystem.",
    },
    { status: 410 },
  );
}
