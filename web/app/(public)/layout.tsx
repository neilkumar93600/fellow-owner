import { Footer } from '@/components/layout/footer';
import { Navbar } from '@/components/layout/navbar';

// Navbar and footer render only on marketing paths (lib/constants MARKETING_PATHS); the creator's
// bio, join and showcase pages under [handle] keep their own fan chrome (07-file-structure).
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
