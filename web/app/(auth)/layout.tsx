import { AuthShell } from '@/components/auth/auth-shell';

/**
 * Log in, create account, the email code and the password screens share one frame (AuthShell): the
 * hazed shell with the logo and a glass tab bar, the screen's white card, and Mira's photo from
 * 1024px. It lives in the layout so the tab bar and the picture stay put while only the card changes.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
