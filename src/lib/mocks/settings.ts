import type {
  AccountInfo,
  TeamUser,
  PaymentMethod,
  ShippingMethod,
  TaxRule,
  NotificationEvent,
  BillingInfo,
  SecurityInfo,
  Preferences,
  SettingsSummary,
} from "@/types/settings";

const now = Date.now();
const HOUR = 1000 * 60 * 60;
const DAY = HOUR * 24;
const hoursAgo = (h: number) => new Date(now - h * HOUR).toISOString();
const daysAgo = (d: number) => new Date(now - d * DAY).toISOString();

// ─── Account ───

export const MOCK_ACCOUNT: AccountInfo = {
  businessName: "TechStore Argentina",
  email: "admin@techstore.com.ar",
  phone: "+54 11 5500-1234",
  country: "Argentina",
  currency: "ARS",
  language: "Español",
  timezone: "America/Argentina/Buenos_Aires",
  status: "active",
  accountId: "acc_ts_2024_0983",
};

// ─── Users ───

export const MOCK_USERS: TeamUser[] = [
  { id: "usr_01", name: "Martin Gonzalez", email: "martin@techstore.com.ar", role: "owner", status: "active", lastAccess: hoursAgo(1), avatar: "MG" },
  { id: "usr_02", name: "Lucia Fernandez", email: "lucia@techstore.com.ar", role: "admin", status: "active", lastAccess: hoursAgo(3), avatar: "LF" },
  { id: "usr_03", name: "Carlos Ramirez", email: "carlos@techstore.com.ar", role: "operations", status: "active", lastAccess: daysAgo(1), avatar: "CR" },
  { id: "usr_04", name: "Ana Torres", email: "ana@techstore.com.ar", role: "marketing", status: "active", lastAccess: daysAgo(2), avatar: "AT" },
  { id: "usr_05", name: "Diego Lopez", email: "diego@techstore.com.ar", role: "support", status: "inactive", lastAccess: daysAgo(14), avatar: "DL" },
  { id: "usr_06", name: "Sofia Martinez", email: "sofia@techstore.com.ar", role: "operations", status: "pending", lastAccess: "", avatar: "SM" },
];

// ─── Payments ───

export const MOCK_PAYMENTS: PaymentMethod[] = [
  { id: "pay_01", name: "Mercado Pago", provider: "mercadopago", status: "verified", account: "techstore@mp.com", currency: "ARS", lastVerified: hoursAgo(6) },
  { id: "pay_02", name: "Stripe", provider: "stripe", status: "verified", account: "acct_1N...x8F", currency: "USD", lastVerified: daysAgo(2) },
  { id: "pay_03", name: "Transferencia bancaria", provider: "bank_transfer", status: "configured", account: "CBU ...4521", currency: "ARS", lastVerified: daysAgo(7) },
  { id: "pay_04", name: "PayPal", provider: "paypal", status: "pending", account: "", currency: "USD", lastVerified: "" },
];

// ─── Shipping ───

export const MOCK_SHIPPING: ShippingMethod[] = [
  { id: "shp_01", name: "Envio estandar", carrier: "Correo Argentino", baseCost: 2500, estimatedDays: "5-7 dias", zones: ["CABA", "GBA", "Interior"], status: "active" },
  { id: "shp_02", name: "Envio express", carrier: "Andreani", baseCost: 4800, estimatedDays: "1-3 dias", zones: ["CABA", "GBA"], status: "active" },
  { id: "shp_03", name: "Retiro en sucursal", carrier: "Propio", baseCost: 0, estimatedDays: "Inmediato", zones: ["CABA"], status: "active" },
  { id: "shp_04", name: "Envio internacional", carrier: "DHL", baseCost: 15000, estimatedDays: "10-15 dias", zones: ["Latam", "USA", "Europa"], status: "inactive" },
];

// ─── Taxes ───

