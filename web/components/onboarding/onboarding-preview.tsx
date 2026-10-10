'use client';

import { PLATFORM_LABELS } from '@fellow-owners/shared';
import { Eye, Lock, Send } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CreatorImage } from '@/components/shared/creator-image';
import type { EditorPreview } from './communities-step';
import styles from './onboarding.module.css';
import { ONBOARDING_ART } from './onboarding-art';
import { cx } from './onboarding-fields';
import {
  avatarTint,
  COMMUNITY_ICON_COMPONENTS,
  type CommunityDraft,
  firstName,
  formatCompact,
  HOST,
  initials,
  type OnboardingValues,
  type StepIndex,
  TINT_STYLES,
  totalFollowers,
} from './onboarding-templates';

const CAPTIONS: Record<StepIndex, string> = {
  0: 'Fans land here from the link in your bio.',
  1: 'Follower counts show as chips under your name.',
  2: 'Fans pick the communities they want to join.',
  3: 'What you love stays private. Fans only see this page.',
};

/** Which part of the page each step edits, so the phone scrolls to it. */
const STEP_SECTION: Record<StepIndex, 'top' | 'platforms' | 'communities' | 'end'> = {
  0: 'top',
  1: 'platforms',
  2: 'communities',
  3: 'top',
};

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * The right-hand panel of onboarding: the creator's bio link page in a phone, updating as they type,
 * over the step's vlog still from 1024px. Phones get it under the form, on the aurora, without art.
 */
