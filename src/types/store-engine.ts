// ─── Block Types ───

export type BlockType =
  | "hero"
  | "featured_categories"
  | "featured_products"
  | "benefits"
  | "testimonials"
  | "faq"
  | "newsletter";

export type PageType = "home" | "product" | "collection" | "custom";
export type BlockSource = "manual" | "ai" | "theme";
export type BlockState = "draft" | "published";
export type StoreStatus = "active" | "draft" | "inactive";

// ─── Block Settings Schemas ───

export interface HeroBlockSettings {
  headline: string;
  subheadline?: string;
  primaryActionLabel?: string;
  primaryActionLink?: string;
  secondaryActionLabel?: string;
  backgroundImageUrl?: string;
}

export interface BenefitsBlockSettings {
  title: string;
  benefits: Array<{
    title: string;
    description: string;
    icon: string;
  }>;
}

export interface FeaturedProductsBlockSettings {
  title: string;
  subtitle?: string;
  productHandles: string[];
}

export interface FeaturedCategoriesBlockSettings {
  title: string;
  collectionHandles: string[];
}

export interface TestimonialsBlockSettings {
  title: string;
  testimonials: Array<{
    name: string;
    text: string;
    rating: number;
    avatar?: string;
  }>;
}

export interface FaqBlockSettings {
  title: string;
  questions: Array<{
    question: string;
    answer: string;
  }>;
}

export interface NewsletterBlockSettings {
  title: string;
  description?: string;
  buttonLabel?: string;
}

export type BlockSettings =
  | HeroBlockSettings
  | BenefitsBlockSettings
  | FeaturedProductsBlockSettings
  | FeaturedCategoriesBlockSettings
  | TestimonialsBlockSettings
  | FaqBlockSettings
  | NewsletterBlockSettings;

// ─── Storefront Data ───

export interface StorefrontData {
  store: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    logo: string | null;
    customDomain: string | null;
    active: boolean;
    status: string;
    locale: string;
    currency: string;
  };
  branding: {
    logoUrl: string | null;
    faviconUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    tone: string;
    buttonStyle: string;
  };
  theme: {
    activeTheme: string;
    themeVariant: string;
    isPublished: boolean;
  };
  headerNavigation: Array<{
    id: string;
    label: string;
    href: string;
    sortOrder: number;
  }>;
  footerNavigation: Array<{
    group: string;
    items: Array<{
      id: string;
      label: string;
      href: string;
      sortOrder: number;
    }>;
  }>;
  homeBlocks: Array<{
    id: string;
    blockType: BlockType;
    sortOrder: number;
    settings: Record<string, unknown>;
    source: string;
  }>;
}

// ─── AI Store Builder Input ───

export interface AIStoreInput {
  brandName: string;
  industry: string;
  targetAudience: string;
  country: string;
  currency: string;
  brandTone: string;
  styleCategory: "minimal_premium" | "high_conversion" | "editorial";
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  suggestedHeroText: string;
  suggestedHomepageBlocks: BlockType[];
}

// ─── Admin Store Initial Data (serializable, passed from server → client) ───

export interface AdminStoreInitialData {
  store: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    logo: string | null;
    status: string;
    active: boolean;
    subdomain: string | null;
    primaryDomain: string | null;
  };
  publicUrl: string;
  counts: {
    products: number;
    publishedProducts: number;
    sellableProducts: number;
  };
  paymentProvider: {
    provider: string;
    status: string;
    publicKey: string | null;
    externalAccountId: string | null;
    accountEmail: string | null;
    connectedAt: string | null;
    lastValidatedAt: string | null;
  } | null;
  branding: {
    logoUrl: string | null;
    faviconUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    tone: string;
    buttonStyle: string;
  } | null;
  theme: {
    activeTheme: string;
    themeVariant: string;
    isPublished: boolean;
  } | null;
  navigation: Array<{
    id: string;
    group: string;
    label: string;
    href: string;
    sortOrder: number;
    isVisible: boolean;
  }>;
  homeBlocks: Array<{
    id: string;
    blockType: string;
    sortOrder: number;
    isVisible: boolean;
    settings: Record<string, unknown>;
    source: string;
    state: string;
  }>;
  pages: Array<{
    id: string;
    type: string;
    title: string;
    slug: string;
    status: string;
    updatedAt: string;
  }>;
  domains: Array<{
    id: string;
    hostname: string;
    type: string;
    status: string;
    isPrimary: boolean;
    createdAt: string;
  }>;
  summary: AdminStoreSummary;
}

// ─── Admin Store Summary ───

export interface AdminStoreSummary {
  store: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    logo: string | null;
    status: string;
    active: boolean;
    subdomain: string | null;
    primaryDomain: string | null;
  };
  branding: {
    logoUrl: string | null;
    faviconUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    buttonStyle: string;
  } | null;
  theme: {
    activeTheme: string;
    themeVariant: string;
    isPublished: boolean;
  } | null;
  navigationCount: number;
  pagesCount: number;
  homeBlocksCount: number;
  lastPublishedAt: string | null;
  hasUnpublishedChanges: boolean;
}
