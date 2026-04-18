import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { getPayment, type MPPaymentResponse } from "@/lib/payments/mercadopago/client";
import { getMercadoPagoCredentialsForStore } from "@/lib/payments/mercadopago/tenant";
import { sendEmailEvent } from "@/lib/email/events";
import { triggerStockCriticalIfNeeded } from "@/lib/email/events/stock-critical";
import { trackServerEvent } from "@/lib/analytics/server-events";
import { logSystemEvent } from "@/lib/observability/audit";
import { storePath } from "@/lib/store-engine/urls";
import type { EventType } from "@/lib/email/types";

export const runtime = "nodejs";

type MercadoPagoWebhookBody = {
  action?: string;
  type?: string;
  topic?: string;
  data?: { id?: string | number };
  id?: string | number;
  resource?: string;
};

function getWebhookTopic(body: MercadoPagoWebhookBody, request: NextRequest): string | null {
  return (
    body.topic ||
    body.type ||
    request.nextUrl.searchParams.get("topic") ||
    request.nextUrl.searchParams.get("type") ||
    null
  );
}

function getResourceId(body: MercadoPagoWebhookBody, request: NextRequest): string | null {
  const queryId = request.nextUrl.searchParams.get("data.id") || request.nextUrl.searchParams.get("id");
  const rawId = body.data?.id ?? body.id ?? queryId;

  if (rawId) return String(rawId);

  if (body.resource) {
    const resourceParts = body.resource.split("/").filter(Boolean);
    return resourceParts[resourceParts.length - 1] || null;
  }

  return null;
}

function parseMercadoPagoSignature(signatureHeader: string | null): { ts?: string; v1?: string } {
  if (!signatureHeader) return {};

  return signatureHeader.split(",").reduce<{ ts?: string; v1?: string }>((acc, part) => {
    const [rawKey, rawValue] = part.split("=");
    const key = rawKey?.trim();
    const value = rawValue?.trim();
    if (key === "ts") acc.ts = value;
    if (key === "v1") acc.v1 = value;
    return acc;
  }, {});
}

