/**
 * Unicode-aware slug generator.
 * Preserves CJK / Unicode letters and digits so non-ASCII tags (e.g. "旅行", "摄影")
 * produce distinct, readable slugs instead of colliding on empty strings.
 */
export function slugify(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return '';

  const normalized = trimmed
    .replace(/[^\p{L}\p{N}\-_]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || encodeURIComponent(trimmed);
}
