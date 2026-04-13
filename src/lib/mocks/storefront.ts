import { StoreConfig, StoreBlock } from "../../types/storefront";

export const MOCK_STORE_CONFIG: StoreConfig = {
  slug: "aura-essentials",
  name: "Aura Essentials",
  description: "Cuidado personal de primera calidad",
  currency: "ARS",
  primaryColor: "#111111",
  secondaryColor: "#FAFAFA",
  headerNavigation: [
    { label: "Inicio", href: "/aura-essentials" },
    { label: "Productos", href: "/aura-essentials/products" }
  ],
  footerNavigation: [],
  cartItemCount: 0
};

export const MOCK_STOREFRONT_BLOCKS: StoreBlock[] = [];
