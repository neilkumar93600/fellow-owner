'use client';

import type { StudioSpace } from '@fellow-owners/shared';
import { AlertCircle } from 'lucide-react';
import { AccountCards } from '@/components/dashboard/settings/account-cards';
import { BioLinkCard } from '@/components/dashboard/settings/bio-link-card';
import { ImportAudienceCard } from '@/components/dashboard/settings/import-audience-card';
import { ProfileForm } from '@/components/dashboard/settings/profile-form';
import { TasteProfileForm } from '@/components/dashboard/settings/taste-profile-form';
import { TabBar } from '@/components/shared/tab-bar';
import { useStudioSpace } from '@/hooks/use-space';

interface SettingsClientProps {
  space: StudioSpace;
  current: string;
  tabs: Array<{ href: string; label: string; active: boolean }>;
}

export function SettingsClient({ space: initialSpace, current, tabs }: SettingsClientProps) {
  const { data: space, isPending, error } = useStudioSpace(initialSpace);

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="sr-only">Settings</h1>
        <TabBar label="Settings" tabs={tabs} />
        <div className="flex items-start gap-3 rounded-xl bg-danger-bg px-4 py-3 text-body text-danger-ink">
          <AlertCircle aria-hidden="true" strokeWidth={1.5} className="mt-px size-5 shrink-0" />
          <div>
            <p>Could not load settings. Try refreshing the page.</p>
            {error instanceof Error ? (
              <p className="mt-1 text-small text-danger-ink">{error.message}</p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (!space) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="sr-only">Settings</h1>
        <TabBar label="Settings" tabs={tabs} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="sr-only">Settings</h1>
      <TabBar label="Settings" tabs={tabs} />
      {current === 'profile' ? <ProfileForm space={space} isPending={isPending} /> : null}
      {current === 'taste' ? <TasteProfileForm space={space} isPending={isPending} /> : null}
      {current === 'bio-link' ? <BioLinkCard space={space} /> : null}
      {current === 'import' ? <ImportAudienceCard /> : null}
      {current === 'account' ? <AccountCards /> : null}
    </div>
  );
}
