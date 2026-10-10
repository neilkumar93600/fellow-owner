'use client';

import {
  COMMUNITY_ICONS,
  type CommunityIcon,
  createCommunitySchema,
  LIMITS,
  type StudioCommunity,
} from '@fellow-owners/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Archive, ArchiveRestore, Check } from 'lucide-react';
import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { CommunityChip } from '@/components/shared/community-chip';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ImageUpload } from '@/components/shared/image-upload';
import { SidePanel } from '@/components/shared/side-panel';
import { type CardTint, COMMUNITY_ICON, cardTint, TINT_STYLES } from '@/components/shared/tint';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { Field, TextArea, TextField } from '@/components/ui/field';

const C = LIMITS.community;

/** The API's create rules; the slug comes from the name. */
const formSchema = createCommunitySchema.omit({ slug: true });
type FormInput = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;

export type CommunityValues = Pick<
  StudioCommunity,
  'name' | 'description' | 'tint' | 'icon' | 'coverUrl'
>;

/** Lime is retired, so it is not offered. */
const TINT_OPTIONS: readonly { value: CardTint; label: string }[] = [
  { value: 'peach', label: 'Apricot' },
  { value: 'lavender', label: 'Lavender' },
  { value: 'aqua', label: 'Aqua' },
  { value: 'white', label: 'White' },
];

const ICON_LABELS: Record<CommunityIcon, string> = {
  users: 'People',
  'code-2': 'Code',
  'pen-tool': 'Pen',
  'line-chart': 'Chart',
  music: 'Music',
  dumbbell: 'Dumbbell',
  leaf: 'Leaf',
  camera: 'Camera',
  'gamepad-2': 'Game controller',
  'book-open': 'Book',
  rocket: 'Rocket',
  heart: 'Heart',
  globe: 'Globe',
  mic: 'Microphone',
  palette: 'Palette',
  utensils: 'Fork and knife',
  wallet: 'Wallet',
  backpack: 'Backpack',
  car: 'Car',
  sunrise: 'Sunrise',
};

const RADIO_FOCUS =
  'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink';

