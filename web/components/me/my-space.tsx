'use client';

import {
  LIMITS,
  type LinkInput,
  type MySpace,
  type OwnMembership,
  type PublicCommunity,
  type UpdateMembershipInput,
  updateMembershipSchema,
} from '@fellow-owners/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { ExternalLink, Pencil } from 'lucide-react';
import { useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';
import { ChipsInput, LinksField } from '@/components/post/form-parts';
import { AvatarInitials } from '@/components/shared/avatar-initials';
import { CommunityChip } from '@/components/shared/community-chip';
import { TabBar } from '@/components/shared/tab-bar';
import { Button } from '@/components/ui/button';
import { Field, TextArea } from '@/components/ui/field';
import { useUpdateMe } from '@/hooks/queries/use-me';
import { formatDate } from '@/lib/format';
import { routes, withQuery } from '@/lib/routes';
import { toastSuccess } from '@/lib/toast';
import { MyPitches } from './my-pitches';
import { MyPosts } from './my-posts';
import { MyTeams } from './my-teams';
import { YourMoments } from './your-moments';

export type MySpaceTab = 'posts' | 'teams' | 'pitches';

const TABS: { value: MySpaceTab; label: string }[] = [
  { value: 'posts', label: 'My posts' },
  { value: 'teams', label: 'My crews' },
  { value: 'pitches', label: 'Ideas I sent' },
];

const skillSchema = z
  .string()
  .trim()
  .min(1, 'Write a skill')
  .max(LIMITS.membership.skills.itemMax, `Up to ${LIMITS.membership.skills.itemMax} characters`);

type Profile = { intro: string; skills: string[]; links: LinkInput[] };

export interface MySpaceViewProps {
  handle: string;
  data: MySpace;
  /** From ?tab= (My posts when absent). */
  tab: MySpaceTab;
}

/**
 * /{handle}/me: the fan's profile card (Edit opens it inline, with Save as the screen's one coral), then
 * "Your moments" (loved, featured, spotlighted, shortlisted), then My posts, My crews and Ideas I sent as
 * URL tabs.
 */
export function MySpaceView({ handle, data, tab }: MySpaceViewProps) {
  const creator = data.space.displayName.split(' ')[0] ?? data.space.displayName;
  const tabs = TABS.map(({ value, label }) => ({
    href: withQuery(routes.fan.me(handle), { tab: value }, { tab: 'posts' }),
    label,
    active: value === tab,
  }));
  const current = TABS.find((item) => item.value === tab)?.label;

  return (
    <div className="flex flex-col gap-6">
      <ProfileCard handle={handle} membership={data.membership} communities={data.communities} />
      <YourMoments handle={handle} />
      <TabBar label="My space" tabs={tabs} />
      <section aria-labelledby="my-space-tab">
        <h2 id="my-space-tab" className="sr-only">
          {current}
        </h2>
        {tab === 'posts' ? <MyPosts handle={handle} creator={creator} posts={data.posts} /> : null}
        {tab === 'teams' ? <MyTeams handle={handle} teams={data.teams} /> : null}
        {tab === 'pitches' ? (
          <MyPitches
            handle={handle}
            creatorName={creator}
            pitches={data.pitches}
            pitchesLeftToday={data.caps.pitchesLeftToday}
            showReadReceipts={data.space.showReadReceipts ?? true}
          />
        ) : null}
      </section>
    </div>
  );
}

function ProfileCard({
  handle,
  membership,
  communities,
}: {
  handle: string;
  membership: OwnMembership;
  communities: PublicCommunity[];
}) {
  const [profile, setProfile] = useState<Profile>({
    intro: membership.intro ?? '',
    skills: membership.skills,
    links: membership.links,
  });
  const [editing, setEditing] = useState(false);
  const editRef = useRef<HTMLButtonElement>(null);
  const updateMutation = useUpdateMe(handle);

  function close(saved?: Profile) {
    if (saved) {
      setProfile(saved);
      toastSuccess('Profile saved');
    }
    setEditing(false);
    requestAnimationFrame(() => editRef.current?.focus());
  }

  return (
    <section aria-labelledby="profile-name" className="min-w-0 glass-strong p-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-4">
        <AvatarInitials name={membership.name} size={48} />
        <div className="min-w-0 flex-1">
          <h1 id="profile-name" className="text-h1 text-ink">
            {membership.name}
          </h1>
          {membership.headline ? (
            <p className="text-body text-ink-soft">{membership.headline}</p>
          ) : null}
        </div>
        {editing ? null : (
          <Button
            ref={editRef}
            variant="secondary"
            icon={<Pencil />}
            // Phones: a 44px circle with the pencil, so the name keeps its line.
            className="h-11 max-sm:w-11 max-sm:px-0"
            onClick={() => setEditing(true)}
          >
            <span className="max-sm:sr-only">Edit</span>
            <span className="sr-only"> profile</span>
          </Button>
        )}
      </div>

      {editing ? (
        <ProfileForm initial={profile} onDone={close} mutation={updateMutation} />
      ) : (
        <>
          <p className="mt-5 max-w-[68ch] text-body text-ink">
            {profile.intro ||
              'Add a line about where you are from and what you love, so people know who you are.'}
          </p>
          {profile.skills.length ? (
            <ul aria-label="Skills" className="mt-4 flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <li
                  key={skill}
                  className="inline-flex h-7 items-center rounded-full bg-white/70 px-3 text-caption text-ink"
                >
                  {skill}
                </li>
              ))}
            </ul>
          ) : null}
          {profile.links.length ? (
            <ul aria-label="Links" className="mt-4 flex flex-wrap gap-x-4">
              {profile.links.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 items-center gap-1.5 text-label text-ink underline-offset-4 hover:underline"
                  >
                    <ExternalLink aria-hidden="true" strokeWidth={1.5} className="size-4" />
                    {link.label}
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink/10 pt-4">
            <p className="mr-1 text-small text-ink-soft">
              Fan since{' '}
              <time dateTime={membership.joinedAt} suppressHydrationWarning>
                {formatDate(membership.joinedAt)}
              </time>
              , in
            </p>
            {communities.map((community) => (
              <CommunityChip
                key={community.id}
                name={community.name}
                tint={community.tint}
                icon={community.icon}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

/** Intro, skills and links, checked by the shared updateMembershipSchema. */
function ProfileForm({
  initial,
  onDone,
  mutation,
}: {
  initial: Profile;
  onDone: (saved?: Profile) => void;
  mutation: ReturnType<typeof useUpdateMe>;
}) {
  const form = useForm<UpdateMembershipInput, unknown, z.output<typeof updateMembershipSchema>>({
    resolver: zodResolver(updateMembershipSchema),
    defaultValues: initial,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });
  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitted },
  } = form;

  return (
    <FormProvider {...form}>
      <form
        noValidate
        aria-label="Edit profile"
        onSubmit={handleSubmit((saved) => {
          mutation.mutate(saved, {
            onSuccess: () => {
              onDone({
                intro: saved.intro ?? '',
                skills: saved.skills ?? [],
                links: saved.links ?? [],
              });
            },
          });
        })}
        className="mt-6 flex flex-col gap-6"
      >
        <Field
          label="Intro"
          optional
          helper="Where you are from and what you would happily help with."
          count={{ value: (watch('intro') ?? '').length, max: LIMITS.membership.intro.max }}
          error={errors.intro?.message}
        >
          <TextArea {...register('intro')} rows={3} autoFocus />
        </Field>
        <ChipsInput
          label="Skills"
          optional
          values={watch('skills') ?? []}
          onChange={(next) => setValue('skills', next, { shouldValidate: isSubmitted })}
          max={LIMITS.membership.skills.max}
          itemSchema={skillSchema}
          addLabel="Add skill"
          placeholder="street food"
          error={errors.skills?.message}
        />
        <LinksField max={LIMITS.membership.links.max} />
        <div className="flex flex-col gap-3 border-t border-ink/10 pt-6 sm:flex-row">
          <Button type="submit">Save</Button>
          <Button variant="secondary" onClick={() => onDone()}>
            Cancel
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
