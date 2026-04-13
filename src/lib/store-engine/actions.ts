"use server";

import {
  updateStoreBranding,
  updateStoreNavigation,
  updateHomeBlocks,
  publishStore,
  saveDraft,
  generateStoreDraftFromAIInput,
} from "@/lib/store-engine/mutations";
import {
  getAdminStoreSummary,
  getStoreBranding,
  getStoreNavigation,
  getHomeBlocks,
  getDefaultStore,
  getStorePages,
} from "@/lib/store-engine/queries";
import type { BlockType, AIStoreInput } from "@/types/store-engine";
import { revalidatePath } from "next/cache";
import { logSystemEvent } from "../observability/audit";

// ─── Admin: Get store ID (returns default store for now) ───

export async function getAdminStoreId(): Promise<string | null> {
  const store = await getDefaultStore();
  return store?.id ?? null;
}

// ─── Admin: Get summary ───

export async function fetchAdminStoreSummary() {
  const store = await getDefaultStore();
  if (!store) return null;
  return getAdminStoreSummary(store.id);
}

// ─── Admin: Get branding ───

export async function fetchStoreBranding() {
  const store = await getDefaultStore();
  if (!store) return null;
  return getStoreBranding(store.id);
}

// ─── Admin: Get navigation ───

export async function fetchStoreNavigation() {
  const store = await getDefaultStore();
  if (!store) return null;
  return getStoreNavigation(store.id);
}

// ─── Admin: Get home blocks ───

export async function fetchHomeBlocks() {
  const store = await getDefaultStore();
  if (!store) return null;
  return getHomeBlocks(store.id);
}

// ─── Admin: Get pages ───

export async function fetchStorePages() {
  const store = await getDefaultStore();
  if (!store) return null;
  return getStorePages(store.id);
}

// ─── Admin: Save branding ───

export async function saveStoreBranding(data: {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  tone?: string;
  buttonStyle?: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
}) {
  const store = await getDefaultStore();
  if (!store) throw new Error("No store found");

  await updateStoreBranding(store.id, data);
  revalidatePath("/admin/store");
  revalidatePath(`/${store.slug}`);
  return { success: true };
}

// ─── Admin: Save navigation ───

export async function saveStoreNavigation(
  items: Array<{
    id?: string;
    group: string;
    label: string;
    href: string;
    sortOrder: number;
    isVisible: boolean;
  }>
) {
  const store = await getDefaultStore();
  if (!store) throw new Error("No store found");

  await updateStoreNavigation(store.id, items);
  revalidatePath("/admin/store");
  revalidatePath(`/${store.slug}`);
  return { success: true };
}

// ─── Admin: Save home blocks ───

export async function saveHomeBlocks(
  blocks: Array<{
    blockType: BlockType;
    sortOrder: number;
    isVisible: boolean;
    settingsJson: string;
    source?: string;
    state?: string;
  }>
) {
  const store = await getDefaultStore();
  if (!store) throw new Error("No store found");

  await updateHomeBlocks(store.id, blocks);
  revalidatePath("/admin/store");
  revalidatePath(`/${store.slug}`);
  return { success: true };
}

// ─── Admin: Publish store ───

export async function publishStoreAction() {
  const store = await getDefaultStore();
  if (!store) throw new Error("No store found");

  await publishStore(store.id);

  await logSystemEvent({
    storeId: store.id,
    entityType: "store",
    entityId: store.id,
    eventType: "publish_triggered",
    source: "admin_panel",
    message: `Tienda ${store.name} publicada exitosamente`
  });

  revalidatePath("/admin/store");
  revalidatePath(`/${store.slug}`);
  return { success: true };
}

// ─── Admin: Save as draft ───

export async function saveDraftAction() {
  const store = await getDefaultStore();
  if (!store) throw new Error("No store found");

  await saveDraft(store.id);
  revalidatePath("/admin/store");
  return { success: true };
}

// ─── AI Store Builder: Generate draft ───

export async function generateAIStoreDraft(input: AIStoreInput) {
  const store = await generateStoreDraftFromAIInput(input);
  revalidatePath("/admin/store");
  revalidatePath("/admin/ai-store-builder");
  revalidatePath(`/${store.slug}`);
  return { success: true, slug: store.slug, storeId: store.id };
}
