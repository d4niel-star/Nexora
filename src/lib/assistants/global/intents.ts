// ─── Global Assistant — intent catalog ──────────────────────────────────
//
// The Global Assistant lives in the admin shell. Its STRENGTH is Ads, but
// it must also navigate, answer status questions and gracefully handoff
// design tasks to the Editor Assistant.
//
// Intent ids are namespaced ("ads.*", "nav.*", "status.*") so it's clear
// where each one is dispatched.

import type { ConceptIntent } from "@/lib/ai-core";

export type GlobalIntentId =
  // Ads (the assistant's strength)
  | "ads.recommendations"
  | "ads.connections.status"
  | "ads.pixels.status"
  | "ads.performance"
  | "ads.connect.meta"
  | "ads.connect.tiktok"
  | "ads.connect.google"
  | "ads.go.meta"
  | "ads.go.tiktok"
  | "ads.go.google"
  | "ads.go.pixels"
  // Navigation across the admin
  | "nav.dashboard"
  | "nav.orders"
  | "nav.products"
  | "nav.inventory"
  | "nav.stats"
  | "nav.payments"
  | "nav.shipping"
  | "nav.marketing"
  | "nav.store"
  | "nav.editor"
  | "nav.settings"
  // Business status
  | "status.business"
  | "status.alerts"
  | "status.revenue"
  // Editor handoff (we DON'T do design changes here)
  | "editor.handoff";

