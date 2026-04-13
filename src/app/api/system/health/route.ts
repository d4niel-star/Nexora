import { NextResponse } from "next/server";
import { getSystemHealthReport } from "@/lib/observability/health";

/**
 * Internal Health Check Endpoint
 * GET /api/system/health
 * 
 * Returns system health status and recent activity.
 * In production, this should be protected by an internal API key.
 */
export async function GET() {
  try {
    const report = await getSystemHealthReport();
    return NextResponse.json(report, { status: report.status === "unhealthy" ? 503 : 200 });
  } catch (error: any) {
    return NextResponse.json(
      { status: "unhealthy", error: error.message },
      { status: 503 }
    );
  }
}
