import type {
  Customer,
  CustomerChannel,
  CustomerLifecycleStatus,
  CustomerNote,
  CustomerOrderSummary,
  CustomerSegment,
} from "@/types/customer";

const now = Date.now();
const HOUR = 1000 * 60 * 60;
const DAY = HOUR * 24;

const hoursAgo = (hours: number) => new Date(now - hours * HOUR).toISOString();
const daysAgo = (days: number) => new Date(now - days * DAY).toISOString();

const makeNote = (
  id: string,
  body: string,
  createdAt: string,
  author: string
): CustomerNote => ({
  id,
  body,
  createdAt,
  author,
});

const makeOrder = (
  id: string,
  number: string,
  date: string,
  total: number,
  status: CustomerOrderSummary["status"],
  channel: CustomerChannel,
  itemsCount: number
): CustomerOrderSummary => ({
  id,
  number,
  date,
  total,
  status,
  channel,
  itemsCount,
});

const createCustomer = ({
  id,
  name,
  email,
  phone,
  channel,
  segment,
  lifecycleStatus,
  orderHistory,
  notes = [],
  tags = [],
  isHighValue = false,
  pendingFollowUp = false,
}: {
  id: string;
  name: string;
  email: string;
  phone?: string;
  channel: CustomerChannel;
  segment: CustomerSegment;
  lifecycleStatus: CustomerLifecycleStatus;
  orderHistory: CustomerOrderSummary[];
  notes?: CustomerNote[];
  tags?: string[];
  isHighValue?: boolean;
  pendingFollowUp?: boolean;
}): Customer => {
  const orderedHistory = [...orderHistory].sort(
    (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()
  );
  const totalSpent = orderedHistory.reduce((sum, order) => sum + order.total, 0);
  const averageTicket =
    orderedHistory.length > 0 ? Math.round(totalSpent / orderedHistory.length) : 0;

  return {
    id,
    name,
    email,
    phone,
    channel,
    segment,
    lifecycleStatus,
    totalSpent,
    averageTicket,
    ordersCount: orderedHistory.length,
    firstPurchaseAt: orderedHistory[orderedHistory.length - 1]?.date ?? daysAgo(120),
    lastPurchaseAt: orderedHistory[0]?.date ?? daysAgo(1),
    isHighValue,
    pendingFollowUp,
    tags,
    notes,
    orderHistory: orderedHistory,
  };
};

export const MOCK_CUSTOMERS: Customer[] = [
  createCustomer({
    id: "cus_front_001",
    name: "Lucia Ferrero",
    email: "lucia.ferrero@studioaurora.com",
    phone: "+54 11 5634 2208",
    channel: "Shopify",
    segment: "new",
    lifecycleStatus: "active",
    tags: ["Onboarding", "Primera compra"],
    notes: [
      makeNote(
        "note_001",
        "Pidio confirmacion manual del primer envio y recibio respuesta en el chat.",
        hoursAgo(9),
        "Operations"
      ),
    ],
    orderHistory: [
      makeOrder("ord_c_001", "#10481", hoursAgo(18), 189000, "processing", "Shopify", 2),
    ],
  }),
  createCustomer({
    id: "cus_front_002",
    name: "Tomas Villar",
    email: "t.villar.ml@correo-demo.com",
    channel: "Mercado Libre",
    segment: "recurring",
    lifecycleStatus: "active",
    tags: ["Entrega rapida"],
    orderHistory: [
      makeOrder("ord_c_002", "#10477", daysAgo(3), 82500, "shipped", "Mercado Libre", 1),
      makeOrder("ord_c_003", "#10411", daysAgo(19), 64000, "delivered", "Mercado Libre", 1),
      makeOrder("ord_c_004", "#10382", daysAgo(36), 91500, "delivered", "Mercado Libre", 2),
      makeOrder("ord_c_005", "#10314", daysAgo(67), 76000, "delivered", "Mercado Libre", 1),
    ],
  }),
  createCustomer({
    id: "cus_front_003",
    name: "Paula Sosa",
    email: "paula.sosa@atelier-norte.com",
    phone: "+54 9 351 441 1120",
    channel: "Shopify",
    segment: "vip",
    lifecycleStatus: "active",
    isHighValue: true,
    pendingFollowUp: true,
    tags: ["Embajadora", "Seguimiento", "Alto valor"],
    notes: [
      makeNote(
        "note_002",
        "Acepto recibir preventa exclusiva antes del lanzamiento de invierno.",
        daysAgo(4),
        "CX Lead"
      ),
      makeNote(
        "note_003",
        "Cliente con devoluciones cero en los ultimos 8 pedidos.",
        daysAgo(16),
        "Revenue Ops"
      ),
    ],
    orderHistory: [
      makeOrder("ord_c_006", "#10473", daysAgo(5), 214000, "delivered", "Shopify", 3),
      makeOrder("ord_c_007", "#10428", daysAgo(14), 178000, "delivered", "Shopify", 2),
      makeOrder("ord_c_008", "#10394", daysAgo(29), 249000, "delivered", "Shopify", 3),
      makeOrder("ord_c_009", "#10360", daysAgo(41), 199000, "delivered", "Shopify", 2),
      makeOrder("ord_c_010", "#10309", daysAgo(72), 318000, "delivered", "Shopify", 4),
      makeOrder("ord_c_011", "#10288", daysAgo(96), 246000, "delivered", "Shopify", 3),
    ],
  }),
  createCustomer({
    id: "cus_front_004",
    name: "Estudio Lumen SRL",
    email: "compras.internacionales.lumen@empresa-demo-nexora.com",
    phone: "+54 11 4312 8080",
    channel: "Tienda Nube",
    segment: "vip",
    lifecycleStatus: "active",
    isHighValue: true,
    tags: ["Mayorista", "Cuenta clave", "Alto valor"],
    notes: [
      makeNote(
        "note_004",
        "Necesita factura B consolidada y ventana de entrega PM.",
        daysAgo(8),
        "Finance"
      ),
    ],
    orderHistory: [
      makeOrder("ord_c_012", "#10468", daysAgo(7), 412000, "shipped", "Tienda Nube", 6),
      makeOrder("ord_c_013", "#10422", daysAgo(16), 368000, "delivered", "Tienda Nube", 5),
      makeOrder("ord_c_014", "#10376", daysAgo(37), 441000, "delivered", "Tienda Nube", 7),
      makeOrder("ord_c_015", "#10340", daysAgo(58), 395000, "delivered", "Tienda Nube", 6),
    ],
  }),
  createCustomer({
    id: "cus_front_005",
    name: "Florencia Arce",
    email: "flor.arce@socialmail.com",
    channel: "Instagram",
    segment: "recurring",
    lifecycleStatus: "risk",
    pendingFollowUp: true,
    tags: ["Reactivar", "Seguimiento"],
    notes: [
      makeNote(
        "note_005",
        "Respondio interes por bundles pero no cerro desde hace 42 dias.",
        daysAgo(2),
        "Retention"
      ),
    ],
    orderHistory: [
      makeOrder("ord_c_016", "#10402", daysAgo(25), 96000, "delivered", "Instagram", 1),
      makeOrder("ord_c_017", "#10348", daysAgo(53), 88000, "delivered", "Instagram", 1),
      makeOrder("ord_c_018", "#10297", daysAgo(87), 110000, "delivered", "Instagram", 2),
    ],
  }),
  createCustomer({
    id: "cus_front_006",
    name: "Agustin Correa",
    email: "agus.correa@correoarg-demo.com",
    phone: "+54 261 555 8801",
    channel: "Manual",
    segment: "recurring",
    lifecycleStatus: "inactive",
    tags: ["Dormido"],
    notes: [
      makeNote(
        "note_006",
        "Cuenta pausada por cambio de presupuesto. Revisar en proximo trimestre.",
        daysAgo(12),
        "Sales"
      ),
    ],
    orderHistory: [
      makeOrder("ord_c_019", "#10322", daysAgo(79), 54000, "delivered", "Manual", 1),
      makeOrder("ord_c_020", "#10261", daysAgo(123), 67000, "delivered", "Manual", 1),
    ],
  }),
  createCustomer({
    id: "cus_front_007",
    name: "Camila Benitez",
    email: "camibenitez.longmail+argentina@marketmail.com",
    channel: "Mercado Libre",
    segment: "new",
    lifecycleStatus: "active",
    tags: ["ML Prime"],
    orderHistory: [
      makeOrder("ord_c_021", "#10483", hoursAgo(6), 54000, "new", "Mercado Libre", 1),
    ],
  }),
  createCustomer({
    id: "cus_front_008",
    name: "Mateo Rivas",
    email: "mateo.rivas@tiendanube-demo.com",
    phone: "+54 341 620 7741",
    channel: "Tienda Nube",
    segment: "recurring",
    lifecycleStatus: "active",
    isHighValue: true,
    tags: ["Bundle lover", "Alto valor"],
    orderHistory: [
      makeOrder("ord_c_022", "#10454", daysAgo(10), 149000, "delivered", "Tienda Nube", 2),
      makeOrder("ord_c_023", "#10405", daysAgo(24), 132000, "delivered", "Tienda Nube", 2),
      makeOrder("ord_c_024", "#10370", daysAgo(39), 175000, "delivered", "Tienda Nube", 3),
      makeOrder("ord_c_025", "#10333", daysAgo(63), 118000, "delivered", "Tienda Nube", 2),
      makeOrder("ord_c_026", "#10290", daysAgo(92), 121000, "delivered", "Tienda Nube", 2),
    ],
  }),
];
