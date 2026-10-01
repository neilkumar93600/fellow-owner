'use client';

import { Check, Copy, Link2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import styles from './how.module.css';

type Result = 'copied' | 'failed';

const MESSAGES: Record<Result, string> = {
  copied: 'Link copied',
  failed: 'Copy blocked here. Select the link to copy it.',
};

/** Copies with the async clipboard API, falling back to a hidden textarea for older webviews. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}

/**
 * Step 01's bio link pill: "fellowowners.app/mira" with a copy ghost button. A click copies the demo
 * bio page's real URL on this origin and shows a small "Link copied" toast above the pill, announced
 * through a polite status region.
 */
export function HowCopyLink({ host, path }: { host: string; path: string }) {
  const [result, setResult] = useState<Result | null>(null);
  const [shown, setShown] = useState(false);
  const hideTimer = useRef(0);
  const clearTimer = useRef(0);

  useEffect(
    () => () => {
      window.clearTimeout(hideTimer.current);
      window.clearTimeout(clearTimer.current);
    },
    [],
  );

  async function onCopy() {
    const ok = await copyText(`${window.location.origin}${path}`);
    window.clearTimeout(hideTimer.current);
    window.clearTimeout(clearTimer.current);
    setResult(ok ? 'copied' : 'failed');
    setShown(true);
    hideTimer.current = window.setTimeout(() => {
      setShown(false);
      // Empty the status text once the toast has faded, so the next copy announces again.
      clearTimer.current = window.setTimeout(() => setResult(null), 300);
    }, 2200);
  }

  const copied = shown && result === 'copied';

  return (
    <div className={styles.linkField}>
      <div className={styles.linkPill}>
        <Link2 className={styles.linkIcon} strokeWidth={1.5} aria-hidden="true" />
        <span className={cn(styles.linkText, 'tabular')}>
          <span className={styles.linkHost}>{host}</span>
          {path}
        </span>
        <button
          type="button"
          className={cn('btn btn-ghost', styles.copyButton)}
          onClick={onCopy}
          aria-label="Copy bio link"
          data-copied={copied ? '' : undefined}
        >
          <Copy className={styles.copyIcon} strokeWidth={1.5} aria-hidden="true" />
          <Check className={styles.copiedIcon} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
      <p
        role="status"
        className={styles.toast}
        data-shown={shown ? '' : undefined}
        data-result={result ?? undefined}
      >
        {result === 'copied' ? (
          <Check className={styles.toastIcon} strokeWidth={1.75} aria-hidden="true" />
        ) : null}
        {result ? MESSAGES[result] : null}
      </p>
    </div>
  );
}
