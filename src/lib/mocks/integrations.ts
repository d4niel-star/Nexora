import type {
  Integration,
  IntegrationLog,
  IntegrationsSummary,
} from "@/types/integrations";

const now = Date.now();
const HOUR = 1000 * 60 * 60;
const DAY = HOUR * 24;
const MINUTE = 1000 * 60;

const minutesAgo = (m: number) => new Date(now - m * MINUTE).toISOString();
const hoursAgo = (h: number) => new Date(now - h * HOUR).toISOString();
const daysAgo = (d: number) => new Date(now - d * DAY).toISOString();

// ─── Channels ───

export const MOCK_CHANNELS: Integration[] = [
  { id: "int_ch_01", name: "Mercado Libre", category: "channel", status: "connected", health: "operational", description: "Marketplace principal — sincronizacion completa", account: "techstore_ar@ml.com", lastSync: minutesAgo(12), lastEvent: minutesAgo(12), productsSynced: 347, webhookStatus: "connected", recentIncidents: 0, eventsToday: 142 },
  { id: "int_ch_02", name: "Shopify", category: "channel", status: "connected", health: "degraded", description: "Canal Shopify con sync parcial", account: "techstore-ar.myshopify.com", lastSync: hoursAgo(2), lastEvent: hoursAgo(1), productsSynced: 289, webhookStatus: "connected", recentIncidents: 2, eventsToday: 67 },
  { id: "int_ch_03", name: "Tienda propia", category: "channel", status: "connected", health: "operational", description: "Storefront Nexora integrado", account: "techstore.nexora.ar", lastSync: minutesAgo(5), lastEvent: minutesAgo(5), productsSynced: 412, webhookStatus: "connected", recentIncidents: 0, eventsToday: 203 },
  { id: "int_ch_04", name: "WhatsApp Business", category: "channel", status: "connected", health: "operational", description: "Canal de ventas conversacional", account: "+54 11 2345-6789", lastSync: minutesAgo(30), lastEvent: minutesAgo(30), productsSynced: null, webhookStatus: "connected", recentIncidents: 0, eventsToday: 34 },
  { id: "int_ch_05", name: "Instagram Shopping", category: "channel", status: "pending", health: "degraded", description: "Catalogo Meta Commerce en revision", account: "@techstore_ar", lastSync: null, lastEvent: daysAgo(3), productsSynced: 0, webhookStatus: "pending", recentIncidents: 1, eventsToday: 0 },
];

// ─── Payments ───

export const MOCK_PAYMENTS: Integration[] = [
  { id: "int_pay_01", name: "Mercado Pago", category: "payment", status: "connected", health: "operational", description: "Procesador principal de pagos", account: "mp_techstore_prod", lastSync: minutesAgo(3), lastEvent: minutesAgo(3), productsSynced: null, webhookStatus: "connected", recentIncidents: 0, eventsToday: 89 },
  { id: "int_pay_02", name: "Stripe", category: "payment", status: "connected", health: "operational", description: "Pagos internacionales tarjeta", account: "acct_1NxTechStoreAR", lastSync: minutesAgo(8), lastEvent: minutesAgo(8), productsSynced: null, webhookStatus: "connected", recentIncidents: 0, eventsToday: 23 },
  { id: "int_pay_03", name: "PayPal", category: "payment", status: "disconnected", health: "critical", description: "Pendiente de reconexion OAuth", account: null, lastSync: daysAgo(15), lastEvent: daysAgo(15), productsSynced: null, webhookStatus: "disconnected", recentIncidents: 1, eventsToday: 0 },
];

// ─── Suppliers ───

