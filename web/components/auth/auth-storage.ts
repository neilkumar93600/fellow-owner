'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

/** When the last email confirmation code was sent (ms since epoch), so a refresh keeps the countdown. */
export const OTP_SENT_AT_KEY = 'fo:otp-sent-at';
/** The email a password reset code was sent to, and when (from "Forgot password?" to the reset screen). */
export const RESET_EMAIL_KEY = 'fo:reset-email';
export const RESET_SENT_AT_KEY = 'fo:reset-sent-at';

const CHANGE_EVENT = 'fo:session-storage';

/** sessionStorage can throw (private mode, blocked storage, some in-app webviews). Never let it crash a form. */
export function readSession(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeSession(key: string, value: string | null): void {
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, value);
  } catch {
    // Storage unavailable: the flow still works for this page view.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/**
 * Reads a sessionStorage value. `undefined` on the server and during hydration (not known yet),
 * then `null` when missing or the stored string.
 */
export function useSessionValue(key: string): string | null | undefined {
  return useSyncExternalStore(
    subscribe,
    () => readSession(key),
    () => undefined,
  );
}

/** Whole seconds left until `target` (ms since epoch); 0 once it has passed or when there is no target. */
export function useSecondsUntil(target: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (target === null) return;
    setNow(Date.now());
    const id = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= target) window.clearInterval(id);
    }, 250);
    return () => window.clearInterval(id);
  }, [target]);
  if (target === null) return 0;
  return Math.max(0, Math.ceil((target - now) / 1000));
}

/** "0:27" style countdown label. */
export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
