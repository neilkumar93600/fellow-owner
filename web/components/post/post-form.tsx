'use client';

import {
  type CreatePostInput,
  createPostSchema,
  DAILY_CAPS,
  LIMITS,
  POST_TYPE_LABELS,
  POST_TYPES,
  type PostType,
  type PublicCommunity,
  roleSchema,
} from '@fellow-owners/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useId } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { CoachPanel } from '@/components/shared/coach-panel';
import { Button } from '@/components/ui/button';
import { Field, NativeSelect, TextArea, TextField } from '@/components/ui/field';
import { useCreatePost } from '@/hooks/queries/use-post';
import { formatNumber, pluralize } from '@/lib/format';
import { routes } from '@/lib/routes';
import { toastSuccess } from '@/lib/toast';
import { ChipsInput, ChoicePills, LinksField } from './form-parts';

const TYPE_OPTIONS = POST_TYPES.map((value) => ({ value, label: POST_TYPE_LABELS[value] }));

const TYPE_HELP: Record<PostType, string> = {
  idea: "Something you'd love to see happen. Fans can say they'd use it or count themselves in.",
  project: "You're making it. List the open spots and fans can ask to join your crew.",
  discussion: 'A question or a thought to talk through with the community.',
};

export interface PostFormProps {
  handle: string;
  /** The communities the viewer belongs to; a post goes to one of them. */
  communities: PublicCommunity[];
  defaultCommunityId?: string;
  defaultType?: PostType;
  /** MySpace.caps.postsLeftToday */
  postsLeftToday: number;
  /** Idea Coach (F30). Omitted, there is no coach panel. `creatorName` is the creator's first name, for the privacy note. */
  coach?: { creatorName: string };
}

/**
 * New post: a strong-glass form card checked by the shared createPostSchema. Open spots show for fan projects only.
 * Publish is the screen's one coral action: it posts, confirms with a toast and opens the new post. A
 * failure toasts and the form keeps what was typed.
 */
export function PostForm({
  handle,
  communities,
  defaultCommunityId,
  defaultType = 'idea',
  postsLeftToday,
  coach,
}: PostFormProps) {
  const router = useRouter();
  const create = useCreatePost(handle);
  const capId = useId();
  const form = useForm({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      communityId: defaultCommunityId ?? communities[0]?.id ?? '',
      type: defaultType,
      title: '',
      body: '',
      rolesNeeded: [],
      links: [],
    } satisfies CreatePostInput,
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
  const type = watch('type');
  const roles = watch('rolesNeeded');
  const capped = postsLeftToday <= 0;

  // Only fan projects have a crew, so only they list open spots.
  useEffect(() => {
    if (type !== 'project') setValue('rolesNeeded', []);
  }, [type, setValue]);

  const onSubmit = handleSubmit((post) =>
    create.mutate(post, {
      onSuccess: (created) => {
        toastSuccess(`Posted to ${created.community.name}`);
        router.push(routes.fan.post(handle, created.id));
      },
    }),
  );

  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={onSubmit}
        aria-label="New post"
        className="flex flex-col gap-6 glass-strong p-6 sm:p-8"
      >
        <ChoicePills
          legend="Type"
          look="segmented"
          options={TYPE_OPTIONS}
          value={type}
          input={register('type')}
          error={errors.type?.message}
          helper={<p className="mt-1.5 text-small text-ink-soft">{TYPE_HELP[type]}</p>}
        />

        <Field label="Community" error={errors.communityId?.message}>
          <NativeSelect {...register('communityId')}>
            {communities.map((community) => (
              <option key={community.id} value={community.id}>
                {community.name}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field
          label="Title"
          helper="One line that says what it is."
          count={{ value: watch('title').length, max: LIMITS.post.title.max }}
          error={errors.title?.message}
        >
          <TextField {...register('title')} placeholder="A $60-a-day guide to Lisbon" />
        </Field>

        <Field
          label="Details"
          helper="What it is, who it's for, and what would help."
          count={{ value: watch('body').length, max: LIMITS.post.body.max }}
          error={errors.body?.message}
        >
          <TextArea {...register('body')} rows={8} />
        </Field>

        {coach && type !== 'discussion' ? (
          <CoachPanel
            handle={handle}
            kind="post"
            creatorName={coach.creatorName}
            draft={{ subject: watch('title'), body: watch('body') }}
            onReplace={({ subject, body }) => {
              setValue('title', subject, { shouldDirty: true });
              setValue('body', body, { shouldDirty: true });
            }}
          />
        ) : null}

        {type === 'project' ? (
          <ChipsInput
            label="Open spots"
            optional
            values={roles}
            onChange={(next) => setValue('rolesNeeded', next, { shouldValidate: isSubmitted })}
            max={LIMITS.post.rolesNeeded.max}
            itemSchema={roleSchema}
            addLabel="Add spot"
            placeholder="Local guide"
            error={errors.rolesNeeded?.message}
          />
        ) : null}

        <LinksField max={LIMITS.post.links.max} />

        <div className="flex flex-col-reverse gap-3 border-t border-ink/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p id={capId} className="text-small text-ink-soft">
            {capped ? (
              `You've reached today's limit of ${DAILY_CAPS.posts} posts. Try again tomorrow.`
            ) : (
              <>
                <span className="tabular-nums">{formatNumber(postsLeftToday)}</span>{' '}
                {pluralize(postsLeftToday, 'post')} left today
              </>
            )}
          </p>
          <Button
            type="submit"
            disabled={capped}
            loading={create.isPending}
            aria-describedby={capId}
            className="max-sm:w-full"
          >
            Publish
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
