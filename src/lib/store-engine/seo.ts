export function toPlainText(value: string | null | undefined, fallback = ""): string {
  const text = value
    ?.replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text || fallback;
}

export function toMetaDescription(value: string | null | undefined, fallback: string): string {
  const text = toPlainText(value, fallback);

  if (text.length <= 155) {
    return text;
  }

  return `${text.slice(0, 152).trim()}...`;
}
