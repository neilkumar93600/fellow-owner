'use client';

import { useEffect, useState } from 'react';

/**
 * True inside Instagram, TikTok, Facebook, YouTube, Snapchat, LinkedIn or X in-app webviews.
 * Google blocks OAuth there, so the Google button hides (07-file-structure note 3).
 * Returns null until checked on the client.
 */
export function useInAppBrowser(): boolean | null {
  const [inApp, setInApp] = useState<boolean | null>(null);
  useEffect(() => {
    setInApp(isInAppBrowser(navigator.userAgent));
  }, []);
  return inApp;
}

export function isInAppBrowser(userAgent: string): boolean {
  return /Instagram|FBAN|FBAV|FB_IAB|TikTok|musical_ly|Bytedance|BytedanceWebview|Snapchat|LinkedInApp|Twitter|\bYouTube\b|GSA\/|Line\//i.test(
    userAgent,
  );
}
