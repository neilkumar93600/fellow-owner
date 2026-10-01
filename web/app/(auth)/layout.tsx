import { AuthFooter } from '@/components/auth/auth-footer';
import { AuthPanel } from '@/components/auth/auth-panel';
import { SplitShell } from '@/components/layout/split-shell';

/**
 * Sign in, sign up, code and password screens share one frame: the form on white on the left, the grey
 * shell with real product moments on the right. On phones and tablets the panel steps aside so the
 * form is the first and only thing on screen (fans arrive inside in-app browsers on small phones).
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <SplitShell aside={<AuthPanel />} footer={<AuthFooter />} hideAsideOnMobile>
      {children}
    </SplitShell>
  );
}
