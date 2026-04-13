import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  await prisma.storeSubscription.deleteMany({});
  return NextResponse.json({ success: true, message: "Todas las suscripciones eliminadas. QA mode listo." });
}
