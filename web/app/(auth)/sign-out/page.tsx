import type { Metadata } from 'next';
import { SignOut } from '@/components/auth/sign-out';

// Where SIGN_OUT_HREF links land (account menus, settings): ends the session, then goes to /login.
export const metadata: Metadata = { title: 'Signing out', robots: { index: false } };

export default function Page() {
  return <SignOut />;
}
