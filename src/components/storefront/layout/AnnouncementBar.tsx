"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Megaphone, Tag, Truck, Gift, Sparkles } from "lucide-react";

// ─── Announcement Bar ───────────────────────────────────────────────────
// Real configurable announcement bar persisted in StoreBranding.
// Features: dismiss with localStorage, visibility rules, icon support.

export interface AnnouncementConfig {
  message: string;
  link?: string;
  bgColor: string;
  textColor: string;
  dismissible: boolean;
  icon?: "megaphone" | "tag" | "truck" | "gift" | "sparkles";
  visibility: "always" | "homepage" | "collection";
}

const ICON_MAP = {
  megaphone: Megaphone,
  tag: Tag,
  truck: Truck,
  gift: Gift,
  sparkles: Sparkles,
} as const;

function getDismissKey(storeSlug: string, message: string): string {
  return `nx_announce_dismiss_${storeSlug}_${message.slice(0, 20).replace(/\s/g, "_")}`;
}

export function AnnouncementBar({
  config,
  storeSlug,
  currentPath,
}: {
  config: AnnouncementConfig | null;
  storeSlug: string;
  currentPath: string;
}) {
  const [dismissed, setDismissed] = useState(true); // Start hidden, reveal after check

  useEffect(() => {
    if (!config) return;
    const key = getDismissKey(storeSlug, config.message);
    const wasDismissed = localStorage.getItem(key) === "1";
    setDismissed(wasDismissed);
  }, [config, storeSlug]);

  if (!config || !config.message) return null;

  // Visibility rules
  const isHomepage = currentPath === `/store/${storeSlug}` || currentPath === `/store/${storeSlug}/`;
  const isCollection = currentPath.includes("/collections") || currentPath.includes("/products");

  if (config.visibility === "homepage" && !isHomepage) return null;
  if (config.visibility === "collection" && !isCollection) return null;

  if (dismissed) return null;

  const handleDismiss = () => {
    const key = getDismissKey(storeSlug, config.message);
    localStorage.setItem(key, "1");
    setDismissed(true);
  };

  const IconComponent = config.icon ? ICON_MAP[config.icon] : null;

  const content = (
    <span className="flex items-center gap-2">
      {IconComponent && <IconComponent className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />}
      <span className="text-[12px] font-medium sm:text-[13px]">{config.message}</span>
    </span>
  );

  return (
    <div
      className="relative flex items-center justify-center px-10 py-2.5 transition-all duration-300"
      style={{ backgroundColor: config.bgColor, color: config.textColor }}
    >
      {config.link ? (
        <Link
          href={config.link}
          className="underline-offset-2 hover:underline"
        >
          {content}
        </Link>
      ) : (
        content
      )}

      {config.dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Cerrar anuncio"
          className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-full opacity-70 transition-opacity hover:opacity-100"
          style={{ color: config.textColor }}
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