export const MOCK_TAXES: TaxRule[] = [
  { id: "tax_01", name: "IVA general", rate: 21, country: "Argentina", region: "Nacional", status: "active", lastUpdated: daysAgo(30) },
  { id: "tax_02", name: "IVA reducido", rate: 10.5, country: "Argentina", region: "Nacional", status: "active", lastUpdated: daysAgo(30) },
  { id: "tax_03", name: "Ingresos Brutos CABA", rate: 3.5, country: "Argentina", region: "CABA", status: "active", lastUpdated: daysAgo(15) },
  { id: "tax_04", name: "Percepcion IIBB PBA", rate: 2.5, country: "Argentina", region: "Buenos Aires", status: "pending", lastUpdated: daysAgo(5) },
];

// ─── Notifications ───

export const MOCK_NOTIFICATIONS: NotificationEvent[] = [
  { id: "not_01", event: "Nuevo pedido", description: "Recibir notificacion al recibir un pedido nuevo.", email: true, push: true, dashboard: true, frequency: "instant", status: "active" },
  { id: "not_02", event: "Pago fallido", description: "Alerta cuando un pago no se procesa correctamente.", email: true, push: true, dashboard: true, frequency: "instant", status: "active" },
  { id: "not_03", event: "Stock bajo", description: "Aviso cuando un producto llega al minimo de stock.", email: true, push: false, dashboard: true, frequency: "daily", status: "active" },
  { id: "not_04", event: "Reembolso", description: "Notificacion al procesar un reembolso.", email: true, push: false, dashboard: true, frequency: "instant", status: "active" },
  { id: "not_05", event: "Error de integracion", description: "Alerta cuando una integracion falla.", email: true, push: true, dashboard: true, frequency: "instant", status: "attention" },
  { id: "not_06", event: "Exportacion lista", description: "Aviso cuando una exportacion se completa.", email: false, push: false, dashboard: true, frequency: "instant", status: "active" },
];

// ─── Billing ───

export const MOCK_BILLING: BillingInfo = {
  plan: "Pro",
  nextCharge: new Date(now + 18 * DAY).toISOString(),
  status: "active",
  paymentMethod: "Visa •••• 4242",
  invoices: [
    { id: "inv_01", date: daysAgo(2), amount: 24990, status: "verified", description: "Plan Pro — Abril 2026" },
    { id: "inv_02", date: daysAgo(32), amount: 24990, status: "verified", description: "Plan Pro — Marzo 2026" },
    { id: "inv_03", date: daysAgo(62), amount: 19990, status: "verified", description: "Plan Starter — Febrero 2026" },
    { id: "inv_04", date: daysAgo(92), amount: 19990, status: "verified", description: "Plan Starter — Enero 2026" },
  ],
};

// ─── Security ───

export const MOCK_SECURITY: SecurityInfo = {
  twoFactorEnabled: true,
  lastLogin: hoursAgo(1),
  passwordStrength: "strong",
  sessions: [
    { id: "ses_01", device: "Chrome · macOS", location: "Buenos Aires, AR", lastActive: hoursAgo(0.5), current: true },
    { id: "ses_02", device: "Safari · iPhone 15", location: "Buenos Aires, AR", lastActive: hoursAgo(4), current: false },
    { id: "ses_03", device: "Firefox · Windows", location: "Cordoba, AR", lastActive: daysAgo(3), current: false },
  ],
};

// ─── Preferences ───

export const MOCK_PREFERENCES: Preferences = {
  language: "Español",
  dateFormat: "DD/MM/YYYY",
  currencyFormat: "$ 1.234,56",
  density: "comfortable",
  emailDigest: true,
  darkMode: false,
};

// ─── Summary ───

export const MOCK_SETTINGS_SUMMARY: SettingsSummary = {
  plan: "Pro",
  status: "active",
  usersCount: 6,
  paymentsConfigured: 3,
  shippingConfigured: 3,
  securityScore: "secure",
  nextInvoice: new Date(now + 18 * DAY).toISOString(),
  nextInvoiceAmount: 24990,
  pendingAlerts: 2,
};
