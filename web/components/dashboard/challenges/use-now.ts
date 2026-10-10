import { useEffect, useState } from 'react';

/** The page's clock, ticking each minute so countdowns stay honest; stable between renders otherwise. */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}