export const MOCK_SUPPLIERS: Integration[] = [
  { id: "int_sup_01", name: "DropTech Global", category: "supplier", status: "connected", health: "operational", description: "Proveedor dropshipping electronica", account: "partner_dt_001", lastSync: hoursAgo(1), lastEvent: hoursAgo(1), productsSynced: 156, webhookStatus: "connected", recentIncidents: 0, eventsToday: 12 },
  { id: "int_sup_02", name: "Mayorista Central AR", category: "supplier", status: "connected", health: "degraded", description: "Distribuidor mayorista local", account: "mca_sync_prod", lastSync: hoursAgo(6), lastEvent: hoursAgo(4), productsSynced: 89, webhookStatus: "verifying", recentIncidents: 3, eventsToday: 5 },
  { id: "int_sup_03", name: "FashionPartner BA", category: "supplier", status: "syncing", health: "operational", description: "Partner local moda y accesorios", account: "fp_ba_live", lastSync: minutesAgo(45), lastEvent: minutesAgo(45), productsSynced: 67, webhookStatus: "connected", recentIncidents: 0, eventsToday: 8 },
  { id: "int_sup_04", name: "TechImport Co", category: "supplier", status: "paused", health: "degraded", description: "Importador electronics — pausado manualmente", account: "techimport_v2", lastSync: daysAgo(7), lastEvent: daysAgo(7), productsSynced: 34, webhookStatus: "paused", recentIncidents: 0, eventsToday: 0 },
];

// ─── Logistics ───

export const MOCK_LOGISTICS: Integration[] = [
  { id: "int_log_01", name: "Andreani", category: "logistics", status: "connected", health: "operational", description: "Envios nacionales express y standard", account: "andreani_ts_prod", lastSync: minutesAgo(15), lastEvent: minutesAgo(15), productsSynced: null, webhookStatus: "connected", recentIncidents: 0, eventsToday: 34 },
  { id: "int_log_02", name: "OCA", category: "logistics", status: "connected", health: "operational", description: "Red de sucursales y envios a domicilio", account: "oca_partner_001", lastSync: minutesAgo(22), lastEvent: minutesAgo(22), productsSynced: null, webhookStatus: "connected", recentIncidents: 0, eventsToday: 18 },
  { id: "int_log_03", name: "Correo Argentino", category: "logistics", status: "connected", health: "degraded", description: "Envios economicos nacionales", account: "ca_epaq_ts", lastSync: hoursAgo(3), lastEvent: hoursAgo(2), productsSynced: null, webhookStatus: "error", recentIncidents: 4, eventsToday: 7 },
  { id: "int_log_04", name: "Logistica propia", category: "logistics", status: "connected", health: "operational", description: "Flota propia CABA y GBA", account: null, lastSync: minutesAgo(40), lastEvent: minutesAgo(40), productsSynced: null, webhookStatus: null, recentIncidents: 0, eventsToday: 12 },
];

// ─── Tracking ───

export const MOCK_TRACKING: Integration[] = [
  { id: "int_trk_01", name: "Google Analytics 4", category: "tracking", status: "connected", health: "operational", description: "Tracking completo del storefront", account: "G-TECH12345", lastSync: minutesAgo(2), lastEvent: minutesAgo(2), productsSynced: null, webhookStatus: null, recentIncidents: 0, eventsToday: 1240 },
  { id: "int_trk_02", name: "Meta Pixel", category: "tracking", status: "connected", health: "operational", description: "Pixel para campañas Facebook/Instagram", account: "pixel_987654321", lastSync: minutesAgo(5), lastEvent: minutesAgo(5), productsSynced: null, webhookStatus: null, recentIncidents: 0, eventsToday: 890 },
  { id: "int_trk_03", name: "TikTok Pixel", category: "tracking", status: "error", health: "critical", description: "Error de autenticacion — re-verificar token", account: "tt_pixel_ts_ar", lastSync: daysAgo(2), lastEvent: daysAgo(2), productsSynced: null, webhookStatus: null, recentIncidents: 1, eventsToday: 0 },
  { id: "int_trk_04", name: "Eventos Storefront", category: "tracking", status: "connected", health: "operational", description: "Tracking interno de eventos del store", account: null, lastSync: minutesAgo(1), lastEvent: minutesAgo(1), productsSynced: null, webhookStatus: null, recentIncidents: 0, eventsToday: 2340 },
];

