import type * as React from 'react';
import { FanShell } from '@/components/layout/fan-shell';

// The creator's public pages (bio link, join, showcase): the fan shell without the member top bar.
export default function PublicSpaceLayout({ children }: { children: React.ReactNode }) {
  return <FanShell>{children}</FanShell>;
}
