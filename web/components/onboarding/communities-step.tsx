'use client';

import {
  type CommunityIcon,
  LIMITS,
  onboardingCommunitySchema,
  TINTS,
  type Tint,
} from '@fellow-owners/shared';
import { Check, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import styles from './onboarding.module.css';
import {
  CharCount,
  cx,
  errorMessage,
  FieldError,
  FieldLabel,
  inputClass,
  textareaClass,
} from './onboarding-fields';
import {
  COMMUNITY_ICON_COMPONENTS,
  COMMUNITY_ICON_LABELS,
  COMMUNITY_PRESETS,
  COMMUNITY_TEMPLATES,
  type CommunityDraft,
  communityFromTemplate,
  DEFAULT_PRESET,
  ICON_OPTIONS,
  type OnboardingValues,
  TINT_LABELS,
  TINT_STYLES,
} from './onboarding-templates';
import { ImportedNote, type PlatformImport } from './platform-import';

const MAX = LIMITS.community.perSpace.max;
export const FIRST_TILE_ID = 'ob-template-0';

type EditorTarget = { mode: 'create' } | { mode: 'edit'; index: number };

export interface EditorPreview {
  draft: CommunityDraft;
  /** Index being edited, or null for a new community. */
  index: number | null;
}

/** A suggested group as the form holds it: tied to a template tile when the name matches one. */
interface SuggestedGroup {
  id: string;
  draft: CommunityDraft;
  demand: string | null;
}

function suggestedGroups(imp: PlatformImport): SuggestedGroup[] {
  return (imp.offered?.communities ?? []).map((c) => {
    const name = c.name.trim().slice(0, LIMITS.community.name.max);
    const template = COMMUNITY_TEMPLATES.find((t) => t.name.toLowerCase() === name.toLowerCase());
    const id =
      template?.id ??
      `suggested:${name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')}`;
    return {
      id,
      demand: c.demand?.label ?? null,
      draft: {
        name,
        description: c.description.trim().slice(0, LIMITS.community.description.max) || undefined,
        tint: c.tint,
        icon: c.icon,
        templateId: id,
      },
    };
  });
}

export function CommunitiesStep({
  onEditorPreview,
  imp,
}: {
  onEditorPreview: (preview: EditorPreview | null) => void;
  imp: PlatformImport;
}) {
  const {
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useFormContext<OnboardingValues>();
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'communities',
  });
  const communities = useWatch({ control, name: 'communities' }) ?? [];
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const returnFocusTo = useRef<string | null>(null);
  const listError = errorMessage(errors.communities);
  const atMax = communities.length >= MAX;

  const [presetId, setPresetId] = useState(DEFAULT_PRESET);
  const preset = COMMUNITY_PRESETS.find((p) => p.id === presetId) ?? COMMUNITY_PRESETS[0];
  const shown = preset?.templates ?? [];

  const templateIndex = (id: string) => communities.findIndex((c) => c.templateId === id);
  const suggested = suggestedGroups(imp);
  // Picks from another preset stay in the list as editable tiles, so switching presets never hides a choice.
  const custom = communities
    .map((c, index) => ({ c, index, key: fields[index]?.id ?? String(index) }))
    .filter(
      ({ c }) =>
        !c.templateId ||
        (!shown.some((t) => t.id === c.templateId) &&
          !suggested.some((g) => g.id === c.templateId)),
    );

  // Suggested groups start selected, once, when the person has not picked any communities yet.
  const { markApplied } = imp;
  const applied = imp.state.applied.communities;
  const offeredGroups = imp.offered?.communities;
  // biome-ignore lint/correctness/useExhaustiveDependencies: `offeredGroups` is the trigger; `suggested` derives from it.
  useEffect(() => {
    if (!offeredGroups || applied) return;
    if (getValues('communities').length === 0 && suggested.length > 0) {
      setValue(
        'communities',
        suggested.slice(0, MAX).map((g) => g.draft),
        { shouldDirty: true },
      );
    }
    markApplied('communities');
  }, [offeredGroups, applied, getValues, setValue, markApplied]);

  function toggleSuggested(group: SuggestedGroup) {
    const index = templateIndex(group.id);
    if (index >= 0) remove(index);
    else if (!atMax) append(group.draft, { shouldFocus: false });
  }

  // Clear the preview's editing card when the step unmounts.
  useEffect(() => () => onEditorPreview(null), [onEditorPreview]);

  function toggleTemplate(id: string) {
    const index = templateIndex(id);
    if (index >= 0) {
      remove(index);
      return;
    }
    const template = COMMUNITY_TEMPLATES.find((t) => t.id === id);
    if (template && !atMax) append(communityFromTemplate(template), { shouldFocus: false });
  }

  function openEditor(target: EditorTarget, triggerId: string) {
    returnFocusTo.current = triggerId;
    setEditor(target);
  }

  function closeEditor(focusId?: string) {
    setEditor(null);
    onEditorPreview(null);
    const id = focusId ?? returnFocusTo.current;
    if (id) requestAnimationFrame(() => document.getElementById(id)?.focus());
  }

  function save(draft: CommunityDraft) {
    if (!editor) return;
    if (editor.mode === 'create') {
      append(draft, { shouldFocus: false });
      // Focus lands on the new tile so the person sees where it went.
      closeEditor(`ob-custom-${communities.length}`);
    } else {
      update(editor.index, {
        ...draft,
        templateId: communities[editor.index]?.templateId,
      });
      closeEditor();
    }
  }

  function removeCommunity(index: number) {
    const removed = communities[index];
    if (!removed) return;
    remove(index);
    closeEditor('ob-add-community');
    toast(`Removed ${removed.name}`, {
      action: {
        label: 'Undo',
        onClick: () => {
          const now = getValues('communities');
          const at = Math.min(index, now.length);
          setValue('communities', [...now.slice(0, at), removed, ...now.slice(at)], {
            shouldDirty: true,
          });
        },
      },
    });
  }

  // While "add at least one" shows, every way to add a community points at it, and the first tile
  // (where focus lands) is marked invalid, so the reason is read with the control.
  const errorId = listError ? 'ob-communities-error' : null;
  const describe = (...ids: (string | null | false)[]) =>
    ids.filter(Boolean).join(' ') || undefined;

  return (
    <div className="@container flex flex-col gap-4">
      {/* The error sits under the group label, above the options, so it is in view of the first tile. */}
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="ob-templates-label" className="text-small font-medium text-ink">
            Pick communities or add your own
          </h2>
          <p className="tabular shrink-0 text-small text-ink-soft" aria-live="polite">
            {communities.length} selected
          </p>
        </div>
        <FieldError id="ob-communities-error" message={listError} />
      </div>

      {suggested.length > 0 ? (
        <fieldset aria-labelledby="ob-suggested-label" className="min-w-0">
          <h3
            id="ob-suggested-label"
            className="inline-flex items-center gap-1.5 text-small font-medium text-ink"
          >
            <Sparkles aria-hidden strokeWidth={1.5} className="size-4" />
            Suggested from your channels
          </h3>
          <ImportedNote sources={imp.sources} className="mt-1" />
          <ul className="mt-2.5 flex flex-col gap-2">
            {suggested.map((group) => {
              const index = templateIndex(group.id);
              const selected = index >= 0;
              const item = selected ? communities[index] : undefined;
              const name = item?.name ?? group.draft.name;
              const t = TINT_STYLES[item?.tint ?? group.draft.tint] ?? TINT_STYLES.white;
              const Icon =
                COMMUNITY_ICON_COMPONENTS[item?.icon ?? group.draft.icon] ??
                COMMUNITY_ICON_COMPONENTS.users;
              const inputId = `ob-suggested-${group.id.replace(/[^a-z0-9-]/g, '-')}`;
              const demandId = `${inputId}-demand`;
              return (
                <li key={group.id} className="relative">
                  <input
                    id={inputId}
                    type="checkbox"
                    checked={selected}
                    disabled={!selected && atMax}
                    onChange={() => toggleSuggested(group)}
                    aria-describedby={group.demand ? demandId : undefined}
                    className={styles.tileInput}
                  />
                  <label
                    htmlFor={inputId}
                    className={cx(
                      styles.press,
                      'flex cursor-pointer items-center gap-3 rounded-[20px] border-2 p-3 pr-14',
                      t.card,
                      selected ? 'border-ink' : 'border-line',
                      !selected && atMax && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <span
                      aria-hidden
                      className={cx(
                        'grid size-[22px] shrink-0 place-items-center rounded-full border-[1.5px]',
                        selected ? 'border-ink bg-ink text-card-strong' : 'border-(--line-field)',
                      )}
                    >
                      <Check
                        strokeWidth={2}
                        className={cx(
                          styles.check,
                          'size-3',
                          selected ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
                        )}
                      />
                    </span>
                    <span
                      className={cx(
                        'grid size-9 shrink-0 place-items-center rounded-[12px]',
                        t.tile,
                      )}
                    >
                      <Icon aria-hidden strokeWidth={1.5} className={cx('size-[18px]', t.icon)} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-body leading-5 font-medium text-ink">{name}</span>
                      {group.demand ? (
                        <span id={demandId} className="mt-0.5 block text-small text-ink-soft">
                          {group.demand}
                        </span>
                      ) : null}
                    </span>
                  </label>
                  {selected ? (
                    <button
                      id={`ob-edit-${inputId}`}
                      type="button"
                      onClick={() => openEditor({ mode: 'edit', index }, `ob-edit-${inputId}`)}
                      aria-label={`Edit ${name}`}
                      className={cx(
                        styles.press,
                        'absolute top-1/2 right-1.5 grid size-11 -translate-y-1/2 place-items-center rounded-full text-ink-soft hover:bg-card-strong/70 hover:text-ink',
                      )}
                    >
                      <Pencil aria-hidden strokeWidth={1.5} className="size-4" />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </fieldset>
      ) : null}
      {suggested.length > 0 ? (
        <p className="mt-1 text-small font-medium text-ink">Or start from a kind of creator</p>
      ) : null}

      <fieldset className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-0">
        <legend className="sr-only">Kind of creator</legend>
        {COMMUNITY_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={p.id === presetId}
            onClick={() => setPresetId(p.id)}
            className={cx(
              styles.press,
              'inline-flex h-11 items-center rounded-full border px-4 text-small font-medium text-ink sm:h-9',
              p.id === presetId
                ? 'border-ink bg-card-strong'
                : 'border-line bg-glass hover:border-ink-muted',
            )}
          >
            {p.label}
          </button>
        ))}
      </fieldset>

      <fieldset
        aria-labelledby="ob-templates-label"
        aria-describedby={errorId ?? undefined}
        className="min-w-0"
      >
        <ul className="grid grid-cols-2 gap-2.5 @lg:grid-cols-3">
          {shown.map((template, i) => {
            const index = templateIndex(template.id);
            const selected = index >= 0;
            const item = selected ? communities[index] : undefined;
            return (
              <li key={template.id} className="relative">
                <input
                  id={`ob-template-${i}`}
                  type="checkbox"
                  checked={selected}
                  disabled={!selected && atMax}
                  onChange={() => toggleTemplate(template.id)}
                  aria-invalid={i === 0 && errorId ? true : undefined}
                  aria-describedby={describe(atMax && !selected && 'ob-communities-max', errorId)}
                  className={styles.tileInput}
                />
                <label htmlFor={`ob-template-${i}`} className="block h-full rounded-[20px]">
                  <Tile
                    name={item?.name ?? template.name}
                    tint={item?.tint ?? template.tint}
                    icon={item?.icon ?? template.icon}
                    selected={selected}
                    disabled={!selected && atMax}
                  />
                </label>
                {selected ? (
                  <button
                    id={`ob-edit-${template.id}`}
                    type="button"
                    onClick={() => openEditor({ mode: 'edit', index }, `ob-edit-${template.id}`)}
                    aria-label={`Edit ${item?.name ?? template.name}`}
                    className={cx(
                      styles.press,
                      'absolute right-1 bottom-1 grid size-11 place-items-center rounded-full text-ink-soft hover:bg-card-strong/70 hover:text-ink sm:right-1.5 sm:bottom-1.5 sm:size-9',
                    )}
                  >
                    <Pencil aria-hidden strokeWidth={1.5} className="size-4" />
                  </button>
                ) : null}
              </li>
            );
          })}

          {custom.map(({ c, index, key }, n) => (
            <li key={key} className="relative">
              <button
                id={`ob-custom-${index}`}
                type="button"
                onClick={() => openEditor({ mode: 'edit', index }, `ob-custom-${index}`)}
                aria-label={`Edit ${c.name}`}
                aria-describedby={n === 0 ? 'ob-custom-hint' : undefined}
                className="block h-full w-full rounded-[20px] text-left"
              >
                <Tile name={c.name} tint={c.tint} icon={c.icon} selected custom />
              </button>
            </li>
          ))}

          <li>
            <button
              id="ob-add-community"
              type="button"
              disabled={atMax}
              aria-expanded={editor?.mode === 'create'}
              aria-controls={editor ? 'ob-community-editor' : undefined}
              aria-describedby={errorId ?? undefined}
              onClick={() => openEditor({ mode: 'create' }, 'ob-add-community')}
              className={cx(
                styles.press,
                'flex h-full min-h-[104px] w-full flex-col justify-between gap-3 rounded-[20px] border-2 border-dashed border-(--line-strong) bg-card-strong p-3 text-left hover:border-ink-muted hover:bg-card disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              <span className="grid size-9 place-items-center rounded-[12px] bg-table-head text-ink">
                <Plus aria-hidden strokeWidth={1.5} className="size-[18px]" />
              </span>
              <span className="text-body font-medium text-ink">Add your own</span>
            </button>
          </li>
        </ul>
      </fieldset>
      {custom.length > 0 ? (
        <p id="ob-custom-hint" className="sr-only">
          Custom community. Opens the editor.
        </p>
      ) : null}

      {atMax ? (
        <p id="ob-communities-max" className="text-small text-ink-muted">
          That’s the limit of {MAX} communities for now.
        </p>
      ) : null}

      {editor ? (
        <CommunityEditor
          key={editor.mode === 'edit' ? `edit-${editor.index}` : 'create'}
          initial={editor.mode === 'edit' ? communities[editor.index] : undefined}
          existingNames={communities
            .filter((_, i) => editor.mode !== 'edit' || i !== editor.index)
            .map((c) => c.name.trim().toLowerCase())}
          onChange={(draft) =>
            onEditorPreview({
              draft,
              index: editor.mode === 'edit' ? editor.index : null,
            })
          }
          onSave={save}
          onCancel={() => closeEditor()}
          onRemove={editor.mode === 'edit' ? () => removeCommunity(editor.index) : undefined}
        />
      ) : null}
    </div>
  );
}

function Tile({
  name,
  tint,
  icon,
  selected,
  custom = false,
  disabled = false,
}: {
  name: string;
  tint: Tint;
  icon: CommunityIcon;
  selected: boolean;
  custom?: boolean;
  disabled?: boolean;
}) {
  const Icon = COMMUNITY_ICON_COMPONENTS[icon];
  const t = TINT_STYLES[tint];
  return (
    <span
      className={cx(
        styles.press,
        'group flex h-full min-h-[104px] cursor-pointer flex-col justify-between gap-3 rounded-[20px] border-2 p-3',
        t.card,
        selected ? 'border-ink' : tint === 'white' ? 'border-line' : 'border-transparent',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <span className="flex items-start justify-between gap-2">
        <span className={cx('grid size-9 place-items-center rounded-[12px]', t.tile)}>
          <Icon aria-hidden strokeWidth={1.5} className={cx('size-[18px]', t.icon)} />
        </span>
        <span
          aria-hidden
          className={cx(
            'grid size-[22px] place-items-center rounded-full border-[1.5px]',
            selected ? 'border-ink bg-ink text-card-strong' : 'border-(--line-field)',
          )}
        >
          {custom ? (
            <Pencil strokeWidth={1.75} className="size-3" />
          ) : (
            <Check
              strokeWidth={2}
              className={cx(
                styles.check,
                'size-3',
                selected ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
              )}
            />
          )}
        </span>
      </span>
      <span
        className={cx(
          'pr-8 text-body leading-5 font-medium',
          selected ? 'text-ink' : 'text-ink-soft group-hover:text-ink',
        )}
      >
        {name}
      </span>
    </span>
  );
}

function CommunityEditor({
  initial,
  existingNames,
  onChange,
  onSave,
  onCancel,
  onRemove,
}: {
  initial?: CommunityDraft;
  existingNames: string[];
  onChange: (draft: CommunityDraft) => void;
  onSave: (draft: CommunityDraft) => void;
  onCancel: () => void;
  onRemove?: () => void;
}) {
  const uid = useId();
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [tint, setTint] = useState<Tint>(initial?.tint ?? 'lavender');
  const [icon, setIcon] = useState<CommunityIcon>(initial?.icon ?? 'users');
  const [errors, setErrors] = useState<{ name?: string; description?: string }>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const editing = Boolean(initial);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // The latest onChange, so the effect below runs only when the draft itself changes.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    onChangeRef.current({
      name: name.trim(),
      description: description.trim() || undefined,
      tint,
      icon,
    });
  }, [name, description, tint, icon]);

  function submit() {
    const parsed = onboardingCommunitySchema.safeParse({
      name,
      description: description.trim() || undefined,
      tint,
      icon,
    });
    const next: typeof errors = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if ((key === 'name' || key === 'description') && !next[key]) next[key] = issue.message;
      }
    } else if (existingNames.includes(parsed.data.name.toLowerCase())) {
      next.name = `You already have a community called ${parsed.data.name}`;
    }
    setErrors(next);
    if (next.name) {
      nameRef.current?.focus();
      return;
    }
    if (next.description || !parsed.success) return;
    onSave({
      ...parsed.data,
      description: parsed.data.description || undefined,
    });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') {
      e.preventDefault();
      submit();
    }
  }

  return (
    <section
      id="ob-community-editor"
      aria-labelledby={`${uid}-title`}
      onKeyDown={onKeyDown}
      className={cx(
        styles.stepEnter,
        '@container rounded-3xl border border-line bg-card p-4 sm:p-5',
      )}
    >
      <h3 id={`${uid}-title`} className="text-body font-medium text-ink">
        {editing ? `Edit ${initial?.name}` : 'New community'}
      </h3>

      <div className="mt-4 flex flex-col gap-4">
        <div>
          <FieldLabel htmlFor={`${uid}-name`}>Name</FieldLabel>
          <input
            ref={nameRef}
            id={`${uid}-name`}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((x) => ({ ...x, name: undefined }));
            }}
            type="text"
            autoComplete="off"
            maxLength={LIMITS.community.name.max + 10}
            placeholder="Gamers"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={`${uid}-name-error`}
            className={cx(inputClass, 'mt-1.5')}
          />
          <FieldError id={`${uid}-name-error`} message={errors.name} />
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-3">
            <FieldLabel htmlFor={`${uid}-desc`} optional>
              Description
            </FieldLabel>
            <CharCount
              id={`${uid}-desc-count`}
              value={description.length}
              max={LIMITS.community.description.max}
            />
          </div>
          <textarea
            id={`${uid}-desc`}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value.replace(/\n+/g, ' '));
              if (errors.description) setErrors((x) => ({ ...x, description: undefined }));
            }}
            rows={2}
            placeholder="Streams, mods and co-op nights."
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={`${uid}-desc-count ${uid}-desc-error`}
            className={cx(textareaClass, 'mt-1.5 min-h-[72px]')}
          />
          <FieldError id={`${uid}-desc-error`} message={errors.description} />
        </div>

        <fieldset>
          <legend className="text-small font-medium text-ink">Colour</legend>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {/* Lime is never a surface, so it is not offered. */}
            {TINTS.filter((t) => t !== 'lime').map((t) => (
              <span key={t} className="relative">
                <input
                  id={`${uid}-tint-${t}`}
                  type="radio"
                  name={`${uid}-tint`}
                  value={t}
                  checked={tint === t}
                  onChange={() => setTint(t)}
                  className={styles.choiceInput}
                />
                <label
                  htmlFor={`${uid}-tint-${t}`}
                  title={TINT_LABELS[t]}
                  className="grid size-11 cursor-pointer place-items-center rounded-full"
                >
                  <span className="sr-only">{TINT_LABELS[t]}</span>
                  <span
                    aria-hidden
                    className={cx(
                      'grid size-8 place-items-center rounded-full border',
                      TINT_STYLES[t].swatch,
                      tint === t
                        ? 'border-ink ring-2 ring-ink ring-offset-2 ring-offset-card'
                        : 'border-(--line-strong)',
                    )}
                  >
                    {tint === t ? <Check strokeWidth={2} className="size-3.5 text-ink" /> : null}
                  </span>
                </label>
              </span>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-small font-medium text-ink">Icon</legend>
          <div className="mt-1.5 grid grid-cols-4 gap-1.5 @sm:grid-cols-8">
            {ICON_OPTIONS.map((name) => {
              const Icon = COMMUNITY_ICON_COMPONENTS[name];
              const on = icon === name;
              return (
                <span key={name} className="relative">
                  <input
                    id={`${uid}-icon-${name}`}
                    type="radio"
                    name={`${uid}-icon`}
                    value={name}
                    checked={on}
                    onChange={() => setIcon(name)}
                    className={styles.choiceInput}
                  />
                  <label
                    htmlFor={`${uid}-icon-${name}`}
                    title={COMMUNITY_ICON_LABELS[name]}
                    className={cx(
                      styles.press,
                      'grid h-11 cursor-pointer place-items-center rounded-xl border',
                      on
                        ? cx('border-ink', TINT_STYLES[tint].tile)
                        : 'border-line bg-card-strong hover:border-ink-muted',
                    )}
                  >
                    <span className="sr-only">{COMMUNITY_ICON_LABELS[name]}</span>
                    <Icon
                      aria-hidden
                      strokeWidth={1.5}
                      className={cx('size-5', on ? TINT_STYLES[tint].icon : 'text-ink-soft')}
                    />
                  </label>
                </span>
              );
            })}
          </div>
        </fieldset>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button type="button" onClick={submit} className="btn btn-secondary h-11 px-5">
          {editing ? 'Save changes' : 'Add community'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn h-11 px-4 text-ink-soft hover:bg-page hover:text-ink"
        >
          Cancel
        </button>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="btn ml-auto h-11 px-4 text-(--danger-deep) hover:bg-page"
          >
            <Trash2 aria-hidden strokeWidth={1.5} className="size-4 text-danger" />
            Remove
          </button>
        ) : null}
      </div>
    </section>
  );
}
