'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type * as React from 'react';

/** Light only in v1. Dark mode is P2 (F26); flip `forcedTheme` off when its tokens exist. */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
