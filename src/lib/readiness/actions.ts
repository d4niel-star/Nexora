"use server";

// ─── Readiness action — tenant-scoped wrapper for the dashboard ─────────

import { getCurrentStore } from "@/lib/auth/session";
import { getStoreReadiness, type StoreReadiness } from "./store-readiness";

export async function fetchStoreReadiness(): Promise<StoreReadiness | null> {
  const store = await getCurrentStore();
  if (!store) return null;
  return getStoreReadiness(store.id);
}
