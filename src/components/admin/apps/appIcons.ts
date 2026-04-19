import type { LucideIcon } from "lucide-react";
import {
  BadgePercent,
  BarChart3,
  Boxes,
  Globe2,
  Mail,
  MessageCircle,
  Package,
  Palette,
  PenLine,
  ReceiptText,
  Rocket,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Target,
  Truck,
  Wallet,
} from "lucide-react";

// Client-side icon registry. Referenced by `iconName` in
// `src/lib/apps/registry.ts` so Lucide function components never cross the
// server → client serialization boundary.
export const APP_ICONS: Record<string, LucideIcon> = {
  BadgePercent,
  BarChart3,
  Boxes,
  Globe2,
  Mail,
  MessageCircle,
  Package,
  Palette,
  PenLine,
  ReceiptText,
  Rocket,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Target,
  Truck,
  Wallet,
};

export function getAppIcon(name: string | undefined): LucideIcon {
  return (name && APP_ICONS[name]) || Package;
}
