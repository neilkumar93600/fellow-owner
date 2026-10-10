'use client';

import { useEffect, useRef } from 'react';
import { recordVisit } from '@/api/metrics';

/** Records one visit to the public bio page (pilot analytics); renders nothing. */
export function VisitBeacon({ handle }: { handle: string }): null {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    recordVisit(handle);
  }, [handle]);
  return null;
}
