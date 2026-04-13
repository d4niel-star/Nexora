import {
  Ticket,
  HelpArticle,
  SystemStatusInfo,
  Guide,
  ContactChannel,
  SupportActivity,
  SupportSummary,
} from "@/types/support";

const d = new Date();
const subtractDays = (days: number) => new Date(d.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
const subtractHours = (hours: number) => new Date(d.getTime() - hours * 60 * 60 * 1000).toISOString();

export const MOCK_TICKETS: Ticket[] = [
  { id: "TKT-8901", subject: "Problema con importacion de ML", category: "Integraciones", priority: "high", status: "open", createdAt: subtractHours(2), updatedAt: subtractHours(1) },
  { id: "TKT-8895", subject: "Error al procesar pago #9482", category: "Pagos", priority: "critical", status: "in_progress", createdAt: subtractHours(5), updatedAt: subtractHours(2) },
  { id: "TKT-8850", subject: "Duda sobre configuracion de envios", category: "Envios", priority: "medium", status: "pending", createdAt: subtractDays(1), updatedAt: subtractHours(12) },
  { id: "TKT-8842", subject: "Cambio de plan a Pro", category: "Configuracion", priority: "low", status: "resolved", createdAt: subtractDays(2), updatedAt: subtractDays(1) },
  { id: "TKT-8810", subject: "Sincronizacion de stock fallida", category: "Catalogo", priority: "high", status: "closed", createdAt: subtractDays(5), updatedAt: subtractDays(4) },
];

export const MOCK_HELP_ARTICLES: HelpArticle[] = [
  { id: "ART-101", title: "Como conectar tu cuenta de Mercado Libre", category: "Integraciones", readTime: "4 min", status: "published", lastUpdated: subtractDays(10) },
  { id: "ART-102", title: "Configuracion de metodos de envío personalizados", category: "Envios", readTime: "6 min", status: "published", lastUpdated: subtractDays(15) },
  { id: "ART-103", title: "Gestion de devoluciones y reembolsos", category: "Pedidos", readTime: "5 min", status: "published", lastUpdated: subtractDays(20) },
  { id: "ART-104", title: "Importacion masiva de productos via CSV", category: "Catalogo", readTime: "8 min", status: "published", lastUpdated: subtractDays(8) },
  { id: "ART-105", title: "Configurar notificaciones por email", category: "Marketing", readTime: "3 min", status: "published", lastUpdated: subtractDays(2) },
  { id: "ART-106", title: "Nueva pasarela de pagos (BETA)", category: "Pagos", readTime: "2 min", status: "draft", lastUpdated: subtractHours(5) },
];

export const MOCK_SYSTEM_STATUS: SystemStatusInfo = {
  overallStatus: "operational",
  lastIncident: subtractDays(3),
  history: "99.98% de uptime en los ultimos 30 dias",
  modules: [
    { id: "MOD-1", name: "Panel de Administracion", status: "operational" },
    { id: "MOD-2", name: "API Publica", status: "operational" },
    { id: "MOD-3", name: "Sincronizacion Mercado Libre", status: "degraded" },
    { id: "MOD-4", name: "Procesamiento de Pagos", status: "operational" },
    { id: "MOD-5", name: "Webhooks", status: "operational" },
  ],
};

export const MOCK_GUIDES: Guide[] = [
  { id: "GUI-1", title: "Primeros pasos en Nexora", category: "Onboarding", level: "beginner", duration: "15 min", status: "published" },
  { id: "GUI-2", title: "Lanza tu primera campaña", category: "Marketing", level: "intermediate", duration: "25 min", status: "published" },
  { id: "GUI-3", title: "Optimizacion avanzada de SEO", category: "Diseño de tienda", level: "advanced", duration: "40 min", status: "published" },
  { id: "GUI-4", title: "Automatizacion de inventario", category: "Catalogo", level: "intermediate", duration: "20 min", status: "published" },
];

export const MOCK_CONTACT_CHANNELS: ContactChannel[] = [
  { id: "CH-1", type: "chat", name: "Chat en vivo", description: "Habla con nuestro equipo de soporte tecnico en tiempo real.", availability: "Lunes a Viernes, 9am a 6pm", sla: "< 5 minutos", value: "Abrir chat" },
  { id: "CH-2", type: "email", name: "Soporte por Email", description: "Envianos un correo detallando tu problema o consulta.", availability: "24/7", sla: "< 4 horas", value: "soporte@nexora.com" },
  { id: "CH-3", type: "phone", name: "Linea Prioritaria", description: "Exclusivo para planes Pro. Ayuda telefonica inmediata.", availability: "Lunes a Viernes, 9am a 6pm", sla: "Inmediato", value: "+54 11 5555-0199" },
];

export const MOCK_SUPPORT_ACTIVITIES: SupportActivity[] = [
  { id: "ACT-1", type: "ticket_created", description: "Ticket TKT-8901 creado", severity: "info", timestamp: subtractHours(2), referenceId: "TKT-8901" },
  { id: "ACT-2", type: "system_degraded", description: "Latencia en API de ML detectada", severity: "warning", timestamp: subtractHours(4), referenceId: "SYS-ML" },
  { id: "ACT-3", type: "ticket_escalated", description: "Ticket TKT-8895 escalado a Nivel 2", severity: "critical", timestamp: subtractHours(5), referenceId: "TKT-8895" },
  { id: "ACT-4", type: "incident_resolved", description: "Microcorte de base de datos mitigado", severity: "info", timestamp: subtractDays(3), referenceId: "INC-993" },
  { id: "ACT-5", type: "ticket_resolved", description: "Ticket TKT-8842 marcado como resuelto", severity: "info", timestamp: subtractDays(1), referenceId: "TKT-8842" },
];

export const MOCK_SUPPORT_SUMMARY: SupportSummary = {
  openTickets: 3,
  resolvedTickets: 124,
  avgResponseTime: "1h 15m",
  overallSystemStatus: "operational",
};