function CommunityForm({
  id,
  community,
  defaultTint,
  onSubmit,
}: {
  id: string;
  community: StudioCommunity | null;
  defaultTint: CardTint;
  onSubmit: (values: CommunityValues) => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: community?.name ?? '',
      description: community?.description ?? '',
      tint: community ? cardTint(community.tint) : defaultTint,
      icon: community?.icon ?? 'users',
      coverUrl: community?.coverUrl ?? null,
    },
  });
  const [name = '', description = '', tint, icon, coverUrl] = watch([
    'name',
    'description',
    'tint',
    'icon',
    'coverUrl',
  ]);

  return (
    <form
      id={id}
      noValidate
      aria-label={community ? `Edit ${community.name}` : 'Add community'}
      onSubmit={handleSubmit((values) =>
        onSubmit({
          name: values.name,
          description: values.description || null,
          tint: values.tint,
          icon: values.icon,
          coverUrl: values.coverUrl ?? null,
        }),
      )}
      className="flex flex-col gap-6"
    >
      <Field
        label="Name"
        error={errors.name?.message}
        count={{ value: name.length, max: C.name.max }}
      >
        <TextField {...register('name')} autoComplete="off" placeholder="Writers Room" />
      </Field>

      <Field
        label="Description"
        optional
        helper="One line for the community page and your bio link."
        error={errors.description?.message}
        count={{ value: description.length, max: C.description.max }}
      >
        <TextArea {...register('description')} rows={3} />
      </Field>

      {community ? (
        <ImageUpload
          kind="community_cover"
          communityId={community.id}
          label="Cover image"
          value={coverUrl ?? null}
          onChange={(url) => setValue('coverUrl', url, { shouldDirty: true })}
        />
      ) : (
        <p className="text-small text-ink-muted">
          Create the community first, then add a cover image from its edit panel.
        </p>
      )}

      <fieldset>
        <legend className="text-small-strong text-ink">Color</legend>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {TINT_OPTIONS.map((option) => {
            const selected = option.value === tint;
            return (
              <label
                key={option.value}
                className={cn(
                  'press flex h-11 cursor-pointer items-center gap-2 rounded-full border-2 bg-white py-1 pr-4 pl-1 text-body text-ink select-none',
                  RADIO_FOCUS,
                  selected ? 'border-ink' : 'border-line hover:bg-white/70',
                )}
              >
                <input
                  type="radio"
                  value={option.value}
                  className="sr-only"
                  {...register('tint')}
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-8 place-items-center rounded-full border border-line',
                    TINT_STYLES[option.value].card,
                  )}
                >
                  {selected ? <Check strokeWidth={2} className="size-4 text-ink" /> : null}
                </span>
                {option.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-small-strong text-ink">Icon</legend>
        <div className="mt-1.5 grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-2">
          {COMMUNITY_ICONS.map((option) => {
            const Icon = COMMUNITY_ICON[option];
            const selected = option === icon;
            return (
              <label
                key={option}
                className={cn(
                  'press grid h-11 cursor-pointer place-items-center rounded-md border',
                  RADIO_FOCUS,
                  selected
                    ? 'border-ink bg-ink text-white'
                    : 'border-line bg-white text-ink hover:bg-white/70',
                )}
              >
                <input type="radio" value={option} className="sr-only" {...register('icon')} />
                <Icon aria-hidden="true" strokeWidth={1.5} className="size-5" />
                <span className="sr-only">{ICON_LABELS[option]}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <p className="text-small-strong text-ink">Preview</p>
        <div className="flex min-h-11 items-center">
          <CommunityChip name={name.trim() || 'New community'} tint={tint} icon={icon} />
        </div>
      </div>
    </form>
  );
}

export interface CommunityPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The community to edit; null adds one. */
  community: StudioCommunity | null;
  /** A new community's first tint: the next in the apricot, lavender, aqua, white rotation. */
  defaultTint?: CardTint;
  onSave: (values: CommunityValues) => void;
  /** Edit only: Archive community, confirmed in a dialog. */
  onArchive?: () => void;
  /** Edit only, for an archived community: Restore community, in place of Archive. */
  onRestore?: () => void;
}

/**
 * Add or edit a community in the side panel: name and description (with counts), the tint as swatches,
 * the icon as a radio grid and a live preview chip, validated with the API's own schema. The footer
 * holds the screen's one coral action (Create or Save community) and, when editing, Archive.
 */
export function CommunityPanel({
  open,
  onOpenChange,
  community,
  defaultTint = 'peach',
  onSave,
  onArchive,
  onRestore,
}: CommunityPanelProps) {
  const formId = useId();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <SidePanel
        open={open}
        onOpenChange={onOpenChange}
        title={community ? `Edit ${community.name}` : 'Add community'}
        footer={
          <>
            {community?.archivedAt && onRestore ? (
              <Button
                variant="secondary"
                icon={<ArchiveRestore />}
                onClick={() => {
                  onRestore();
                  onOpenChange(false);
                }}
              >
                Restore community
              </Button>
            ) : community && onArchive ? (
              <Button variant="destructive" icon={<Archive />} onClick={() => setConfirmOpen(true)}>
                Archive community
              </Button>
            ) : null}
            <Button type="submit" form={formId} className="flex-1">
              {community ? 'Save community' : 'Create community'}
            </Button>
          </>
        }
      >
        <CommunityForm
          key={community?.id ?? 'new'}
          id={formId}
          community={community}
          defaultTint={defaultTint}
          onSubmit={(values) => {
            onSave(values);
            onOpenChange(false);
          }}
        />
      </SidePanel>

      {community && !community.archivedAt && onArchive ? (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={`Archive ${community.name}?`}
          body="Fans keep their posts, but nobody new can join and it leaves your bio link. You can restore it later."
          confirmLabel="Archive community"
          onConfirm={() => {
            onArchive();
            onOpenChange(false);
          }}
        />
      ) : null}
    </>
  );
}
