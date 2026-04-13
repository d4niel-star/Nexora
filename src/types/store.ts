export type StoreStatus = "published" | "draft" | "hidden" | "active" | "inactive" | "verified" | "pending" | "error" | "connected" | "disconnected";

export type ThemeStyle = "minimal" | "bold" | "classic";

export interface StoreTheme {
  id: string;
  name: string;
  style: ThemeStyle;
  description: string;
  status: StoreStatus;
  version: string;
  lastModified: string;
  previewColors: string[];
}

export interface StoreBranding {
  storeName: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  buttonStyle: "rounded" | "square" | "pill";
}

export interface HomeSection {
  id: string;
  type: "hero" | "featured-products" | "categories" | "benefits" | "testimonials" | "faq" | "newsletter";
  label: string;
  status: StoreStatus;
  order: number;
  description: string;
}

export interface NavItem {
  id: string;
  label: string;
  destination: string;
  group: "main" | "footer" | "quick-links";
  status: StoreStatus;
  order: number;
}

export interface StorePage {
  id: string;
  name: string;
  slug: string;
  status: StoreStatus;
  lastModified: string;
  type: "system" | "custom";
}

export interface StoreDomain {
  subdomain: string;
  customDomain: string;
  ssl: StoreStatus;
  connection: StoreStatus;
  lastVerified: string;
}

export interface StorePreview {
  publishedAt: string;
  status: StoreStatus;
  desktopUrl: string;
  mobileUrl: string;
}

export interface StoreSummary {
  themeName: string;
  themeStatus: StoreStatus;
  hasLogo: boolean;
  primaryColor: string;
  secondaryColor: string;
  domain: string;
  publishStatus: StoreStatus;
  pagesCount: number;
  navItemsCount: number;
  homeSectionsCount: number;
}
