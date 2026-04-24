export interface StoreConfig {
  slug: string;
  name: string;
  logoUrl?: string;
  description: string;
  currency: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  tone: string;
  buttonStyle: string;
  headerNavigation: NavItem[];
  footerNavigation: FooterNavGroup[];
  cartItemCount: number;
  /** Communication settings surfaced from Comunicación admin */
  contactInfo?: {
    email: string | null;
    phone: string | null;
    address: string | null;
    schedule: string | null;
  } | null;
  socialLinks?: Array<{
    platform: "instagram" | "facebook" | "whatsapp";
    label: string;
    url: string;
  }>;
  whatsapp?: {
    number: string;
    buttonEnabled: boolean;
    buttonText: string;
    buttonPosition: "bottom-right" | "bottom-left";
  } | null;
}

export interface NavItem {
  label: string;
  href: string;
}

export interface FooterNavGroup {
  title: string;
  items: NavItem[];
}

export interface StorefrontProduct {
  id: string;
  handle: string;
  title: string;
  description: string;
  category?: string | null;
  price: number;
  compareAtPrice?: number;
  featuredImage: string;
  images: string[];
  variants: ProductVariant[];
  brand: string;
  badges: string[];
  rating: number;
  reviewCount: number;
  inStock: boolean;
  features: string[];
}

export interface ProductVariant {
  id: string;
  name: string;
  values: string[];
  inStock: boolean;
  availableStock: number;
  allowBackorder: boolean;
}

export interface StorefrontCollection {
  id: string;
  handle: string;
  title: string;
  description: string;
  imageUrl: string;
  productCount: number;
}

export type SectionType = 
  | "hero" 
  | "featured_categories" 
  | "featured_products" 
  | "benefits" 
  | "testimonials" 
  | "faq" 
  | "newsletter";

export interface StoreBlock {
  id: string;
  type: SectionType;
  settings: Record<string, any>;
}

export interface CartItem {
  id: string;
  product: StorefrontProduct;
  variantId?: string;
  quantity: number;
}
