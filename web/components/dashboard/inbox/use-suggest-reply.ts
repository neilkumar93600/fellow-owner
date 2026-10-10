'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, apiFetch } from '@/lib/fetcher';
import { errorMessage } from '@/lib/toast';

/** Shown when the daily cap is hit (the API answers 429). */
export const DRAFT_CAP_MESSAGE = "You've used today's drafts. They refresh tomorrow.";

/** POST /api/studio/inbox/:id/suggest-reply: an AI draft in the creator's voice. Nothing is sent. */
function suggestReply(pitchId: string): Promise<{ reply: string }> {
  return apiFetch<{ reply: string }>(
    `/api/studio/inbox/${encodeURIComponent(pitchId)}/suggest-reply`,
    { method: 'POST' },
  );
}

/** The words for a failed draft: the cap, an endpoint that is not live yet, or the API's own message. */
function draftError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return DRAFT_CAP_MESSAGE;
    if (error.status === 404) return 'That pitch could not be found.';
    // 501 means drafting is switched off; the reply box stays usable by hand.
    if (error.status === 501) return 'Drafting is not available yet.';
  }
  return errorMessage(error, 'The draft could not be written. Try again.');
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * "Draft in my voice": fetches a draft and types it into the field a few characters at a time (all at
 * once under reduced motion). `onText` receives the growing text. `pending` covers the request only, so
 * the typing dots show while the AI writes; `typing` covers the reveal. A newer call, an edit (`stop`) or
 * unmounting ends a reveal where it is. `error` holds the plain-words failure, or null.
 */
export function useSuggestReply(pitchId: string, onText: (text: string) => void) {
  const [pending, setPending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const run = useRef(0);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  const stop = useCallback(() => {
    run.current += 1;
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
    setTyping(false);
    setPending(false);
  }, []);

  useEffect(() => stop, [stop]);

  const draft = useCallback(async () => {
    stop();
    const mine = run.current;
    setError(null);
    setPending(true);
    try {
      const { reply } = await suggestReply(pitchId);
      if (run.current !== mine) return;
      if (prefersReducedMotion() || reply.length < 40) {
        onTextRef.current(reply);
        return;
      }
      let shown = 0;
      setTyping(true);
      timer.current = window.setInterval(() => {
        shown = Math.min(reply.length, shown + 4);
        onTextRef.current(reply.slice(0, shown));
        if (shown >= reply.length) stop();
      }, 16);
    } catch (caught) {
      if (run.current === mine) setError(draftError(caught));
    } finally {
      // A reveal that started keeps `pending` off already; an ended run was cleared by stop().
      if (run.current === mine) setPending(false);
    }
  }, [pitchId, stop]);

  return { draft, stop, pending, typing, error };
}
