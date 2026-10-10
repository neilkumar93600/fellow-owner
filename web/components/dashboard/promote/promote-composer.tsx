'use client';

import {
  type PromotionComposer as ComposerData,
  hasPublishableDraft,
  LIMITS,
  PLATFORM_LABELS,
  type PlatformEntry,
  type PostCredit,
  PROMOTION_PLATFORMS,
  type Promotion,
  type PromotionDraftsInput,
  type PromotionPlatform,
  promotionDraftsSchema,
  type StudioPostDetail,
  type StudioSpace,
} from '@fellow-owners/shared';
import type * as React from 'react';
import { useState } from 'react';
import { CommunityChip } from '@/components/shared/community-chip';
import { MatchLabel } from '@/components/shared/match-label';
import { TabBar } from '@/components/shared/tab-bar';
import { Field, TextField } from '@/components/ui/field';
import { usePromotionAction } from '@/hooks/queries/use-promotions';
import { appUrl } from '@/lib/env';
import { routes, withQuery } from '@/lib/routes';
import { toastSuccess } from '@/lib/toast';
import { DraftEditor } from './draft-editor';
import { PreviewPanel } from './preview-panel';
import { PublishBar } from './publish-bar';

type Texts = Record<PromotionPlatform, string>;

/** Where each platform's post gets written; only X and LinkedIn take the text in the URL. */
const OPEN: Record<PromotionPlatform, (text: string) => string> = {
  x: (text) => `https://x.com/intent/post?text=${encodeURIComponent(text)}`,
  linkedin: (text) =>
    `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`,
  instagram: () => 'https://www.instagram.com/',
  youtube: () => 'https://studio.youtube.com/',
};

/** "@miralane" from the creator's profile link on that platform, when they listed one. */
function handleOn(platforms: PlatformEntry[], platform: PromotionPlatform): string | null {
  const url = platforms.find((entry) => entry.platform === platform)?.url;
  const last = url?.split('/').filter(Boolean).pop();
  return last ? `@${last.replace(/^@/, '')}` : null;
}

export interface PromoteComposerProps {
  /** A composer whose post has been promoted (the screen starts one first when it has not). */
  composer: ComposerData & { promotion: Promotion };
  space: Pick<StudioSpace, 'displayName' | 'avatarUrl' | 'platforms'>;
  /** The draft shown first (?platform=). */
  platform: PromotionPlatform;
  /** ?title= from What fans want: starts the headline field (saved only when Mira saves). */
  headlineSeed?: string;
}

/**
 * Promote composer (DESIGN.md recipe, ref 096dc0): left 7 columns hold the post, the platform tabs and
 * the editable draft; right 5 the preview panel with the summary well and the publish bar. Drafts are
 * edited locally; Save, Publish, Unpublish and Regenerate go to the API, and the tab mirrors into ?platform=.
 */
