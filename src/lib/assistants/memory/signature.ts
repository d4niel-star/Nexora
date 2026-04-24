// ─── Deterministic content fingerprint for store ↔ memory reconciliation ─
// When it changes, persisted editor memory is treated as "stale" for
// high-risk follow-ups (we do not restore undo — only avoid blind replay).

import type { AdminStoreInitialData } from "@/types/store-engine";

const SEP = "¦";

export function computeStoreContentSignature(data: AdminStoreInitialData | null | undefined): string {
  if (!data?.branding) return "0|no-branding";
  const b = data.branding;
  const sorted = [...data.homeBlocks].sort((a, c) => a.sortOrder - c.sortOrder);
  const orderSig = sorted.map((bl) => `${bl.blockType}:${bl.isVisible ? 1 : 0}`).join(SEP);
  return [
    2, // signature schema version
    b.primaryColor,
    b.secondaryColor,
    b.fontFamily,
    b.tone,
    b.buttonStyle,
    sorted.length,
    orderSig.slice(0, 800),
  ].join(SEP);
}
