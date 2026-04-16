import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { logSystemEvent } from "@/lib/observability/audit";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { storeSlug, orderId, email, name, reason } = body;

    // Securely find the exact store matching the slug passed in the storefront
    const targetStore = await prisma.store.findUnique({
      where: { slug: storeSlug }
    });
    
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