export function OnboardingPreview({
  values,
  step,
  editor,
}: {
  values: OnboardingValues;
  step: StepIndex;
  editor: EditorPreview | null;
}) {
  const screenRef = useRef<HTMLElement>(null);
  const [scrollable, setScrollable] = useState(false);
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);

  const name = values.displayName?.trim() ?? '';
  const handle = values.handle?.trim() ?? '';
  const bio = values.bio?.trim() ?? '';
  const platforms = (values.platforms ?? []).filter(
    (p) => p && (p.url?.trim() || (Number.isFinite(p.followers) && p.followers > 0)),
  );
  const { total, count } = totalFollowers(values.platforms ?? []);
  const communities: (CommunityDraft & { editing?: boolean })[] = [...(values.communities ?? [])];
  if (editor) {
    if (editor.index === null) communities.push({ ...editor.draft, editing: true });
    else if (communities[editor.index])
      communities[editor.index] = { ...editor.draft, editing: true };
  }
  const taste = values.tasteProfile ?? { promote: [], never: [], voice: [] };
  const first = firstName(name);
  const onArt = Boolean(ONBOARDING_ART[step]);

  // Scroll the phone to the part the current step edits (only when the phone scrolls on its own).
  const target = STEP_SECTION[step];
  const communityCount = communities.length;
  const editingIndex = editor ? (editor.index ?? communities.length - 1) : -1;
  useIsoLayoutEffect(() => {
    const screen = screenRef.current;
    const canScroll = Boolean(screen && screen.scrollHeight > screen.clientHeight + 1);
    setScrollable(canScroll);
    if (!screen || !canScroll) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let top = 0;
    if (target === 'end') top = screen.scrollHeight;
    else if (target !== 'top') {
      const focusEl =
        target === 'communities' && editingIndex >= 0
          ? screen.querySelector<HTMLElement>(`[data-card="${editingIndex}"]`)
          : screen.querySelector<HTMLElement>(`[data-section="${target}"]`);
      if (focusEl) {
        const fromTop = focusEl.offsetTop - 16;
        const fits =
          focusEl.offsetTop + focusEl.offsetHeight <= screen.scrollTop + screen.clientHeight;
        top =
          target === 'communities' &&
          editingIndex >= 0 &&
          fits &&
          focusEl.offsetTop >= screen.scrollTop
            ? screen.scrollTop
            : fromTop;
      }
    }
    screen.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
  }, [target, communityCount, editingIndex]);

  return (
    <section
      id="onboarding-preview"
      aria-labelledby="ob-preview-title"
      className="relative h-full scroll-mt-4"
    >
      {/* From 1024px the column sticks (SPLIT_ASIDE) and the step picture fills it, radius 28. */}
      <div className="relative isolate flex h-full flex-col py-2 lg:overflow-hidden lg:rounded-card lg:p-10 xl:p-14">
        <StepArt step={step} />
        {/* One centred column, the phone's width: the header reads as the phone's label. */}
        <div className="mx-auto flex min-h-0 w-full max-w-[22rem] flex-1 flex-col gap-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h2
              id="ob-preview-title"
              className={cx(
                'inline-flex h-9 items-center gap-2 rounded-full px-4 text-small font-medium text-ink',
                // Over a step picture the label and caption sit on white (no words on a picture).
                onArt ? 'lg:bg-card-strong' : null,
                'glass-pill',
              )}
            >
              <Eye aria-hidden strokeWidth={1.5} className="size-4" />
              Live preview
            </h2>
            <p
              className={cx(
                'text-small text-ink',
                onArt ? 'lg:rounded-full lg:bg-card-strong lg:px-3 lg:py-1.5' : null,
              )}
            >
              {CAPTIONS[step]}
            </p>
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col">
            {step === 3 ? <TasteCard taste={taste} /> : null}
            {/* Phone: a Pure White bezel around the fan page, which sits on the shell on phones. */}
            <div className="w-full rounded-[44px] bg-card-strong p-2.5 lg:max-h-[46rem] lg:min-h-0 lg:flex-1">
              <section
                ref={screenRef}
                data-lenis-prevent
                tabIndex={scrollable ? 0 : undefined}
                aria-label={`Preview of ${HOST}/${handle || 'your handle'}`}
                className={cx(
                  styles.screen,
                  'relative h-full rounded-[36px] bg-shell px-4 pt-3 pb-6 lg:overflow-y-auto',
                )}
              >
                <div className="glass-pill mx-auto flex h-8 max-w-full items-center justify-center gap-1.5 px-3 text-caption text-ink-soft">
                  <Lock aria-hidden strokeWidth={1.75} className="size-3 shrink-0" />
                  <span className="truncate">
                    {HOST}/
                    {handle ? (
                      <span className="text-ink">{handle}</span>
                    ) : (
                      <Ghost className="ml-0.5 inline-block h-2 w-14 align-middle" />
                    )}
                  </span>
                </div>

                {/* Creator header */}
                <div data-section="top" className="mt-7 flex flex-col items-center text-center">
                  {values.avatarUrl && failedAvatar !== values.avatarUrl ? (
                    // ponytail: plain img; the avatar is a data: URL or a /demo/ path, never remote.
                    // biome-ignore lint/performance/noImgElement: see above
                    <img
                      src={values.avatarUrl}
                      alt=""
                      width={76}
                      height={76}
                      onError={() => setFailedAvatar(values.avatarUrl ?? null)}
                      className="size-[76px] rounded-full object-cover"
                    />
                  ) : name ? (
                    <span
                      aria-hidden
                      className={cx(
                        'grid size-[76px] place-items-center rounded-full text-h2 font-medium text-ink',
                        avatarTint(name),
                      )}
                    >
                      {initials(name)}
                    </span>
                  ) : (
                    <Ghost className="size-[76px]" />
                  )}
                  {name ? (
                    <p className="mt-3 text-[20px] leading-7 font-medium break-words text-ink">
                      {name}
                    </p>
                  ) : (
                    <Ghost className="mt-4 h-5 w-36" />
                  )}
                  {handle ? (
                    <p className="text-small text-ink-soft">@{handle}</p>
                  ) : (
                    <Ghost className="mt-2 h-3 w-20" />
                  )}
                  {bio ? (
                    <p className="mt-2.5 max-w-[32ch] text-small break-words text-ink">{bio}</p>
                  ) : (
                    <span aria-hidden className="mt-3.5 flex w-full flex-col items-center gap-1.5">
                      <Ghost className="h-2.5 w-52" />
                      <Ghost className="h-2.5 w-36" />
                    </span>
                  )}
                </div>

                {/* Platforms */}
                <div data-section="platforms" className="mt-5 flex flex-col items-center">
                  {platforms.length > 0 ? (
                    <ul className="flex flex-wrap justify-center gap-1.5">
                      {platforms.map((p, i) => (
                        <li
                          // biome-ignore lint/suspicious/noArrayIndexKey: rows have no stable id in the preview
                          key={i}
                          className="glass-pill inline-flex h-7 items-center gap-1.5 px-3 text-caption text-ink-soft"
                        >
                          {PLATFORM_LABELS[p.platform]}
                          {Number.isFinite(p.followers) && p.followers > 0 ? (
                            <span className="tabular font-semibold text-ink">
                              {formatCompact(p.followers)}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span aria-hidden className="flex gap-1.5">
                      <Ghost className="h-7 w-[4.5rem]" />
                      <Ghost className="h-7 w-20" />
                      <Ghost className="h-7 w-14" />
                    </span>
                  )}
                  {count > 1 ? (
                    <p className="tabular mt-2 text-caption text-ink-soft">
                      {formatCompact(total)} followers in total
                    </p>
                  ) : null}
                </div>

                {/* Communities */}
                <div data-section="communities" className="mt-7">
                  <p className="text-body font-medium text-ink">Join a community</p>
                  <ul className="mt-3 flex flex-col gap-2.5">
                    {communities.length > 0 ? (
                      communities.map((c, i) => (
                        <CommunityPreviewCard
                          // Keyed by position only: a card being typed into (or a draft that is then
                          // saved) keeps its node, so the settle-in plays once, not on every keystroke.
                          // biome-ignore lint/suspicious/noArrayIndexKey: order is the identity here
                          key={i}
                          index={i}
                          community={c}
                        />
                      ))
                    ) : (
                      <>
                        <GhostCard />
                        <GhostCard />
                      </>
                    )}
                  </ul>
                </div>

                <span
                  aria-hidden
                  className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-card-strong text-small font-medium text-ink"
                >
                  <Send strokeWidth={1.5} className="size-4" />
                  {first ? `Send ${first} an idea` : 'Send an idea'}
                </span>
                <p className="sr-only">The page ends with a Send {first || 'me'} an idea button.</p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The step pictures behind the preview, from 1024px (see onboarding-art.ts). Every picture that exists
 * is mounted, so moving between steps crossfades instead of waiting for a download; only the current
 * step's is visible (opacity, 250ms ease-out; instant under reduced motion through the global rule).
 * Decorative: the preview and its caption carry the meaning.
 */
function StepArt({ step }: { step: StepIndex }) {
  const pictures = STEP_ORDER.flatMap((index) => {
    const art = ONBOARDING_ART[index];
    return art ? [{ index, art }] : [];
  });
  if (pictures.length === 0) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 hidden lg:block">
      {pictures.map(({ index, art }) => (
        <CreatorImage
          key={index}
          name={art.name}
          alt=""
          fill
          sizes="50vw"
          className={cx(
            art.focus,
            'transition-opacity duration-[250ms] ease-(--ease-out-quart)',
            index === step ? 'opacity-100' : 'opacity-0',
          )}
        />
      ))}
    </div>
  );
}

const STEP_ORDER: readonly StepIndex[] = [0, 1, 2, 3];

function CommunityPreviewCard({
  community,
  index,
}: {
  community: CommunityDraft & { editing?: boolean };
  index: number;
}) {
  const t = TINT_STYLES[community.tint] ?? TINT_STYLES.white;
  const Icon = COMMUNITY_ICON_COMPONENTS[community.icon] ?? COMMUNITY_ICON_COMPONENTS.users;
  return (
    <li
      data-card={index}
      className={cx(
        styles.fresh,
        'rounded-[22px] p-4',
        t.card,
        community.editing && 'outline-2 outline-offset-2 outline-ink outline-dashed',
      )}
    >
      <div className="flex items-center gap-3">
        <span className={cx('grid size-10 shrink-0 place-items-center rounded-[12px]', t.tile)}>
          <Icon aria-hidden strokeWidth={1.5} className={cx('size-5', t.icon)} />
        </span>
        {community.name ? (
          <p className="min-w-0 flex-1 truncate text-[17px] leading-6 font-medium text-ink-soft">
            {community.name}
          </p>
        ) : (
          <Ghost className="h-4 w-28 bg-card-strong/70" />
        )}
      </div>
      {community.description ? (
        <p className="mt-2.5 line-clamp-2 text-small text-ink-soft">{community.description}</p>
      ) : null}
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="tabular text-small text-ink-soft">0 fans</span>
        <span
          aria-hidden
          className="inline-flex h-8 items-center rounded-full border border-line bg-card-strong px-4 text-small font-medium text-ink"
        >
          Join
        </span>
      </div>
    </li>
  );
}

function TasteCard({ taste }: { taste: OnboardingValues['tasteProfile'] }) {
  const promote = taste.promote.map((l) => l.trim()).filter(Boolean);
  const never = taste.never.map((l) => l.trim()).filter(Boolean);
  const voice = taste.voice.map((l) => l.trim()).filter(Boolean);
  const rows: { label: string; lines: string[]; empty: string }[] = [
    { label: 'Promote', lines: promote, empty: 'Nothing yet' },
    { label: 'Never', lines: never, empty: 'Nothing yet' },
  ];
  return (
    <aside
      aria-label="What you love, only you see this"
      className={cx(styles.fresh, 'mb-4 w-full shrink-0 rounded-3xl bg-card-strong p-4')}
    >
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-table-head">
          <Lock aria-hidden strokeWidth={1.5} className="size-4 text-ink" />
        </span>
        <div className="min-w-0">
          <p className="text-small font-medium text-ink">What you love</p>
          <p className="text-caption text-ink-muted">Only you see this</p>
        </div>
      </div>
      <dl className="mt-3 flex flex-col gap-2.5 border-t border-line pt-3">
        {rows.map((r) => (
          <div key={r.label}>
            <dt className="tabular text-caption text-ink-muted">
              {r.label} · {r.lines.length}
            </dt>
            <dd className="mt-0.5 flex min-w-0 items-baseline gap-1.5 text-small">
              {r.lines[0] ? (
                <span className="min-w-0 truncate text-ink">{r.lines[0]}</span>
              ) : (
                <span className="text-ink-muted">{r.empty}</span>
              )}
              {r.lines.length > 1 ? (
                <span className="tabular shrink-0 text-ink-muted">+{r.lines.length - 1} more</span>
              ) : null}
            </dd>
          </div>
        ))}
        <div>
          <dt className="text-caption text-ink-muted">Voice</dt>
          <dd className="tabular mt-0.5 text-small text-ink">
            {voice.length === 0
              ? 'No samples yet'
              : `${voice.length} ${voice.length === 1 ? 'sample' : 'samples'}`}
          </dd>
        </div>
      </dl>
    </aside>
  );
}

function Ghost({ className }: { className?: string }) {
  const tinted = /(^|\s)bg-/.test(className ?? '');
  return (
    <span aria-hidden className={cx('block rounded-full', !tinted && 'bg-glass', className)} />
  );
}

function GhostCard() {
  return (
    <li aria-hidden className="rounded-[22px] bg-glass p-4">
      <div className="flex items-center gap-3">
        <span className="size-10 rounded-[12px] bg-card-strong/60" />
        <span className="h-3.5 w-28 rounded-full bg-card-strong/60" />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="h-2.5 w-16 rounded-full bg-card-strong/60" />
        <span className="h-8 w-16 rounded-full bg-card-strong/60" />
      </div>
    </li>
  );
}
