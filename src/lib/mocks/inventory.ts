import { InventoryItem } from "../../types/inventory";

export const MOCK_INVENTORY: InventoryItem[] = [
  {
    id: "inv_1",
    productId: "prod_1",
    sku: "NEX-TECH-001-BLK",
    title: "Auriculares Inalámbricos Pro-H",
    variantTitle: "Negro Mate",
    image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&q=80&w=200",
    category: "Tecnología",
    supplier: "Nexora Global",
    available: 185,
    reserved: 15,
    total: 200,
    reorderPoint: 50,
    stockStatus: "in_stock",
    syncStatus: "synced",
    lastSyncedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    movements: [
      { id: "mov_1", type: "sale", quantity: -2, date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), reference: "ORD-#10245" },
      { id: "mov_2", type: "reservation", quantity: -15, date: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), reference: "Carrritos Activos" },
      { id: "mov_3", type: "restock", quantity: 100, date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), reference: "PO-4458", user: "Admin" }
    ]
  },
  {
    id: "inv_2",
    productId: "prod_1",
    sku: "NEX-TECH-001-WHT",
    title: "Auriculares Inalámbricos Pro-H",
    variantTitle: "Blanco Perla",
    image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&q=80&w=200",
    category: "Tecnología",
    supplier: "Nexora Global",
    available: 12,
    reserved: 4,
    total: 16,
    reorderPoint: 20,
    stockStatus: "low_stock",
    syncStatus: "synced",
    lastSyncedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    movements: [
      { id: "mov_4", type: "sale", quantity: -1, date: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(), reference: "ORD-#10246" },
      { id: "mov_5", type: "return", quantity: 1, date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), reference: "RMA-#992" }
    ]
  },
  {
    id: "inv_3",
    productId: "prod_2",
    sku: "NEX-HOME-044-GRN",
    title: "Termo de Acero Inoxidable 1L",
    variantTitle: "Verde Militar",
    image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&q=80&w=200",
    category: "Hogar",
    supplier: "Own",
    available: 0,
    reserved: 0,
    total: 0,
    reorderPoint: 100,
    stockStatus: "out_of_stock",
    syncStatus: "unlinked",
    lastSyncedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    movements: [
      { id: "mov_6", type: "sale", quantity: -5, date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), reference: "Mercado Libre Batch" },
      { id: "mov_7", type: "adjustment", quantity: -2, date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), reference: "Merma por daño sideral", user: "Depósito 1" }
    ]
  },
  {
    id: "inv_4",
    productId: "prod_3",
    sku: "NEX-LIFE-02-BLK",
    title: "Mochila Urbana Impermeable",
    variantTitle: "Única",
    image: "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b0?auto=format&fit=crop&q=80&w=200",
    category: "Accesorios",
    supplier: "Local Partner",
    available: 48,
    reserved: 2,
    total: 50,
    reorderPoint: 10,
    stockStatus: "in_stock",
    syncStatus: "syncing",
    lastSyncedAt: new Date(Date.now() - 1000 * 30).toISOString(),
    movements: [
      { id: "mov_8", type: "restock", quantity: 50, date: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), reference: "Ingreso Manual Partner" }
    ]
  },
  {
    id: "inv_5",
    productId: "prod_4",
    sku: "NEX-TECH-012-SLV",
    title: "Smartwatch Deportivo V3",
    variantTitle: "Silver",
    image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&q=80&w=200",
    category: "Tecnología",
    supplier: "Nexora Global",
    available: 12,
    reserved: 0,
    total: 12,
    reorderPoint: 15,
    stockStatus: "low_stock",
    syncStatus: "error",
    lastSyncedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    movements: [
      { id: "mov_9", type: "sale", quantity: -3, date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(), reference: "Shopify" }
    ]
  }
];
