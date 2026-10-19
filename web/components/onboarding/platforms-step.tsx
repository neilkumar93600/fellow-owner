'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { PlatformConnect } from '@/components/shared/platform-connect';
import { FieldError, Spinner } from './onboarding-fields';
import type { OnboardingValues } from './onboarding-templates';
import { ImportedProfile, type PlatformImport } from './platform-import';

/** The first message anywhere in an RHF error tree (the list, or one entry's url or followers). */
function firstMessage(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const e = error as { message?: unknown };
  if (typeof e.message === 'string' && e.message) return e.message;
  for (const child of Object.values(error)) {
    const found = child && typeof child === 'object' ? firstMessage(child) : undefined;
    if (found) return found;
  }
  return undefined;
}

/**
 * Step 2, "Where your audience is": platform cards that fetch themselves, one link at a time. The
 * stepper keeps this step mounted (hidden on the others) so lookups finish while the creator moves on.
 */
export function PlatformsStep({ imp, active }: { imp: PlatformImport; active: boolean }) {
  const {
    control,
    setValue,
    formState: { errors },
  } = useFormContext<OnboardingValues>();
  const platforms = useWatch({ control, name: 'platforms' }) ?? [];
  const problem = firstMessage(errors.platforms);

  return (
    <div className="flex flex-col gap-5">
      <PlatformConnect
        value={platforms}
        onChange={(next) =>
          setValue('platforms', next, {
            shouldDirty: true,
            shouldValidate: Boolean(problem),
          })
        }
        onFetched={imp.addProfile}
        profiles={imp.state.profiles}
      />
      <FieldError id="ob-platforms-error" message={problem} />
      {active && imp.state.suggesting && !imp.prefilled ? (
        <p className="flex items-center gap-2 text-small text-ink-muted">
          <Spinner className="size-3.5" />
          Reading your recent posts
        </p>
      ) : null}
      {active && imp.prefilled ? <ImportedProfile imp={imp} /> : null}
    </div>
  );
}
