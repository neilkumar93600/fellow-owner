import type { Metadata, Viewport } from 'next';
import { Analytics } from '@/components/shared/analytics';
import { AuroraBackdrop } from '@/components/shared/aurora-backdrop';
import { SITE } from '@/lib/constants';
import { appUrl } from '@/lib/env';
import { geistMono, inter, newsreader } from '@/lib/fonts';
import { cn } from '@/lib/utils';
import { Providers } from './providers';
import './globals.css';

// Search Console's HTML-tag check. Server env, read when pages render (set it before building).
const googleVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim();

// The share card and the icons are files beside this one (opengraph-image.tsx, icon.svg, apple-icon.png,
// favicon.ico, manifest.ts). Pages add their own title, description, canonical and Open Graph through
// lib/seo pageMetadata.
export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: {
    default: `${SITE.name}: ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    title: `${SITE.name}: ${SITE.tagline}`,
    description: SITE.description,
    locale: 'en_US',
  },
  twitter: { card: 'summary_large_image' },
  ...(googleVerification ? { verification: { google: googleVerification } } : {}),
};

export const viewport: Viewport = {
  themeColor: '#f6f3f1',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(geistMono.variable, inter.variable, newsreader.variable, 'antialiased')}
    >
      <body className="bg-cream text-ink">
        <AuroraBackdrop />
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