function safeCompareHex(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(received, "hex");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

function validateMercadoPagoSignature(
  request: NextRequest,
  resourceId: string,
): { ok: true } | { ok: false; status: number; error: string } {
  const secret = process.env.MP_WEBHOOK_SECRET;

  if (!secret) {
    return { ok: false, status: 500, error: "missing_webhook_secret" };
  }

  const xSignature = request.headers.get("x-signature");
  const xRequestId = request.headers.get("x-request-id");
  const { ts, v1 } = parseMercadoPagoSignature(xSignature);

  if (!xRequestId || !ts || !v1) {
    return { ok: false, status: 401, error: "invalid_signature_headers" };
  }

  const manifest = `id:${resourceId.toLowerCase()};request-id:${xRequestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  if (!safeCompareHex(expected, v1)) {
    return { ok: false, status: 401, error: "invalid_signature" };
  }

  return { ok: true };
}

function mapMPStatusToOrderPaymentStatus(mpStatus: string): string {
  switch (mpStatus) {
    case "approved":
      return "paid";
    case "pending":
    case "in_process":
    case "authorized":
      return "pending";
    case "rejected":
    case "cancelled":
      return "failed";
    case "refunded":
    case "charged_back":
      return "refunded";
    default:
      return "pending";
  }
}

function mapMPStatusToOrderStatus(mpStatus: string, currentOrderStatus: string): string {
  if (mpStatus === "approved") {
    return currentOrderStatus === "new" ? "paid" : currentOrderStatus;
  }

  if (mpStatus === "rejected" || mpStatus === "cancelled") {
    return currentOrderStatus === "new" ? "cancelled" : currentOrderStatus;
  }

  if (mpStatus === "refunded" || mpStatus === "charged_back") {
    return "refunded";
  }

  return currentOrderStatus;
}

function getCollectorFees(mpPayment: MPPaymentResponse): number {
  return (mpPayment.fee_details || [])
    .filter((fee) => fee.fee_payer === "collector")
    .reduce((sum, fee) => sum + (fee.amount || 0), 0);
}

function getPaymentRawResponse(mpPayment: MPPaymentResponse): string {
  return JSON.stringify({
    id: mpPayment.id,
    status: mpPayment.status,
    status_detail: mpPayment.status_detail,
    transaction_amount: mpPayment.transaction_amount,
    transaction_amount_refunded: mpPayment.transaction_amount_refunded,
    currency_id: mpPayment.currency_id,
    payment_method_id: mpPayment.payment_method_id,
    payment_type_id: mpPayment.payment_type_id,
    date_approved: mpPayment.date_approved,
  });
}

async function resolveStoreId(request: NextRequest, resourceId: string): Promise<string | null> {
  const storeId = request.nextUrl.searchParams.get("storeId");

  if (storeId) return storeId;

  const existingPayment = await prisma.payment.findFirst({
    where: { externalId: resourceId },
    select: {
      order: {
        select: { storeId: true },
      },
    },
  });

  return existingPayment?.order.storeId || null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MercadoPagoWebhookBody;
    const topic = getWebhookTopic(body, request);
    const resourceId = getResourceId(body, request);
    const isPaymentEvent = topic === "payment" || body.action?.startsWith("payment.") === true;

    if (!isPaymentEvent) {
      return NextResponse.json({ status: "ignored", topic }, { status: 200 });
    }

    if (!resourceId) {
      await logSystemEvent({
        entityType: "payment",
        eventType: "mercadopago_webhook_failed",
        severity: "warn",
        source: "mercadopago_webhook",
        message: "Mercado Pago webhook sin payment id.",
      });
      return NextResponse.json({ error: "missing_resource_id" }, { status: 400 });
    }

    const signature = validateMercadoPagoSignature(request, resourceId);
    if (!signature.ok) {
      await logSystemEvent({
        entityType: "payment",
        entityId: resourceId,
        eventType: "mercadopago_webhook_signature_failed",
        severity: signature.status === 500 ? "critical" : "warn",
        source: "mercadopago_webhook",
        message: `Mercado Pago webhook rejected: ${signature.error}`,
      });
      return NextResponse.json({ error: signature.error }, { status: signature.status });
    }

    const storeId = await resolveStoreId(request, resourceId);
    if (!storeId) {
      await logSystemEvent({
        entityType: "payment",
        entityId: resourceId,
        eventType: "mercadopago_webhook_failed",
        severity: "error",
        source: "mercadopago_webhook",
        message: "Mercado Pago webhook sin contexto de tienda.",
      });
      return NextResponse.json({ error: "missing_store_context" }, { status: 400 });
    }

    const mpCredentials = await getMercadoPagoCredentialsForStore(storeId);
    const mpPayment = await getPayment(mpCredentials.accessToken, resourceId);
    const orderId = mpPayment.external_reference;

    if (!orderId) {
      await logSystemEvent({
        storeId,
        entityType: "payment",
        entityId: String(mpPayment.id),
        eventType: "mercadopago_webhook_failed",
        severity: "warn",
        source: "mercadopago_webhook",
        message: "Payment de Mercado Pago sin external_reference.",
      });
      return NextResponse.json({ error: "no_external_reference" }, { status: 400 });
    }

    const newPaymentStatus = mapMPStatusToOrderPaymentStatus(mpPayment.status);
    const collectorFees = getCollectorFees(mpPayment);
    const rawResponse = getPaymentRawResponse(mpPayment);

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, storeId },
        include: {
          items: true,
          store: {
            include: {
              owner: { select: { email: true, name: true } },
              users: { take: 1, select: { email: true, name: true } },
            },
          },
        },
      });

      if (!order) {
        throw new Error("order_not_found");
      }

      const existingPayment = await tx.payment.findFirst({
        where: {
          orderId: order.id,
          externalId: String(mpPayment.id),
        },
      });

      const paymentData = {
        provider: "mercadopago",
        status: mpPayment.status,
        externalId: String(mpPayment.id),
        externalReference: order.id,
        preferenceId: order.mpPreferenceId,
        amount: mpPayment.transaction_amount,
        currency: mpPayment.currency_id,
        paymentMethod: mpPayment.payment_method_id,
        paymentType: mpPayment.payment_type_id,
        installments: mpPayment.installments,
        paidAt: mpPayment.date_approved ? new Date(mpPayment.date_approved) : null,
        rawResponse,
      };

      if (existingPayment) {
        await tx.payment.update({
          where: { id: existingPayment.id },
          data: paymentData,
        });
      } else {
        const pendingPayment = await tx.payment.findFirst({
          where: {
            orderId: order.id,
            status: "pending",
            externalId: null,
          },
        });

        if (pendingPayment) {
          await tx.payment.update({
            where: { id: pendingPayment.id },
            data: paymentData,
          });
        } else {
          await tx.payment.create({
            data: {
              orderId: order.id,
              ...paymentData,
            },
          });
        }
      }

      const newOrderStatus = mapMPStatusToOrderStatus(mpPayment.status, order.status);
      const orderUpdateData: Record<string, unknown> = {
        paymentStatus: newPaymentStatus,
        status: newOrderStatus,
        mpPaymentId: String(mpPayment.id),
      };

      if (newPaymentStatus === "paid") {
        orderUpdateData.publicStatus = "PAID";
      }

      if (newPaymentStatus === "failed") {
        orderUpdateData.publicStatus = "CANCELLED";
        orderUpdateData.cancelledAt = order.cancelledAt || new Date();
      }

      if (newPaymentStatus === "refunded") {
        orderUpdateData.publicStatus = "REFUNDED";
        orderUpdateData.refundedAt = order.refundedAt || new Date();
        orderUpdateData.refundAmount = mpPayment.transaction_amount_refunded || order.total;
      }

      if (mpPayment.status === "approved" && collectorFees > 0) {
        orderUpdateData.paymentFee = collectorFees;
      }

      await tx.order.update({
        where: { id: order.id },
        data: orderUpdateData,
      });

      let stockCommitted = false;
      const decrementedVariantIds: string[] = [];
      if (newPaymentStatus === "paid" && order.paymentStatus !== "paid") {
        const existingMovement = await tx.stockMovement.findFirst({
          where: { orderId: order.id, type: "sale" },
        });

        if (!existingMovement) {
          for (const item of order.items) {
            if (!item.productId || !item.variantId) continue;

            const variant = await tx.productVariant.findUnique({
              where: { id: item.variantId },
            });

            if (!variant || !variant.trackInventory) continue;

            // ─── Race-safe conditional decrement ───
            // Same guard as lib/store-engine/inventory/actions.ts. Two concurrent
            // webhooks for the last unit cannot both succeed: only one UPDATE
            // whose WHERE clause is satisfied commits.
            if (variant.allowBackorder) {
              await tx.productVariant.update({
                where: { id: item.variantId },
                data: { stock: { decrement: item.quantity } },
              });
            } else {
              const result = await tx.productVariant.updateMany({
                where: {
                  id: item.variantId,
                  stock: { gte: item.quantity },
                },
                data: { stock: { decrement: item.quantity } },
              });

              if (result.count === 0) {
                // Abort the whole stock commit for this order. The webhook
                // itself should not 500 to MP (we still acknowledge the
                // payment); surface the issue via audit log instead.
                throw new Error(
                  `insufficient_stock_at_commit:${item.variantId}:requested=${item.quantity}:available=${variant.stock}`,
                );
              }
            }

            await tx.stockMovement.create({
              data: {
                storeId: order.storeId,
                productId: item.productId,
                variantId: item.variantId,
                orderId: order.id,
                type: "sale",
                quantityDelta: -item.quantity,
                reason: `Order ${order.orderNumber} via Mercado Pago`,
              },
            });

            decrementedVariantIds.push(item.variantId);
          }

          stockCommitted = true;
        }
      }

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        storeId: order.storeId,
        storeSlug: order.store.slug,
        storeName: order.store.name,
        ownerEmail: order.store.owner?.email || order.store.users[0]?.email || null,
        customerEmail: order.email,
        customerName: order.firstName,
        subtotal: order.subtotal,
        shippingAmount: order.shippingAmount,
        total: order.total,
        currency: order.currency,
        shippingMethodLabel: order.shippingMethodLabel || undefined,
        newOrderStatus,
        stockCommitted,
        decrementedVariantIds,
      };
    });

    await logSystemEvent({
      storeId: result.storeId,
      entityType: "order",
      entityId: result.orderId,
      eventType: `payment_${newPaymentStatus}`,
      source: "mercadopago_webhook",
      message: `Orden ${result.orderNumber} actualizada por webhook MP: ${newPaymentStatus}`,
      metadata: {
        mpPaymentId: mpPayment.id,
        mpStatus: mpPayment.status,
        newOrderStatus: result.newOrderStatus,
      },
    });

    if (result.stockCommitted) {
      await logSystemEvent({
        storeId: result.storeId,
        entityType: "order",
        entityId: result.orderId,
        eventType: "stock_committed",
        source: "mercadopago_webhook",
        message: `Stock descontado para la orden ${result.orderNumber}.`,
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const statusPath =
      newPaymentStatus === "failed"
        ? `checkout/failure?orderId=${result.orderId}`
        : newPaymentStatus === "paid"
          ? `checkout/success?orderId=${result.orderId}`
          : `checkout/pending?orderId=${result.orderId}`;

    let eventType: EventType | null = null;
    if (newPaymentStatus === "paid") eventType = "PAYMENT_APPROVED";
    if (newPaymentStatus === "pending") eventType = "PAYMENT_PENDING";
    if (newPaymentStatus === "failed") eventType = "PAYMENT_FAILED";
    if (newPaymentStatus === "refunded") eventType = "PAYMENT_REFUNDED";

    if (eventType) {
      const emailData = {
        storeSlug: result.storeSlug,
        storeName: result.storeName,
        customerName: result.customerName,
        orderNumber: result.orderNumber,
        orderId: result.orderId,
        subtotal: result.subtotal,
        shippingAmount: result.shippingAmount,
        total: result.total,
        currency: result.currency,
        shippingMethodLabel: result.shippingMethodLabel,
        statusUrl: `${appUrl}${storePath(result.storeSlug, statusPath)}`,
      };

      sendEmailEvent({
        storeId: result.storeId,
        eventType,
        entityType: "order",
        entityId: result.orderId,
        recipient: result.customerEmail,
        data: emailData,
      }).catch((err) => console.error(`[MP Webhook] Customer email failed (${eventType})`, err));

      if (newPaymentStatus === "paid" && result.ownerEmail) {
        sendEmailEvent({
          storeId: result.storeId,
          eventType: "ORDER_PAID_OWNER",
          entityType: "order",
          entityId: result.orderId,
          recipient: result.ownerEmail,
          data: {
            ...emailData,
            statusUrl: `${appUrl}/admin/orders`,
          },
        }).catch((err) => console.error("[MP Webhook] Owner email failed", err));
      }
    }

    // ─── Server-side analytics (purchase) ───
    // Fires to GA4 Measurement Protocol only if env keys are set. No-op otherwise.
    if (newPaymentStatus === "paid") {
      trackServerEvent({
        clientId: result.orderId,
        name: "purchase",
        params: {
          transaction_id: result.orderNumber,
          value: result.total,
          currency: result.currency,
          shipping: result.shippingAmount,
        },
      }).catch(() => { /* swallow: analytics must never break webhook */ });
    }

    // ─── Stock-critical alert (fire-and-forget, outside tx) ───
    // One email per (variant, order) at most, only if variant now sits
    // at or below its reorderPoint. See lib/email/events/stock-critical.ts.
    if (result.stockCommitted && result.decrementedVariantIds.length > 0) {
      for (const variantId of result.decrementedVariantIds) {
        triggerStockCriticalIfNeeded({
          storeId: result.storeId,
          variantId,
          orderId: result.orderId,
        }).catch((err) =>
          console.error("[MP Webhook] Stock-critical check failed", err),
        );
      }
    }

    revalidatePath("/admin/orders");

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";

    await logSystemEvent({
      entityType: "webhook",
      eventType: "mercadopago_webhook_exception",
      severity: "critical",
      source: "mercadopago_webhook",
      message: "Fallo inesperado procesando webhook de Mercado Pago.",
      metadata: { errorMessage: message },
    });

    if (message === "order_not_found") {
      return NextResponse.json({ error: "order_not_found" }, { status: 404 });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "webhook_active" });
}
