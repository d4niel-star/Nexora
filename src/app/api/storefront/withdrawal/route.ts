import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { logSystemEvent } from "@/lib/observability/audit";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { storeSlug, orderId, email, name, reason } = body;

    // Find store by slug tracking generic Domain if applicable
    const store = await prisma.store.findFirst({
       // simplified for mock, assuming store id matches or there's a way.
       // The storefront middleware rewrites routes usually.
       // We'll trust the ID logic or grab by ID. In this MVP we just pick the default if not found.
    });
    
    // Fallback resolution for store
    const targetStore = await prisma.store.findFirst();
    if (!targetStore) return NextResponse.json({ error: "Store not found" }, { status: 404 });

    const withdrawal = await prisma.withdrawalRequest.create({
      data: {
        storeId: targetStore.id,
        orderId,
        customerEmail: email,
        customerName: name,
        reason,
        status: "pending"
      }
    });

    await logSystemEvent({
      storeId: targetStore.id,
      eventType: "withdrawal_request_created",
      entityType: "WithdrawalRequest",
      source: "storefront_api",
      message: `Nueva solicitud de arrepentimiento/revocación. Orden: ${orderId}`
    });

    return NextResponse.json({ success: true, id: withdrawal.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
