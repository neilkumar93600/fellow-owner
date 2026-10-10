'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toastError, toastSuccess } from '@/lib/toast';

/**
 * Copies text and confirms with a toast. `copied` stays true for 2s, for a "Copied" label on the button.
 * Older in-app browsers without the Clipboard API fall back to a hidden textarea.
 */
export function useCopy(): {
  copy: (text: string, message?: string) => Promise<void>;
  copied: boolean;
} {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(async (text: string, message?: string) => {
    try {
      await writeClipboard(text);
    } catch (error) {
      toastError(error, { fallback: "Couldn't copy. Select the text and copy it instead." });
      return;
    }
    toastSuccess(message ?? 'Copied');
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2000);
  }, []);

  return { copy, copied };
}

async function writeClipboard(text: string): Promise<void> {
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Denied or unsupported inside some webviews: try the textarea.
    }
  }
  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
  document.body.append(field);
  field.select();
  field.setSelectionRange(0, text.length);
  const copied = document.execCommand('copy');
  field.remove();
  // select() moved focus into the textarea; give it back to the button.
  active?.focus({ preventScroll: true });
  if (!copied) throw new Error('Copy command was rejected');
}