export function PromoteComposer({
  composer,
  space,
  platform: initial,
  headlineSeed = '',
}: PromoteComposerProps) {
  const { post, promotion } = composer;
  const [platform, setPlatform] = useState(initial);
  const [texts, setTexts] = useState<Texts>(() => textsOf(promotion));
  const [headline, setHeadline] = useState(headlineSeed || (promotion.headline ?? ''));
  const action = usePromotionAction();
  const pending = action.isPending;
  const saved = textsOf(promotion);
  const state = promotion.state;

  const hashtagsOf = (key: PromotionPlatform) => promotion.drafts[key]?.hashtags ?? [];
  const drafts = Object.fromEntries(
    PROMOTION_PLATFORMS.map((key) => [key, { text: texts[key], hashtags: hashtagsOf(key) }]),
  ) as PromotionDraftsInput;
  const check = promotionDraftsSchema.safeParse(drafts);
  const tooLong = check.success ? null : (check.error.issues[0]?.path[0] as PromotionPlatform);
  const headlineMax = LIMITS.promotion.headline.max;
  const blocked = tooLong
    ? `Cut the ${PLATFORM_LABELS[tooLong]} draft to its limit to ${state === 'live' ? 'save' : 'publish'}.`
    : headline.trim().length > headlineMax
      ? `Cut the headline to ${headlineMax} characters to ${state === 'live' ? 'save' : 'publish'}.`
      : hasPublishableDraft(drafts)
        ? null
        : 'Write at least one draft to publish.';
  const dirty =
    PROMOTION_PLATFORMS.some((key) => texts[key] !== saved[key]) ||
    headline.trim() !== (promotion.headline ?? '');

  const shortUrl = promotion.shortPath ? appUrl(promotion.shortPath) : null;
  const showcaseUrl = promotion.showcasePath ? appUrl(promotion.showcasePath) : null;
  // The short link carries ?p= so clicks count per platform.
  const outgoing = [
    texts[platform].trim(),
    hashtagsOf(platform)
      .map((tag) => `#${tag}`)
      .join(' '),
    shortUrl ? `${shortUrl}?p=${platform}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const regenerate = () =>
    action.mutate(
      { id: promotion.id, action: { action: 'regenerate', platforms: [platform] } },
      {
        onSuccess: (next) => {
          const text = next.drafts[platform]?.text;
          if (text === undefined || next.draftErrors.includes(platform)) return;
          setTexts((current) => ({ ...current, [platform]: text }));
          toastSuccess(`New ${PLATFORM_LABELS[platform]} draft ready.`);
        },
      },
    );
  // The server publishes what it has saved, so unsaved edits are saved first.
  const saveDrafts = () =>
    action.mutateAsync({
      id: promotion.id,
      action: { action: 'save', headline: headline.trim() || null, drafts },
    });
  const publish = async () => {
    try {
      if (dirty) await saveDrafts();
      await action.mutateAsync({ id: promotion.id, action: { action: 'publish' } });
      toastSuccess('Your spotlight is live. The page and its link are ready.');
    } catch {
      // usePromotionAction already toasted the error, with a retry.
    }
  };
  const save = async () => {
    try {
      await saveDrafts();
      toastSuccess('Drafts saved.');
    } catch {
      // Toasted by the hook.
    }
  };
  const unpublish = () =>
    action.mutate(
      { id: promotion.id, action: { action: 'unpublish' } },
      {
        onSuccess: () => toastSuccess('Taken down. Its link now says this is no longer featured.'),
      },
    );

  // The shared tab bar renders links (?platform=); a plain click switches the draft in place instead of
  // navigating, so unsaved edits stay. Modified clicks still open the link.
  const pickPlatform = (event: React.MouseEvent) => {
    const link = (event.target as Element).closest('a');
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    const next = new URL(link.href).searchParams.get('platform') ?? 'x';
    setPlatform(next as PromotionPlatform);
    window.history.replaceState(null, '', link.href);
  };

  return (
    <div className="grid grid-cols-12 items-start gap-5">
      <h1 className="sr-only">Give {post.title} your spotlight</h1>

      <div className="col-span-12 flex min-w-0 flex-col gap-4 @4xl:col-span-7">
        <section aria-labelledby="post-title" className="glass-strong rounded-panel p-6">
          <CommunityChip
            name={post.community.name}
            tint={post.community.tint}
            icon={post.community.icon}
          />
          <h2 id="post-title" className="mt-3 text-h2 text-ink">
            {post.title}
          </h2>
          <p className="mt-1 text-small text-ink-soft">
            By {post.author.name}
            {post.author.headline ? ` · ${post.author.headline}` : ''}
          </p>
          {post.ai.fitScore != null && post.ai.fitReason ? (
            <div className="mt-4 flex flex-wrap items-start gap-x-3 gap-y-2">
              <MatchLabel score={post.ai.fitScore} />
              <p className="min-w-0 flex-1 text-small text-ink-soft">
                <span className="font-medium text-ink">Why:</span> {post.ai.fitReason}
              </p>
            </div>
          ) : null}
          <Field
            className="mt-5"
            label="Your line on the page"
            optional
            helper="A short line from you at the top of the page fans land on."
            count={{ value: headline.length, max: headlineMax }}
          >
            <TextField value={headline} onChange={(event) => setHeadline(event.target.value)} />
          </Field>
        </section>
        <div onClickCapture={pickPlatform}>
          <TabBar
            label="Platform drafts"
            tabs={PROMOTION_PLATFORMS.map((key) => ({
              href: withQuery(
                routes.dashboard.promoteComposer(post.id),
                { platform: key },
                { platform: 'x' },
              ),
              label: PLATFORM_LABELS[key],
              active: key === platform,
            }))}
          />
        </div>

        <DraftEditor
          platform={platform}
          value={texts[platform]}
          onChange={(value) => setTexts((current) => ({ ...current, [platform]: value }))}
          hashtags={hashtagsOf(platform)}
          failed={promotion.draftErrors.includes(platform)}
          regenerating={pending}
          onRegenerate={regenerate}
        />
      </div>

      <PreviewPanel
        className="col-span-12 @4xl:col-span-5"
        platform={platform}
        post={texts[platform].trim() ? outgoing : ''}
        characters={texts[platform].length}
        author={{
          name: space.displayName,
          image: space.avatarUrl,
          handle: handleOn(space.platforms, platform),
        }}
        state={state}
        shortUrl={shortUrl}
        showcaseUrl={showcaseUrl}
        clicks={promotion.clickCount}
        credits={creditsOf(post)}
      >
        <PublishBar
          state={state}
          blocked={blocked}
          dirty={dirty}
          pending={pending}
          copyText={outgoing}
          openHref={OPEN[platform](outgoing)}
          openLabel={`Open in ${PLATFORM_LABELS[platform]}`}
          onPublish={publish}
          onSave={save}
          onUnpublish={unpublish}
        />
      </PreviewPanel>
    </div>
  );
}

function textsOf(promotion: Promotion): Texts {
  return Object.fromEntries(
    PROMOTION_PLATFORMS.map((key) => [key, promotion.drafts[key]?.text ?? '']),
  ) as Texts;
}

/** "Made by": the fan who started it, then the accepted crew with their roles (the page's credits). */
function creditsOf(post: StudioPostDetail): PostCredit[] {
  const crew = post.team.filter(
    (member) => member.status === 'accepted' && member.name !== post.author.name,
  );
  return [
    { name: post.author.name, role: 'Started it', avatarUrl: post.author.image },
    ...crew.map((member) => ({ name: member.name, role: member.role, avatarUrl: member.image })),
  ];
}
