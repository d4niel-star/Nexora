import { Product, ImportableProduct } from "../../types/product";

export const MOCK_CATALOG: Product[] = [
  {
    id: "prod_1",
    image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&q=80&w=200",
    title: "Auriculares Inalámbricos Pro-H",
    description: "Auriculares premium con cancelación de ruido activa y batería de 40 horas. Diseño ergonómico.",
    category: "Tecnología",
    status: "active",
    supplier: "Nexora Global",
    price: 125000,
    cost: 45000,
    margin: 1.77, // 177% markup
    totalStock: 340,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    tags: ["tech", "premium", "audio"],
    variants: [
      { id: "v_1", sku: "NEX-TECH-001-BLK", title: "Negro Mate", price: 125000, cost: 45000, stock: 200 },
      { id: "v_2", sku: "NEX-TECH-001-WHT", title: "Blanco Perla", price: 125000, cost: 45000, stock: 140 }
    ]
  },
  {
    id: "prod_2",
    image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&q=80&w=200",
    title: "Termo de Acero Inoxidable 1L",
    description: "Termo irrompible con doble capa de vacío, conserva la temperatura por 24hs.",
    category: "Hogar",
    status: "active",
    supplier: "Own",
    price: 45000,
    cost: 20000,
    margin: 1.25, // 125% markup
    totalStock: 0,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    variants: [
      { id: "v_3", sku: "NEX-HOME-044-GRN", title: "Verde Militar", price: 45000, cost: 20000, stock: 0 }
    ]
  },
  {
    id: "prod_3",
    image: "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b0?auto=format&fit=crop&q=80&w=200",
    title: "Mochila Urbana Impermeable",
    category: "Accesorios",
    status: "draft",
    supplier: "Local Partner",
    price: 89000,
    cost: 35000,
    margin: 1.54,
    totalStock: 50,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    variants: [
      { id: "v_4", sku: "NEX-LIFE-02-BLK", title: "Negro", price: 89000, cost: 35000, stock: 50 }
    ]
  },
  {
    id: "prod_4",
    image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&q=80&w=200",
    title: "Smartwatch Deportivo V3",
    category: "Tecnología",
    status: "archived",
    supplier: "Nexora Global",
    price: 105000,
    cost: 50000,
    margin: 1.1,
    totalStock: 12,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
    variants: [
      { id: "v_5", sku: "NEX-TECH-012-SLV", title: "Silver", price: 105000, cost: 50000, stock: 12 }
    ]
  }
];

export const MOCK_IMPORTABLES: ImportableProduct[] = [
  {
    id: "imp_1",
    images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600"],
    originalTitle: "VibraTech Ultra Soundbar Home Theater - Bass Boost 2026",
    category: "Electrónica",
    supplier: "Nexora Global",
    suggestedPrice: 280000,
    baseCost: 95000,
    estimatedMargin: 1.94, // 194% markup
    deliveryTimeDays: "2-4 días",
    rating: 4.8,
    totalSales: 1250,
    stockAvailable: 5000,
    features: ["Sonido 5.1", "Bluetooth 5.3", "Subwoofer Inalámbrico"]
  },
  {
    id: "imp_2",
    images: ["https://images.unsplash.com/photo-1578317496515-db147fe54129?auto=format&fit=crop&q=80&w=600"],
    originalTitle: "Silla Gamer Ergonómica Pro Serie X con Soporte Lumbar",
    category: "Muebles",
    supplier: "Local Partner",
    suggestedPrice: 350000,
    baseCost: 150000,
    estimatedMargin: 1.33,
    deliveryTimeDays: "5-7 días",
    rating: 4.5,
    totalSales: 840,
    stockAvailable: 120,
    features: ["Reclinable 180º", "Cuero Sintético", "Base Metálica"]
  },
  {
    id: "imp_3",
    images: ["https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&q=80&w=600"],
    originalTitle: "Set de Luces LED RGB Inteligentes 10m WiFi Alexa",
    category: "Hogar Inteligente",
    supplier: "Nexora Global",
    suggestedPrice: 45000,
    baseCost: 12000,
    estimatedMargin: 2.75,
    deliveryTimeDays: "3-5 días",
    rating: 4.9,
    totalSales: 4300,
    stockAvailable: 15000,
    features: ["App Android/iOS", "Control por Voz", "16 Millones de Colores"]
  }
];
