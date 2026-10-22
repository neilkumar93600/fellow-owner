import { handleSchema, isReservedHandle, LIMITS } from '@fellow-owners/shared';

/**
 * Handle availability helpers for onboarding (GET /api/studio/handle-check, POST /api/studio/space).
 * Pure: the caller asks the database which candidates are taken.
 */

export type HandleProblem = 'invalid' | 'reserved';

/** Why a handle can never be used (format or reserved list), or null when it is acceptable. */
export function handleProblem(handle: string): HandleProblem | null {
  const normalized = handle.trim().toLowerCase();
  const { min, max, pattern } = LIMITS.handle;
  if (normalized.length < min || normalized.length > max || !pattern.test(normalized)) {
    return 'invalid';
  }
  if (isReservedHandle(normalized)) return 'reserved';
  // The shared schema is the source of truth; this only guards against the two drifting apart.
  return handleSchema.safeParse(normalized).success ? null : 'invalid';
}

/**
 * The closest usable base for suggestions: lowercased, invalid characters dropped,
 * cut so a suffix still fits. Empty when nothing usable is left.
 */
export function handleBase(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9_.]+/g, '')
    .replace(/^[_.]+|[_.]+$/g, '')
    .slice(0, LIMITS.handle.max);
}

/**
 * Ordered suggestion candidates for a base handle, all valid and not reserved:
 * base_, base.official, base + digits, basehq, thebase, ... Candidates longer than the max are
 * built from a shortened base. The caller filters out taken ones and keeps the first three.
 */
export function handleCandidates(input: string): string[] {
  const base = handleBase(input);
  if (!base) return [];
  const { max } = LIMITS.handle;
  const withAffix = (suffix: string, prefix = '') =>
    `${prefix}${base.slice(0, Math.max(0, max - suffix.length - prefix.length))}${suffix}`;

  const raw = [
    withAffix('_'),
    withAffix('.official'),
    withAffix('2'),
    withAffix('hq'),
    withAffix('', 'the'),
    withAffix('.club'),
    withAffix('_official'),
    ...Array.from({ length: 8 }, (_, i) => withAffix(String(i + 3))),
    ...Array.from({ length: 10 }, (_, i) => withAffix(String(10 + i * 7))),
  ];
  const out: string[] = [];
  for (const candidate of raw) {
    if (candidate === base || out.includes(candidate)) continue;
    if (handleProblem(candidate) === null) out.push(candidate);
  }
  return out;
}

/**
 * Usernames to try, best first, for someone who signed up with Google, Apple or Facebook: the name
 * run together ("Priya Shah" is priyashah), then priya.shah and priya_shah, then handleCandidates.
 * With no usable name, the same from the email's local part. The caller takes the first free one.
 */
export function usernameCandidates(name: string, email: string): string[] {
  for (const source of [name, email.split('@')[0] ?? '']) {
    const words = source
      .split(/[\s._-]+/)
      .map(handleBase)
      .filter(Boolean);
    const joined = words.join('');
    const all = [joined, words.join('.'), words.join('_'), ...handleCandidates(joined)];
    const usable = [...new Set(all)].filter((candidate) => handleProblem(candidate) === null);
    if (usable.length > 0) return usable;
  }
  return [];
}
