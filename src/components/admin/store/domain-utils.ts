export function normalizeDomainHost(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");

  return cleaned.length > 0 ? cleaned : null;
}

export function formatInternalStoreDomain(
  subdomain: string | null | undefined,
  slug: string | null | undefined,
): string | null {
  const normalizedSubdomain = normalizeDomainHost(subdomain);
  if (normalizedSubdomain) {
    return normalizedSubdomain.includes(".")
      ? normalizedSubdomain
      : `${normalizedSubdomain}.nexora.app`;
  }

  const normalizedSlug = normalizeDomainHost(slug);
  return normalizedSlug ? `${normalizedSlug}.nexora.app` : null;
}

export function toHttpsUrl(host: string | null | undefined): string | null {
  const normalizedHost = normalizeDomainHost(host);
  return normalizedHost ? `https://${normalizedHost}` : null;
}
