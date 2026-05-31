// ─── Marketing Template Registry (Phase 7D.5) ────────────────────────
// A static catalogue of email templates Nexora can ACTUALLY render with
// the existing transactional email system. These are previews of real,
// renderable templates — not fictional campaign types.
//
// Each entry maps to an existing or near-existing transactional email
// path. `status: "renderable"` means the template HTML exists today;
// `status: "draft"` means the copy exists but the renderer is not wired
// for marketing use yet (honest distinction).

export type TemplateStatus = "renderable" | "draft";

export interface MarketingTemplate {
  id: string;
  name: string;
  category: "lifecycle" | "retention" | "newsletter";
  status: TemplateStatus;
  description: string;
  /** Tokens the template expects to interpolate. */
  variables: string[];
  /** Honest note about what's wired vs. not. */
  note: string;
}

export const MARKETING_TEMPLATES: MarketingTemplate[] = [
  {
    id: "abandoned_cart",
    name: "Carrito abandonado",
    category: "lifecycle",
    status: "renderable",
    description: "Recordatorio al cliente con los items que dejó en el carrito.",
    variables: ["customerName", "cartItems", "cartTotal", "recoveryUrl"],
    note: "Ya existe como automatización transaccional (automation.abandoned_cart). El template HTML está implementado.",
  },
  {
    id: "review_request",
    name: "Pedido de reseña",
    category: "lifecycle",
    status: "renderable",
    description: "Solicita una reseña X días después de la entrega.",
    variables: ["customerName", "productTitle", "reviewUrl"],
    note: "Existe como automatización transaccional (automation.review_request).",
  },
  {
    id: "winback",
    name: "Winback (reactivación)",
    category: "retention",
    status: "draft",
    description: "Reengancha clientes inactivos con un incentivo.",
    variables: ["customerName", "lastOrderDate", "incentiveCode"],
    note: "Copy disponible, pero requiere el motor de cupones por-campaña que no existe. El incentiveCode no se puede generar de forma segura todavía.",
  },
  {
    id: "newsletter",
    name: "Newsletter (borrador)",
    category: "newsletter",
    status: "draft",
    description: "Boletín general con novedades / productos destacados.",
    variables: ["headline", "featuredProducts", "unsubscribeUrl"],
    note: "El unsubscribeUrl requiere el sistema de supresión/unsubscribe que aún no existe. No se puede enviar legalmente sin él.",
  },
];

export function getTemplateById(id: string): MarketingTemplate | undefined {
  return MARKETING_TEMPLATES.find((t) => t.id === id);
}
