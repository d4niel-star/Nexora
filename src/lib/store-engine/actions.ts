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
import { prisma } from "@/lib/db/prisma";
import { isValidProductHandle, isValidStoreSlug, normalizeSlug } from "@/lib/store-engine/slug";
import { storePath } from "@/lib/store-engine/urls";

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function getAvailableProductHandle(storeId: string, title: string): Promise<string> {
  const fallback = `producto-${Date.now().toString(36)}`;
  const base = normalizeSlug(title) || fallback;
  let handle = isValidProductHandle(base) ? base : fallback;
  let suffix = 2;

  while (await prisma.product.findUnique({ where: { storeId_handle: { storeId, handle } }, select: { id: true } })) {
    handle = `${base}-${suffix}`;
    suffix += 1;
  }

  return handle;
}

function revalidateStorefrontShell(storeSlug: string) {
  revalidatePath(storePath(storeSlug));
  revalidatePath(storePath(storeSlug, "products"));
  revalidatePath(storePath(storeSlug, "cart"));
}

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
  revalidateStorefrontShell(store.slug);
  return { success: true };
}

// Admin: Save public store profile used by onboarding and storefront

export async function saveStoreProfileAction(formData: FormData) {
  const store = await getDefaultStore();
  if (!store) throw new Error("No store found");

  const name = formString(formData, "name");
  const slug = normalizeSlug(formString(formData, "slug") || store.slug);
  const description = formString(formData, "description");
  const logo = formString(formData, "logo");

  if (name.length < 2 || name.length > 80) {
    throw new Error("El nombre de la tienda debe tener entre 2 y 80 caracteres.");
  }

  if (!isValidStoreSlug(slug)) {
    throw new Error("El slug debe tener 3 a 60 caracteres y usar solo letras, numeros y guiones.");
  }

  if (description.length > 280) {
    throw new Error("La descripcion no puede superar 280 caracteres.");
  }

  if (logo && !/^https?:\/\/\S+$/i.test(logo)) {
    throw new Error("El logo debe ser una URL publica valida.");
  }

  const existingSlug = await prisma.store.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (existingSlug && existingSlug.id !== store.id) {
    throw new Error("Ese slug ya esta en uso por otra tienda.");
  }

  const previousSlug = store.slug;
  await prisma.store.update({
    where: { id: store.id },
    data: {
      name,
      slug,
      description: description || null,
      logo: logo || null,
      subdomain: `${slug}.nexora.app`,
    },
  });

  await updateStoreBranding(store.id, { logoUrl: logo || null });

  revalidatePath("/admin/store");
  revalidatePath("/admin/dashboard");
  revalidateStorefrontShell(previousSlug);
  revalidateStorefrontShell(slug);

  return { success: true, slug };
}

// Admin: Create first real product with one sellable variant for onboarding

export async function createFirstStoreProductAction(formData: FormData) {
  const store = await getDefaultStore();
  if (!store) throw new Error("No store found");

  const title = formString(formData, "title");
  const description = formString(formData, "description");
  const category = formString(formData, "category");
  const variantTitle = formString(formData, "variantTitle") || "Default";
  const price = Number(formString(formData, "price"));
  const stock = Number(formString(formData, "stock") || "0");
  const featuredImage = formString(formData, "featuredImage");

  if (title.length < 2 || title.length > 120) {
    throw new Error("El producto debe tener un nombre valido.");
  }

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("El precio debe ser mayor a cero.");
  }

  if (!Number.isInteger(stock) || stock < 0) {
    throw new Error("El stock debe ser un numero entero igual o mayor a cero.");
  }

  if (featuredImage && !/^https?:\/\/\S+$/i.test(featuredImage)) {
    throw new Error("La imagen debe ser una URL publica valida.");
  }

  const handle = await getAvailableProductHandle(store.id, title);
  const product = await prisma.product.create({
    data: {
      storeId: store.id,
      handle,
      title,
      description: description || null,
      category: category || null,
      supplier: "Propio",
      price,
      featuredImage: featuredImage || null,
      status: "published",
      isPublished: true,
      isFeatured: true,
      variants: {
        create: {
          title: variantTitle,
          price,
          stock,
          isDefault: true,
        },
      },
    },
    select: { id: true, handle: true },
  });

  await prisma.storeOnboarding.upsert({
    where: { storeId: store.id },
    create: { storeId: store.id, currentStage: "creating_store" },
    update: { currentStage: "creating_store" },
  });

  revalidatePath("/admin/catalog");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/store");
  revalidateStorefrontShell(store.slug);

  return { success: true, product };
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
  revalidateStorefrontShell(store.slug);
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
  revalidateStorefrontShell(store.slug);
  return { success: true };
}

// ─── Admin: Publish store ───

export async function publishStoreAction() {
  const store = await getDefaultStore();
  if (!store) throw new Error("No store found");

  const publishedProducts = await prisma.product.count({
    where: {
      storeId: store.id,
      isPublished: true,
      status: { not: "archived" },
      variants: { some: { stock: { gt: 0 } } },
    },
  });

  if (publishedProducts === 0) {
    throw new Error("Antes de publicar, crea al menos un producto publicado con stock disponible.");
  }

  await publishStore(store.id);

  await prisma.storeOnboarding.upsert({
    where: { storeId: store.id },
    create: { storeId: store.id, hasPublished: true, currentStage: "creating_store" },
    update: { hasPublished: true },
  });

  await logSystemEvent({
    storeId: store.id,
    entityType: "store",
    entityId: store.id,
    eventType: "publish_triggered",
    source: "admin_panel",
    message: `Tienda ${store.name} publicada exitosamente`
  });

  revalidatePath("/admin/store");
  revalidatePath("/admin/dashboard");
  revalidateStorefrontShell(store.slug);
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
  revalidatePath("/admin/store-ai");
  revalidateStorefrontShell(store.slug);
  return { success: true, slug: store.slug, storeId: store.id };
}
