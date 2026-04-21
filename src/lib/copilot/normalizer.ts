// ─── Copilot Normalizer ──────────────────────────────────────────────────
// Text normalization, typo correction, and compound input splitting.

const ACCENT_MAP: Record<string, string> = {
  á: "a", é: "e", í: "i", ó: "o", ú: "u",
};

const TYPO_MAP: Record<string, string> = {
  ponel: "poner", tibografia: "tipografia", colorl: "color",
  camiba: "cambia", camviar: "cambiar", ocular: "ocultar",
  mibimalista: "minimalista", mimimalista: "minimalista",
  testimonioa: "testimonios", benebicios: "beneficios",
  catálogo: "catalogo", sección: "seccion",
  botón: "boton", edición: "edicion", información: "informacion",
  hará: "hace", ponga: "pon", cambie: "cambia",
  mueva: "mueve", oculte: "oculta", muestre: "muestra",
  edite: "edita", reescriba: "reescribi",
};

export function normalize(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function fixTypos(normalized: string): string {
  let result = normalized;
  for (const [typo, fix] of Object.entries(TYPO_MAP)) {
    result = result.replace(new RegExp(typo, "gi"), fix);
  }
  return result;
}

export function splitCompoundInput(text: string): string[] {
  const parts: string[] = [];
  const segments = text.split(/(?:\s+y\s+|\s*,\s*|\s*;\s*|\s*también\s+|\s*tambien\s+|\s*además\s+|\s*ademas\s+)/i);
  for (const seg of segments) {
    const trimmed = seg.trim();
    if (trimmed.length > 2) parts.push(trimmed);
  }
  return parts.length > 0 ? parts : [text];
}