/**
 * The one door to localStorage. Every key is prefixed `fo:` and listed here, values are JSON, and every
 * read and write is wrapped: storage can throw (private mode, blocked site data, in-app webviews) and must
 * never break a page. Safe to import on the server: there it reads nothing and writes nothing.
 *
 * Nothing sensitive lives here: no tokens, emails or other personal data. The server (session cookie)
 * stays the only source of truth; `fo:auth` is a UX hint only.
 */

export const LOCAL_KEYS = {
  /** Cookie notice accepted (essential cookies only). */
  consent: 'fo:consent',
  /** Ids of dismissed popups and banners. */
  popups: 'fo:popups',
  /** Non-sensitive "probably signed in" hint, set after sign-in and cleared on sign-out. */
  auth: 'fo:auth',
  /** Onboarding draft and platform import (owned by components/onboarding/onboarding-templates.ts). */
  onboardingDraft: 'fo:onboarding-draft:v1',
  onboardingImport: 'fo:onboarding-import:v1',
} as const;

/** The cookie notice's key before fo:consent; migrated on first read. */
const LEGACY_CONSENT_KEY = 'fo:cookie-notice';

export interface Consent {
  essential: true;
  at: number;
}

export interface AuthHint {
  signedIn: true;
  role: 'creator' | 'fan';
  at: number;
}

interface Shapes {
  consent: Consent;
  popups: string[];
  auth: AuthHint;
}

type Key = keyof Shapes;

function store(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** The parsed value, or null when missing, unreadable or not JSON. Callers check the shape they need. */
export function getLocal<K extends Key>(key: K): Shapes[K] | null {
  try {
    const raw = store()?.getItem(LOCAL_KEYS[key]);
    return raw ? (JSON.parse(raw) as Shapes[K]) : null;
  } catch {
    return null;
  }
}

export function setLocal<K extends Key>(key: K, value: Shapes[K]): void {
  try {
    store()?.setItem(LOCAL_KEYS[key], JSON.stringify(value));
  } catch {
    // Unavailable or full: this page view carries on without it.
  }
}

export function removeLocal(key: Key): void {
  try {
    store()?.removeItem(LOCAL_KEYS[key]);
  } catch {
    // As above.
  }
}

/** True once the cookie notice was accepted, here or under the old `fo:cookie-notice` key (moved over). */
export function hasConsent(): boolean {
  if (getLocal('consent')?.essential === true) return true;
  try {
    const s = store();
    if (s?.getItem(LEGACY_CONSENT_KEY) !== 'seen') return false;
    s.removeItem(LEGACY_CONSENT_KEY);
  } catch {
    return false;
  }
  giveConsent();
  return true;
}

export function giveConsent(): void {
  setLocal('consent', { essential: true, at: Date.now() });
}

export function isPopupDismissed(id: string): boolean {
  const list = getLocal('popups');
  return Array.isArray(list) && list.includes(id);
}

export function dismissPopup(id: string): void {
  const list = getLocal('popups');
  const ids = Array.isArray(list) ? list.filter((x) => typeof x === 'string') : [];
  if (!ids.includes(id)) setLocal('popups', [...ids, id].slice(-50));
}

export function setAuthHint(role: AuthHint['role']): void {
  setLocal('auth', { signedIn: true, role, at: Date.now() });
}

export function clearAuthHint(): void {
  removeLocal('auth');
}
