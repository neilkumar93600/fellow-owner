'use client';

import {
  type JoinResponse,
  joinSpaceSchema,
  LIMITS,
  type PublicCommunity,
  suggestCommunitiesSchema,
} from '@fellow-owners/shared';
import type * as React from 'react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, TextArea } from '@/components/ui/field';
import { useJoinSpace, useSuggestCommunities } from '@/hooks/queries/use-join';
import { pluralize } from '@/lib/format';
import { errorMessage } from '@/lib/toast';
import { CommunityPicker } from './community-picker';

/** Shared with the stepper's welcome line: "Solo Travelers and Food Finds". */
export const listFormat = new Intl.ListFormat('en', { type: 'conjunction' });

export interface IntroStepProps {
  handle: string;
  communities: PublicCommunity[];
  intro: string;
  onIntroChange: (intro: string) => void;
  selected: string[];
  onSelectedChange: React.Dispatch<React.SetStateAction<string[]>>;
  /** Runs once the membership exists. */
  onJoined: (result: JoinResponse) => void;
}

/**
 * Join step 2: the intro (280 characters, "One line about you"), "Suggest rooms" (also on blur once the
 * intro is 10 characters), the selectable tiles, and the step's one coral "Join N rooms", disabled with
 * its reason beside it until at least one room is picked.
 */
export function IntroStep({
  handle,
  communities,
  intro,
  onIntroChange,
  selected,
  onSelectedChange,
  onJoined,
}: IntroStepProps) {
  const [reasons, setReasons] = useState<Record<string, string> | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const suggestion = useSuggestCommunities(handle);
  const joinSpace = useJoinSpace(handle);
  const suggestedFor = useRef<string | null>(null);

  const canSuggest = suggestCommunitiesSchema.safeParse({ intro }).success;
  const introMax = LIMITS.membership.intro.max;
  const tooLong = intro.length > introMax;
  const blocker =
    selected.length === 0
      ? 'Pick at least one room'
      : tooLong
        ? `Shorten your intro to ${introMax} characters`
        : null;

  function suggest() {
    const parsed = suggestCommunitiesSchema.safeParse({ intro });
    if (!parsed.success || suggestedFor.current === parsed.data.intro) return;
    suggestedFor.current = parsed.data.intro;
    setUnavailable(false);
    suggestion.mutate(parsed.data, {
      onSuccess: ({ available, suggestions }) => {
        if (!available) {
          setUnavailable(true);
          setReasons(null);
          return;
        }
        const picks = Object.fromEntries(
          suggestions.map((s) => [s.communityId, 'Matches what you wrote']),
        );
        setReasons(picks);
        onSelectedChange((current) => [...new Set([...current, ...Object.keys(picks)])]);
      },
      // Rate limited or down: every community stays unselected and the fan picks by hand.
      onError: () => {
        suggestedFor.current = null;
        setUnavailable(true);
        setReasons(null);
      },
    });
  }

  function join() {
    const parsed = joinSpaceSchema.safeParse({
      intro: intro.trim() || undefined,
      communityIds: selected,
    });
    if (!parsed.success || blocker) return;
    joinSpace.mutate(parsed.data, { onSuccess: onJoined });
  }

  const suggestedNames = reasons ? communities.filter((c) => reasons[c.id]).map((c) => c.name) : [];
  const count = selected.length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Field
          label="Your intro"
          optional
          helper="One line about you"
          count={{ value: intro.length, max: introMax }}
        >
          <TextArea
            value={intro}
            onChange={(event) => onIntroChange(event.target.value)}
            onBlur={suggest}
            rows={3}
            placeholder="Solo traveler from Austin. I want to eat my way through Lisbon on a budget."
          />
        </Field>
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
          <Button
            variant="secondary"
            loading={suggestion.isPending}
            disabled={!canSuggest}
            aria-describedby="join-suggest-status"
            onClick={() => {
              suggestedFor.current = null;
              suggest();
            }}
          >
            Suggest rooms
          </Button>
          <p id="join-suggest-status" aria-live="polite" className="text-small text-ink-soft">
            {!canSuggest
              ? `Write ${LIMITS.membership.introMinForSuggestions} characters or more for suggestions`
              : unavailable
                ? 'Suggestions unavailable. Pick the rooms that fit you.'
                : reasons === null
                  ? null
                  : suggestedNames.length > 0
                    ? `Suggested ${listFormat.format(suggestedNames)} from your intro. Change them if you like.`
                    : 'No close matches in your intro. Pick the ones that fit you.'}
          </p>
        </div>
      </div>

      <CommunityPicker
        communities={communities}
        selected={selected}
        reasons={reasons ?? {}}
        onChange={(id, on) =>
          onSelectedChange((current) =>
            on ? [...current, id] : current.filter((value) => value !== id),
          )
        }
      />

      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-4">
        <Button
          loading={joinSpace.isPending}
          disabled={blocker !== null}
          aria-describedby={blocker ? 'join-blocker' : undefined}
          onClick={join}
        >
          {count === 0 ? 'Join rooms' : `Join ${count} ${pluralize(count, 'room')}`}
        </Button>
        {joinSpace.isError ? (
          <p role="alert" className="text-small text-danger-deep">
            {errorMessage(joinSpace.error)} Press Join again to retry.
          </p>
        ) : null}
        {blocker ? (
          <p id="join-blocker" className="text-small text-ink-soft">
            {blocker}
          </p>
        ) : null}
      </div>
    </div>
  );
}
