'use client';

import Script from 'next/script';
import { useEffect, useSyncExternalStore } from 'react';

/*
 * Google Analytics 4, consent-gated and key-optional. Without NEXT_PUBLIC_GA_ID nothing here loads and the
 * cookie notice stays the essential-only one. With it, gtag.js is requested only after the visitor picks
 * "Accept analytics" in the consent banner; Consent Mode v2 starts every signal at denied and only
 * analytics_storage is granted (no ads signals, ever). The choice is a first-party cookie, fo_consent,
 * kept six months; "Cookie settings" asks again, and taking analytics back sets GA's own opt-out flag,
 * updates consent to denied and deletes the _ga cookies. Page changes are GA4's enhanced measurement
 * (browser history events), so there is no router hook here.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const RAW_GA_ID = (process.env.NEXT_PUBLIC_GA_ID ?? '').trim();
/** The GA4 measurement id; anything that is not one (or nothing) means no analytics. */
export const GA_ID = /^G-[A-Z0-9]{4,20}$/.test(RAW_GA_ID) ? RAW_GA_ID : undefined;

export type ConsentChoice = 'analytics' | 'essential';

interface ConsentState {
  choice: ConsentChoice | null;
  /** "Cookie settings" opened the banner again. */
  asking: boolean;
}

const COOKIE = 'fo_consent';
const SIX_MONTHS = 60 * 60 * 24 * 182;

function readChoice(): ConsentChoice | null {
  try {
    const match = document.cookie.match(/(?:^|;\s*)fo_consent=(analytics|essential)(?:;|$)/);
    return (match?.[1] as ConsentChoice | undefined) ?? null;
  } catch {
    return null;
  }
}

let state: ConsentState | undefined;
const listeners = new Set<() => void>();

function current(): ConsentState {
  state ??= { choice: readChoice(), asking: false };
  return state;
}

function update(next: ConsentState): void {
  state = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The visitor's consent; null while server rendering and hydrating (the banner waits for the client). */
export function useConsent(): ConsentState | null {
  return useSyncExternalStore(subscribe, current, () => null);
}

/** GA's _ga and _ga_<id> cookies, on this host and every parent domain GA may have used. */
function deleteAnalyticsCookies(): void {
  try {
    const names = document.cookie
      .split(';')
      .map((part) => part.split('=')[0].trim())
      .filter((name) => name === '_ga' || name.startsWith('_ga_'));
    const labels = location.hostname.split('.');
    const domains = [''];
    for (let i = 0; i < labels.length - 1; i++)
      domains.push(`; domain=.${labels.slice(i).join('.')}`);
    for (const name of names) {
      for (const domain of domains) {
        // biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API is missing in Safari and Firefox.
        document.cookie = `${name}=; path=/; max-age=0${domain}`;
      }
    }
  } catch {
    // Cookies blocked: there is nothing to delete.
  }
}

export function chooseConsent(choice: ConsentChoice): void {
  try {
    const secure = location.protocol === 'https:' ? '; secure' : '';
    // biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API is missing in Safari and Firefox.
    document.cookie = `${COOKIE}=${choice}; path=/; max-age=${SIX_MONTHS}; samesite=lax${secure}`;
  } catch {
    // Cookies blocked: the choice holds for this page view only.
  }
  if (choice === 'essential') deleteAnalyticsCookies();
  update({ choice, asking: false });
}

/** Opens the consent banner again (the footer's "Cookie settings"). */
export function reopenConsent(): void {
  update({ ...current(), asking: true });
}

const CONSENT_DEFAULTS = JSON.stringify({
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
});

/** Rendered once in the root layout. */
export function Analytics() {
  const granted = useConsent()?.choice === 'analytics';

  useEffect(() => {
    if (!GA_ID) return;
    // After a revoke the loaded script stays in the page: GA's opt-out flag stops it sending.
    (window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`] = !granted;
    window.gtag?.('consent', 'update', {
      analytics_storage: granted ? 'granted' : 'denied',
    });
  }, [granted]);

  if (!GA_ID || !granted) return null;
  return (
    <>
      <Script id="ga-consent" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('consent','default',${CONSENT_DEFAULTS});gtag('consent','update',{analytics_storage:'granted'});gtag('js',new Date());gtag('config','${GA_ID}');`}
      </Script>
      <Script
        id="ga-gtag"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
    </>
  );
}
