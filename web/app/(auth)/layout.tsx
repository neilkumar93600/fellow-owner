import styles from '@/components/auth/auth.module.css';
import { AuthFooter } from '@/components/auth/auth-footer';
import { AuthPanel } from '@/components/auth/auth-panel';
import { SplitShell } from '@/components/layout/split-shell';

/**
 * Sign in, sign up, code and password screens share one frame: the form on white on the left, the grey
 * shell with real product moments on the right. From 768px to 1023px the panel sits under the form, as
 * on onboarding. On phones it steps aside so the form is the only thing on screen (fans arrive inside
 * in-app browsers on small phones); `styles.shell` does that, since SplitShell's own switch is at 1024px.
 *
 * The form starts at a fixed height instead of being centred, so an error or alert that appears only
 * grows the page downward and never moves the field or button that was just pressed. The offset puts
 * the sign in form about where centring would; under 1024px wide (panel stacked) it starts at the top.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <SplitShell aside={<AuthPanel />} footer={<AuthFooter />} className={styles.shell}>
      <div className="flex flex-1 flex-col pt-[clamp(0px,calc(50svh_-_368px),200px)] md:max-lg:pt-0">
        {children}
      </div>
    </SplitShell>
  );
}
