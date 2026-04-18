export function storePath(storeSlug: string, path = ""): string {
  const cleanPath = path.trim();

  if (!cleanPath || cleanPath === "/") {
    return `/store/${storeSlug}`;
  }

  return `/store/${storeSlug}${cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`}`;
}

export function normalizeStorefrontHref(href: string | null | undefined, storeSlug: string): string {
  const rawHref = href?.trim();

  if (!rawHref) {
    return storePath(storeSlug);
  }

  if (/^(https?:|mailto:|tel:|#)/i.test(rawHref)) {
    return rawHref;
  }

  if (rawHref.startsWith(`/store/${storeSlug}`)) {
    return rawHref;
  }

  const legacyRoot = `/${storeSlug}`;

  if (rawHref === legacyRoot) {
    return storePath(storeSlug);
  }

  if (rawHref.startsWith(`${legacyRoot}/`)) {
    return storePath(storeSlug, rawHref.slice(legacyRoot.length));
  }

  if (rawHref.startsWith("/store/")) {
    return rawHref;
  }

  return storePath(storeSlug, rawHref);
}