export const GLOBAL_INTENTS: ConceptIntent<GlobalIntentId>[] = [
  // ─── Ads ───────────────────────────────────────────────────────────
  {
    id: "ads.recommendations",
    words: ["recomenda", "recomendaciones", "sugerencias", "ideas", "que campaña", "que publico", "que campania"],
    phrases: ["que recomendas", "que sugerís", "que me recomendas para ads", "ideas de ads", "campañas para probar"],
    requireAny: ["ads", "campaña", "campania", "anuncio", "publicidad", "meta", "tiktok", "google", "facebook", "instagram", "pauta", "publico", "audiencia", "creativos", "creativo"],
  },
  {
    id: "ads.connections.status",
    words: ["conectado", "conexion", "conexiones", "conectada", "vinculado", "vinculada"],
    phrases: ["que tengo conectado", "ads conectado", "estoy conectado", "tengo conectado meta", "tengo conectado tiktok", "tengo conectado google"],
    requireAny: ["ads", "meta", "facebook", "instagram", "tiktok", "google", "publicidad", "campaña", "campania"],
  },
  {
    id: "ads.pixels.status",
    words: ["pixel", "pixeles", "tag", "tags", "tracking"],
    phrases: ["tengo el pixel", "tengo pixel", "esta el pixel", "config pixel", "instalar pixel"],
  },
  {
    id: "ads.performance",
    words: ["rendimiento", "performance", "roas", "cpa", "ctr", "impresiones", "clicks", "resultados"],
    requireAny: ["ads", "meta", "tiktok", "google", "campaña", "campania", "anuncio", "publicidad", "facebook", "instagram"],
  },
  {
    id: "ads.connect.meta",
    words: ["conectar"],
    phrases: ["conectar meta", "conectar facebook", "conectar instagram", "vincular meta", "vincular facebook"],
    requireAny: ["meta", "facebook", "instagram"],
  },
  {
    id: "ads.connect.tiktok",
    words: ["conectar"],
    phrases: ["conectar tiktok", "vincular tiktok"],
    requireAny: ["tiktok"],
  },
  {
    id: "ads.connect.google",
    words: ["conectar"],
    phrases: ["conectar google", "vincular google"],
    requireAny: ["google"],
  },
  {
    id: "ads.go.meta",
    words: [],
    phrases: ["llevame a meta", "abrime meta", "ir a meta", "abrir meta ads", "ver meta", "panel de meta"],
    requireAny: ["meta", "facebook", "instagram"],
  },
  {
    id: "ads.go.tiktok",
    words: [],
    phrases: ["llevame a tiktok", "abrime tiktok", "ir a tiktok", "abrir tiktok ads", "panel de tiktok"],
    requireAny: ["tiktok"],
  },
  {
    id: "ads.go.google",
    words: [],
    phrases: ["llevame a google", "abrime google", "ir a google ads", "panel de google"],
    requireAny: ["google"],
  },
  {
    id: "ads.go.pixels",
    words: [],
    phrases: ["llevame a pixeles", "ir a pixeles", "abrir pixeles", "configurar pixel", "configurar tags", "abrir tags"],
    requireAny: ["pixel", "pixeles", "tag", "tags"],
  },
  // ─── Navigation ────────────────────────────────────────────────────
  {
    id: "nav.dashboard",
    words: ["dashboard", "inicio", "home", "panel"],
    phrases: ["llevame al dashboard", "abrime el inicio", "ir al panel", "centro de comando"],
  },
  {
    id: "nav.orders",
    words: ["pedidos", "ordenes", "ventas"],
    phrases: ["ver pedidos", "abrir pedidos", "llevame a pedidos", "ir a pedidos"],
    antiWords: ["estadisticas", "reportes"],
  },
  {
    id: "nav.products",
    words: ["productos", "catalogo", "catálogo"],
    phrases: ["ver productos", "abrir productos", "abrir catalogo", "ir a productos", "ir al catalogo"],
  },
  {
    id: "nav.inventory",
    words: ["inventario", "stock"],
    phrases: ["ver inventario", "abrir inventario", "ir al inventario", "ver stock"],
  },
  {
    id: "nav.stats",
    words: ["estadisticas", "estadísticas", "reportes", "metricas", "métricas", "analytics"],
    phrases: ["ver estadisticas", "abrir estadisticas", "ir a reportes"],
  },
  {
    id: "nav.payments",
    words: ["pagos", "cobros", "checkout", "transacciones"],
    phrases: ["ir a pagos", "abrir pagos", "ver pagos"],
  },
  {
    id: "nav.shipping",
    words: ["envios", "envíos", "entregas", "courier"],
    phrases: ["ir a envios", "abrir envios"],
  },
  {
    id: "nav.marketing",
    words: ["marketing"],
    phrases: ["ir a marketing", "abrir marketing"],
    antiWords: ["ads", "anuncios", "campania", "campaña", "meta", "tiktok", "google"],
  },
  {
    id: "nav.store",
    words: [],
    phrases: ["mi tienda", "configurar tienda", "ir a mi tienda", "abrir mi tienda"],
    requireAny: ["tienda"],
    antiWords: ["editor", "editar", "diseño", "diseno"],
  },
  {
    id: "nav.editor",
    words: ["editor"],
    phrases: ["editor de tienda", "abrir editor", "ir al editor", "editar tienda", "editar la tienda"],
  },
  {
    id: "nav.settings",
    words: ["configuracion", "configuración", "ajustes", "settings"],
    phrases: ["abrir configuracion", "ir a ajustes"],
  },
  // ─── Status ────────────────────────────────────────────────────────
  {
    id: "status.business",
    words: [],
    phrases: ["como va el negocio", "como va la tienda", "como vamos", "panorama general", "resumen general", "como esta todo", "como esta el negocio"],
  },
  {
    id: "status.alerts",
    words: ["alertas", "pendientes", "urgentes"],
    phrases: ["que tengo pendiente", "que me falta", "que tengo que hacer", "que urge"],
  },
  {
    id: "status.revenue",
    words: ["facturacion", "facturé", "facture", "ingresos", "ventas"],
    phrases: ["cuanto vendi", "cuanto factureé", "cuanto factureé hoy", "ingresos del mes"],
    antiWords: ["pedidos individuales"],
  },
  // ─── Editor handoff ────────────────────────────────────────────────
  {
    id: "editor.handoff",
    words: ["color", "colores", "tipografia", "tipografía", "fuente", "hero", "secciones", "tema", "diseño", "diseno", "branding", "logo"],
    phrases: ["cambiar el color", "cambiar la fuente", "ocultar testimonios", "aplicar tema", "cambiar diseño", "editar la portada"],
  },
];
