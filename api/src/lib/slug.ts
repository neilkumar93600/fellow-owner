/**
 * kebab-case slugs: lowercase ASCII letters and digits joined by single dashes
 * (matches LIMITS.community.slug.pattern). Used for community slugs and showcase slugs.
 */
export function slugify(input: string, maxLength = 40, fallback = 'item'): string {
  const slug = input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const cut = truncateSlug(slug, maxLength);
  return cut.length >= 2 ? cut : truncateSlug(fallback, maxLength);
}

/** Cuts a slug to maxLength without leaving a trailing dash. */
export function truncateSlug(slug: string, maxLength: number): string {
  if (slug.length <= maxLength) return slug;
  return slug.slice(0, maxLength).replace(/-+$/g, '');
}

/** `base`, `base-2`, `base-3`, ... : the first one not in `taken`, never longer than maxLength. */
export function uniqueSlug(base: string, taken: Iterable<string>, maxLength = 40): string {
  const takenSet = taken instanceof Set ? (taken as Set<string>) : new Set(taken);
  const root = truncateSlug(base, maxLength);
  if (!takenSet.has(root)) return root;
  for (let n = 2; n < 10_000; n += 1) {
    const suffix = `-${n}`;
    const candidate = `${truncateSlug(base, maxLength - suffix.length)}${suffix}`;
    if (!takenSet.has(candidate)) return candidate;
  }
  throw new Error(`No free slug for ${base}`);
}

/** Async variant for checks that hit the database. */
export async function uniqueSlugAsync(
  base: string,
  isTaken: (slug: string) => Promise<boolean>,
  maxLength = 40,
): Promise<string> {
  const root = truncateSlug(base, maxLength);
  if (!(await isTaken(root))) return root;
  for (let n = 2; n < 1_000; n += 1) {
    const suffix = `-${n}`;
    const candidate = `${truncateSlug(base, maxLength - suffix.length)}${suffix}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  throw new Error(`No free slug for ${base}`);
}
