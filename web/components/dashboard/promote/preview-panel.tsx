import {
  LIMITS,
  PLATFORM_LABELS,
  type PostCredit,
  type PromotionPlatform,
  type PromotionState,
} from '@fellow-owners/shared';
import type * as React from 'react';
import { AvatarInitials } from '@/components/shared/avatar-initials';
import { CopyButton } from '@/components/shared/copy-button';
import { StatusPill } from '@/components/shared/status-pill';
import { cn } from '@/components/ui/cn';
import { formatNumber, pluralize } from '@/lib/format';

const bare = (url: string) => url.replace(/^https?:\/\//, '');

export interface PreviewPanelProps {
  platform: PromotionPlatform;
  /** The post as it goes out: draft, hashtags and the short link. */
  post: string;
  /** Characters in the draft itself, counted against the platform limit. */
  characters: number;
  author: { name: string; image: string | null; handle: string | null };
  state: PromotionState;
  /** Absolute URLs; null until the promotion is first published. */
  shortUrl: string | null;
  showcaseUrl: string | null;
  clicks: number;
  /** "Made by": the fan who started it first, then the accepted crew with their roles. */
  credits: PostCredit[];
  /** The publish bar. */
  children: React.ReactNode;
  className?: string;
}

/**
 * DESIGN.md Spotlight composer, right side: a strong frosted panel holding the post preview in a white
 * frame, the summary well, the "Made by" credits the page will show, and the publish bar.
 */
export function PreviewPanel({
  platform,
  post,
  characters,
  author,
  state,
  shortUrl,
  showcaseUrl,
  clicks,
  credits,
  children,
  className,
}: PreviewPanelProps) {
  const label = PLATFORM_LABELS[platform];
  const max = LIMITS.promotion.text[platform];

  return (
    <section
      aria-labelledby="preview-title"
      className={cn(
        'glass-strong @container/panel flex min-w-0 flex-col gap-5 rounded-panel p-6',
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="preview-title" className="text-h2 text-ink">
            Preview
          </h2>
          <StatusPill status={state} />
        </div>
        {state === 'live' && showcaseUrl ? (
          // relative: the sr-only note is clipped with the truncated line, not left hanging past the page.
          <p className="relative min-w-0 truncate text-small text-ink-soft">
            Page{' '}
            <a
              href={showcaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm text-ink underline underline-offset-3"
            >
              {bare(showcaseUrl)}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </p>
        ) : null}
      </div>

      <figure className="min-w-0 rounded-2xl border border-ink/10 bg-white p-4">
        <figcaption className="flex items-center gap-3">
          <AvatarInitials name={author.name} image={author.image} size={40} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-small-strong text-ink">{author.name}</span>
            <span className="truncate text-small text-ink-soft">
              {author.handle ? `${author.handle} on ${label}` : label}
            </span>
          </span>
        </figcaption>
        {post ? (
          <p className="mt-3 text-body break-words whitespace-pre-line text-ink">{post}</p>
        ) : (
          <p className="mt-3 text-body text-ink-soft">Nothing to preview yet.</p>
        )}
      </figure>

      <section aria-labelledby="made-by-title" className="rounded-2xl bg-aurora-peach/60 px-4 py-3">
        <h3 id="made-by-title" className="text-small-strong text-ink">
          Made by
        </h3>
        <p className="text-small text-ink-soft">
          The page names everyone who helped, with what they did.
        </p>
        <ul className="mt-2 flex flex-col gap-1">
          {credits.map((credit) => (
            <li key={`${credit.name}-${credit.role}`} className="flex min-h-10 items-center gap-3">
              <AvatarInitials name={credit.name} image={credit.avatarUrl} size={28} />
              <span className="min-w-0 flex-1 truncate text-small-strong text-ink">
                {credit.name}
              </span>
              <span className="shrink-0 text-small text-ink-soft">{credit.role}</span>
            </li>
          ))}
        </ul>
      </section>

      <dl className="rounded-2xl bg-aurora-lilac/55 px-4 py-3 text-small text-ink">
        <Row label="Platform">{label}</Row>
        <Row label="Characters">
          {formatNumber(characters)} of {formatNumber(max)}
        </Row>
        <Row label="Link">
          {shortUrl ? (
            <span className="flex min-w-0 items-center gap-1">
              <span className="truncate">{bare(shortUrl)}</span>
              <CopyButton
                value={shortUrl}
                label="Copy link"
                message="Link copied."
                surface="card"
                className="-my-1 shrink-0"
              />
            </span>
          ) : (
            'Made when you publish'
          )}
        </Row>
        <div className="mt-2 flex min-h-10 items-center justify-between gap-3 border-t border-ink/15 pt-2 text-label-strong">
          <dt>Opened by</dt>
          <dd className="tabular-nums">
            {formatNumber(clicks)} {pluralize(clicks, 'person', 'people')}
          </dd>
        </div>
      </dl>

      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-3">
      <dt className="shrink-0">{label}</dt>
      <dd className="flex min-w-0 justify-end text-ink-soft tabular-nums">{children}</dd>
    </div>
  );
}
