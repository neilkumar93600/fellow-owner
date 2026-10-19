import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/auth-shell';

// Every auth screen stays out of search results; a page can still add its own title and robots.
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Log in, create account, the email code and the password screens share one frame (AuthShell): the
 * hazed shell with the logo and a glass tab bar, the screen's white card, and the art (the golden-hour landscape
 * and the AI twin card) from 1024px. It lives in the layout so the tab bar and the art stay put while only the card changes.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
