// ─── Carrier registry ──────────────────────────────────────────────────────
// Single source of truth for the merchant-facing carrier catalog. Adding
// a new provider means: (1) a new entry here, (2) a new adapter under
// /lib/shipping/carriers/, (3) a new admin page under /admin/shipping/.
// Persistence + UI shells are reused as-is.

import type { CarrierAdapter, CarrierId } from "./types";
import { correoArgentinoAdapter } from "./carriers/correo-argentino";
import { andreaniAdapter } from "./carriers/andreani";

export interface CarrierMetadata {
  id: CarrierId;
  /** Display name shown in the sidebar and integration page header. */
  name: string;
  /** Short pitch shown under the page title. */
  tagline: string;
  /** Slug used in the URL: /admin/shipping/<slug>. */
  slug: "correo-argentino" | "andreani";
  /** Public docs the merchant can open to obtain credentials. */
  docsUrl: string;
  /** Page where the merchant requests API access if they don't have it. */
  credentialsRequestUrl: string;
  /** Headline label of the credentials form (e.g. "Cuenta Andreani API"). */
  credentialsHeadline: string;
  /** Hint shown above the form to set merchant expectations. */
  credentialsHint: string;
  /** Whether the carrier requires a "client number" alongside user/password. */
  requiresClientNumber: boolean;
  /** Whether the carrier exposes an explicit sandbox environment toggle. */
  supportsSandbox: boolean;
  /** Adapter that performs credential validation against the live API. */
  adapter: CarrierAdapter;
}

export const CARRIERS: ReadonlyArray<CarrierMetadata> = [
  {
    id: "correo_argentino",
    name: "Correo Argentino",
    tagline:
      "Conectá tu cuenta de MiCorreo (Correo Argentino) para operar envíos desde Nexora.",
    slug: "correo-argentino",
    docsUrl:
      "https://www.correoargentino.com.ar/MiCorreo/public/img/pag/apiMiCorreo.pdf",
    credentialsRequestUrl:
      "https://www.correoargentino.com.ar/MiCorreo/public/contact",
    credentialsHeadline: "Credenciales de la API MiCorreo",
    credentialsHint:
      "Las entrega Correo Argentino al activar tu contrato de envíos. Si todavía no las tenés, solicitalas desde el formulario oficial.",
    requiresClientNumber: true,
    supportsSandbox: true,
    adapter: correoArgentinoAdapter,
  },
  {
    id: "andreani",
    name: "Andreani",
    tagline:
      "Conectá tu cuenta cliente de Andreani para validar credenciales y dejar la base lista para operar envíos.",
    slug: "andreani",
    docsUrl: "https://developers.andreani.com/en/document",
    credentialsRequestUrl: "https://www.andreani.com/empresas",
    credentialsHeadline: "Credenciales de la API Andreani",
    credentialsHint:
      "Las entrega el equipo de Andreani al firmar contrato de cliente. Necesitás usuario, contraseña y número de cliente.",
    requiresClientNumber: true,
    supportsSandbox: true,
    adapter: andreaniAdapter,
  },
];

export function getCarrierById(id: string): CarrierMetadata | null {
  return CARRIERS.find((c) => c.id === id) ?? null;
}

export function getCarrierBySlug(slug: string): CarrierMetadata | null {
  return CARRIERS.find((c) => c.slug === slug) ?? null;
}
