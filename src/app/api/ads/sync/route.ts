import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { syncAdsInsights } from "@/lib/ads/sync/actions";

// Route: GET /api/ads/sync
// Triggered by a cron job or external scheduler (e.g., Vercel Cron, GitHub Actions, Render Cron)
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  
  // Basic security: only allow execution if a secret matches, or if no secret is configured (dev mode)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const connections = await prisma.adPlatformConnection.findMany({
      where: {
        status: "connected",
        externalAccountId: { not: null },
      }
    });

    const results = [];

    for (const conn of connections) {
      try {
        await syncAdsInsights(conn.id);
        results.push({ id: conn.id, platform: conn.platform, status: "success" });
      } catch (err: any) {
        results.push({ id: conn.id, platform: conn.platform, status: "error", error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      processed: connections.length,
      results
    });
  } catch (error: any) {
    console.error("[Ads Cron Sync Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
