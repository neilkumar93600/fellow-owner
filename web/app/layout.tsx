import type { Metadata, Viewport } from 'next';
import { AuroraBackdrop } from '@/components/shared/aurora-backdrop';
import { SITE } from '@/lib/constants';
import { instrumentSerif, inter } from '@/lib/fonts';
import { cn } from '@/lib/utils';
import { Providers } from './providers';
import './globals.css';

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
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
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  themeColor: '#fbf7f2',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(inter.variable, instrumentSerif.variable, 'antialiased')}
    >
      <body className="bg-cream text-ink">
        <AuroraBackdrop />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
