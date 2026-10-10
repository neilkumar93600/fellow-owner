import { Footer } from '@/components/layout/footer';
import { Navbar } from '@/components/layout/navbar';

/**
 * Legal pages carry the marketing chrome, so the footer's legal column is one tap away from every
 * clause and nobody lands in a dead end. Both components gate themselves on lib/constants
 * MARKETING_PATHS, which lists these four routes.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
