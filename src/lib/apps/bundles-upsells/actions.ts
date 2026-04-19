"use server";

// ─── Bundles & Upsells · Server actions ───
// CRUD for tenant-scoped offers. Plan-gated; all writes validate the
// trigger + items belong to the current tenant.

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";
import { PLAN_DEFINITIONS, type PlanConfig } from "@/lib/billing/plans";

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

async function loadGate() {
  const store = await getCurrentStore();
  if (!store) return { store: null, planConfig: null } as const;
  const sub = await prisma.storeSubscription.findUnique({
    where: { storeId: store.id },
    include: { plan: true },
  });
  const planConfig: PlanConfig | null =
    sub?.status === "active" || sub?.status === "trialing"
      ? (sub.plan && PLAN_DEFINITIONS.find((p) => p.code === sub.plan.code)?.config) ?? null
      : null;
  return { store, planConfig } as const;
}

function invalidate(triggerHandle?: string | null) {
  revalidatePath("/admin/apps");
  revalidatePath("/admin/apps/bundles-upsells");
  revalidatePath("/admin/apps/bundles-upsells/offers");
  if (triggerHandle) {
    // PDP paths are built off both handle and id, so revalidate both forms.
    revalidatePath(`/store/[storeSlug]/products/${triggerHandle}`);
  }
}

export interface OfferInput {
  name: string;
  title?: string;
  description?: string;
  triggerProductId: string;
  itemProductIds: string[];
  status?: "draft" | "active";
}

function sanitize(s: unknown, max: number): string | undefined {
  if (typeof s !== "string") return undefined;
  const trimmed = s.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

async function assertTenantProducts(
  storeId: string,
  ids: string[],
): Promise<boolean> {
  if (ids.length === 0) return true;
  const count = await prisma.product.count({
    where: { id: { in: ids }, storeId },
  });
  return count === ids.length;
}

export async function createOfferAction(
  input: OfferInput,
): Promise<ActionResult> {
  const { store, planConfig } = await loadGate();
  if (!store) return { ok: false, error: "no_active_store" };
  if (!planConfig?.bundlesUpsells) return { ok: false, error: "plan_locked" };

  const name = sanitize(input.name, 120);
  if (!name) return { ok: false, error: "invalid_name" };

  const trigger = await prisma.product.findFirst({
    where: { id: input.triggerProductId, storeId: store.id },
    select: { id: true, handle: true },
  });
  if (!trigger) return { ok: false, error: "invalid_trigger" };

  const uniqueItems = Array.from(new Set(input.itemProductIds)).filter(
    (id) => id !== trigger.id,
  );
  if (!(await assertTenantProducts(store.id, uniqueItems))) {
    return { ok: false, error: "invalid_items" };
  }

  const status = input.status === "active" ? "active" : "draft";
  const title = sanitize(input.title, 140) ?? null;
  const description = sanitize(input.description, 500) ?? null;

  const created = await prisma.bundleOffer.create({
    data: {
      storeId: store.id,
      name,
      title,
      description,
      triggerProductId: trigger.id,
      status,
      items: {
        create: uniqueItems.map((productId, idx) => ({
          productId,
          position: idx,
        })),
      },
    },
    select: { id: true },
  });

  invalidate(trigger.handle);
  return { ok: true, id: created.id };
}

export async function updateOfferAction(
  id: string,
  input: OfferInput,
): Promise<ActionResult> {
  const { store, planConfig } = await loadGate();
  if (!store) return { ok: false, error: "no_active_store" };
  if (!planConfig?.bundlesUpsells) return { ok: false, error: "plan_locked" };

  const existing = await prisma.bundleOffer.findFirst({
    where: { id, storeId: store.id },
    select: { id: true, triggerProductId: true },
  });
  if (!existing) return { ok: false, error: "offer_not_found" };

  const name = sanitize(input.name, 120);
  if (!name) return { ok: false, error: "invalid_name" };

  const trigger = await prisma.product.findFirst({
    where: { id: input.triggerProductId, storeId: store.id },
    select: { id: true, handle: true },
  });
  if (!trigger) return { ok: false, error: "invalid_trigger" };

  const uniqueItems = Array.from(new Set(input.itemProductIds)).filter(
    (pid) => pid !== trigger.id,
  );
  if (!(await assertTenantProducts(store.id, uniqueItems))) {
    return { ok: false, error: "invalid_items" };
  }

  const status = input.status === "active" ? "active" : "draft";
  const title = sanitize(input.title, 140) ?? null;
  const description = sanitize(input.description, 500) ?? null;

  await prisma.$transaction([
    prisma.bundleOffer.update({
      where: { id },
      data: {
        name,
        title,
        description,
        triggerProductId: trigger.id,
        status,
      },
    }),
    prisma.bundleOfferItem.deleteMany({ where: { bundleId: id } }),
    ...(uniqueItems.length > 0
      ? [
          prisma.bundleOfferItem.createMany({
            data: uniqueItems.map((productId, idx) => ({
              bundleId: id,
              productId,
              position: idx,
            })),
          }),
        ]
      : []),
  ]);

  invalidate(trigger.handle);
  return { ok: true, id };
}

export async function deleteOfferAction(id: string): Promise<ActionResult> {
  const { store, planConfig } = await loadGate();
  if (!store) return { ok: false, error: "no_active_store" };
  if (!planConfig?.bundlesUpsells) return { ok: false, error: "plan_locked" };

  const existing = await prisma.bundleOffer.findFirst({
    where: { id, storeId: store.id },
    include: { trigger: { select: { handle: true } } },
  });
  if (!existing) return { ok: false, error: "offer_not_found" };

  await prisma.bundleOffer.delete({ where: { id } });
  invalidate(existing.trigger.handle);
  return { ok: true };
}

export async function setOfferStatusAction(
  id: string,
  status: "draft" | "active",
): Promise<ActionResult> {
  const { store, planConfig } = await loadGate();
  if (!store) return { ok: false, error: "no_active_store" };
  if (!planConfig?.bundlesUpsells) return { ok: false, error: "plan_locked" };

  const existing = await prisma.bundleOffer.findFirst({
    where: { id, storeId: store.id },
    include: { trigger: { select: { handle: true } } },
  });
  if (!existing) return { ok: false, error: "offer_not_found" };

  await prisma.bundleOffer.update({
    where: { id },
    data: { status },
  });
  invalidate(existing.trigger.handle);
  return { ok: true };
}