// ─── Logs ───

export const MOCK_LOGS: IntegrationLog[] = [
  { id: "log_01", integrationId: "int_ch_01", integrationName: "Mercado Libre", event: "Sync productos completada", severity: "info", status: "success", timestamp: minutesAgo(12), reference: "sync_ml_28491", details: "347 productos sincronizados correctamente." },
  { id: "log_02", integrationId: "int_pay_01", integrationName: "Mercado Pago", event: "Webhook recibido", severity: "info", status: "success", timestamp: minutesAgo(15), reference: "wh_mp_pay_9821", details: "Pago aprobado PO-2024-0891." },
  { id: "log_03", integrationId: "int_ch_02", integrationName: "Shopify", event: "Sync parcial con errores", severity: "warning", status: "failed", timestamp: hoursAgo(1), reference: "sync_shp_fail_01", details: "12 productos con SKU duplicado no pudieron sincronizarse." },
  { id: "log_04", integrationId: "int_trk_03", integrationName: "TikTok Pixel", event: "Error de autenticacion", severity: "error", status: "failed", timestamp: daysAgo(2), reference: "auth_tt_err_001", details: "Token expirado. Se requiere re-autenticacion manual." },
  { id: "log_05", integrationId: "int_log_03", integrationName: "Correo Argentino", event: "Webhook fallido", severity: "error", status: "failed", timestamp: hoursAgo(2), reference: "wh_ca_fail_004", details: "Timeout al enviar actualizacion de tracking." },
  { id: "log_06", integrationId: "int_sup_02", integrationName: "Mayorista Central AR", event: "Stock desactualizado", severity: "warning", status: "pending", timestamp: hoursAgo(4), reference: "stock_mca_warn", details: "3 productos con stock inconsistente entre proveedor y catalogo." },
  { id: "log_07", integrationId: "int_pay_02", integrationName: "Stripe", event: "Cobro procesado", severity: "info", status: "success", timestamp: minutesAgo(8), reference: "ch_3NxStripe001", details: "Cobro USD 89.99 procesado correctamente." },
  { id: "log_08", integrationId: "int_ch_03", integrationName: "Tienda propia", event: "Inventario actualizado", severity: "info", status: "success", timestamp: minutesAgo(5), reference: "inv_update_412", details: "412 productos con stock actualizado." },
  { id: "log_09", integrationId: "int_pay_03", integrationName: "PayPal", event: "Conexion perdida", severity: "critical", status: "failed", timestamp: daysAgo(15), reference: "conn_pp_lost", details: "OAuth token revocado. Reconexion manual requerida." },
  { id: "log_10", integrationId: "int_log_01", integrationName: "Andreani", event: "Etiquetas generadas", severity: "info", status: "success", timestamp: minutesAgo(20), reference: "lbl_and_batch_42", details: "Lote de 12 etiquetas generado correctamente." },
  { id: "log_11", integrationId: "int_sup_03", integrationName: "FashionPartner BA", event: "Sync en progreso", severity: "info", status: "pending", timestamp: minutesAgo(45), reference: "sync_fp_active", details: "Sincronizacion de 67 productos en curso." },
  { id: "log_12", integrationId: "int_trk_01", integrationName: "Google Analytics 4", event: "Eventos enviados", severity: "info", status: "success", timestamp: minutesAgo(2), reference: "ga4_events_batch", details: "Lote de 1.240 eventos enviados al datastream." },
];

// ─── Summary ───

export const MOCK_INTEGRATIONS_SUMMARY: IntegrationsSummary = {
  totalActive: 14,
  totalAlerts: 4,
  totalDisconnected: 1,
  lastGlobalSync: minutesAgo(2),
  paymentsOperational: 2,
  suppliersActive: 3,
  recentErrors: 3,
  channelsConnected: 4,
};
