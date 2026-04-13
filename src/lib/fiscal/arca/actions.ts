"use server";

import { prisma } from "@/lib/db/prisma";
import { issueInvoiceForOrder } from "./services";
import { revalidatePath } from "next/cache";

export async function getStoreFiscalProfileAction(storeId: string) {
  return await prisma.fiscalProfile.findUnique({
    where: { storeId }
  });
}

export async function upsertFiscalProfileAction(storeId: string, data: any) {
  const profile = await prisma.fiscalProfile.upsert({
    where: { storeId },
    update: { ...data },
    create: { storeId, ...data }
  });
  revalidatePath("/admin/settings");
  revalidatePath("/admin/fiscal");
  return profile;
}

export async function getInvoicesAction(storeId: string) {
  return await prisma.fiscalInvoice.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" },
    include: { order: { select: { orderNumber: true } } }
  });
}

export async function manualIssueInvoiceAction(orderId: string) {
  const invoice = await issueInvoiceForOrder(orderId);
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/fiscal");
  return invoice;
}

// ─── Legal Settings Actions ───

export async function getStoreLegalSettingsAction(storeId: string) {
  return await prisma.storeLegalSettings.findUnique({
    where: { storeId }
  });
}

export async function upsertLegalSettingsAction(storeId: string, data: any) {
  const settings = await prisma.storeLegalSettings.upsert({
    where: { storeId },
    update: { ...data },
    create: { storeId, ...data }
  });
  revalidatePath("/admin/settings");
  return settings;
}

// ─── Withdrawal Actions ───

export async function getWithdrawalRequestsAction(storeId: string) {
  return await prisma.withdrawalRequest.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" }
  });
}

export async function submitWithdrawalRequestAction(storeId: string, data: { orderId?: string; customerEmail: string; customerName: string; reason?: string }) {
  const req = await prisma.withdrawalRequest.create({
    data: {
      storeId,
      ...data
    }
  });
  return req;
}

export async function resolveWithdrawalRequestAction(requestId: string, status: "resolved" | "rejected") {
  const req = await prisma.withdrawalRequest.update({
    where: { id: requestId },
    data: {
       status,
       resolvedAt: status === "resolved" ? new Date() : null
    }
  });
  revalidatePath("/admin/fiscal");
  return req;
}
