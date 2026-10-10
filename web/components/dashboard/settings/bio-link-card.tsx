'use client';

import { PLATFORM_LABELS, type StudioSpace } from '@fellow-owners/shared';
import { Copy, Download, ExternalLink } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useRef, useState } from 'react';
import { AvatarInitials } from '@/components/shared/avatar-initials';
import { CopyButton } from '@/components/shared/copy-button';
import { Button } from '@/components/ui/button';
import { Field, TextArea, TextField } from '@/components/ui/field';
import { appUrl } from '@/lib/env';
import { formatCompact, formatNumber, pluralize } from '@/lib/format';
import { routes } from '@/lib/routes';
import { toastError, toastSuccess } from '@/lib/toast';
import { PlatformMark } from './profile-form';

export interface BioLinkCardProps {
  space: Pick<
    StudioSpace,
    'handle' | 'displayName' | 'bio' | 'avatarUrl' | 'platforms' | 'memberCount' | 'communityCount'
  >;
}

/**
 * Settings, Bio link tab: the link with the screen's one coral Copy, a share line to copy, the QR code
 * with a PNG download, and a small preview of the bio header fans land on.
 */
export function BioLinkCard({ space }: BioLinkCardProps) {
  const url = appUrl(routes.fan.space(space.handle));
  const [share, setShare] = useState(
    `${space.bio ? `${space.bio} ` : ''}Pick a community and join me: ${url}`,
  );
  const qr = useRef<HTMLCanvasElement>(null);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toastSuccess('Bio link copied.');
    } catch (error) {
      toastError(error, { fallback: 'Could not copy. Select the link and copy it instead.' });
    }
  };

  const download = () => {
    const canvas = qr.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${space.handle}-bio-link-qr.png`;
    link.click();
  };

  return (
    <div className="grid grid-cols-12 items-start gap-5">
      <section
        aria-labelledby="bio-link-title"
        className="col-span-12 flex min-w-0 flex-col gap-6 glass-strong rounded-panel p-6 @4xl:col-span-7"
      >
        <div>
          <h2 id="bio-link-title" className="text-h2 text-ink">
            Your bio link
          </h2>
          <p className="mt-1 text-small text-ink-muted">
            Put it in your Instagram, TikTok and YouTube bios. Fans land on your communities.
          </p>
        </div>
        <Field label="Link" helper="Anyone with the link can see your communities and join one.">
          <TextField readOnly value={url} onFocus={(event) => event.currentTarget.select()} />
        </Field>
        <div className="flex flex-wrap gap-3">
          <Button icon={<Copy />} onClick={copyLink}>
            Copy link
          </Button>
          <Button
            variant="secondary"
            icon={<ExternalLink />}
            render={<a href={url} target="_blank" rel="noopener noreferrer" />}
          >
            Open bio link
            <span className="sr-only"> (opens in a new tab)</span>
          </Button>
        </div>

        <div className="flex flex-col gap-3 border-t border-line-row pt-6">
          <Field label="Share text" helper="Edit it here, then copy it into a post or a caption.">
            <TextArea value={share} onChange={(event) => setShare(event.target.value)} rows={3} />
          </Field>
          <CopyButton
            variant="secondary"
            label="Copy text"
            value={share}
            message="Share text copied."
            className="self-start"
          />
        </div>
      </section>

      <div className="col-span-12 flex min-w-0 flex-col gap-5 @4xl:col-span-5">
        <section
          aria-labelledby="qr-title"
          className="flex flex-col items-start gap-4 glass-strong rounded-panel p-6"
        >
          <div>
            <h2 id="qr-title" className="text-h2 text-ink">
              QR code
            </h2>
            <p className="mt-1 text-small text-ink-muted">
              For a flyer, a slide or the last frame of a video.
            </p>
          </div>
          <div className="self-center rounded-lg border border-line p-3">
            <QRCodeCanvas
              ref={qr}
              value={url}
              size={176}
              level="M"
              marginSize={1}
              fgColor="#2d2d30"
              bgColor="#ffffff"
              role="img"
              aria-label={`QR code for your bio link, ${url.replace(/^https?:\/\//, '')}`}
            />
          </div>
          <Button variant="secondary" icon={<Download />} onClick={download}>
            Download PNG
          </Button>
        </section>

        <section aria-labelledby="fan-view-title" className="glass rounded-panel p-6">
          <h2 id="fan-view-title" className="text-h2 text-ink">
            How fans see it
          </h2>
          {/* A still of the bio header on the Pewter Shell: no glass, no buttons. */}
          <div className="mt-4 flex flex-col items-center gap-3 rounded-xl bg-shell px-4 py-6 text-center">
            <AvatarInitials name={space.displayName} image={space.avatarUrl} size={48} />
            <p className="text-label-strong text-ink">{space.displayName}</p>
            {space.bio ? <p className="max-w-[40ch] text-small text-ink">{space.bio}</p> : null}
            {space.platforms.length > 0 ? (
              <ul className="flex flex-wrap justify-center gap-1.5">
                {space.platforms.map((entry) => (
                  <li
                    key={entry.url}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-small text-ink [&_svg]:size-4"
                  >
                    <PlatformMark platform={entry.platform} />
                    <span className="tabular-nums">{formatCompact(entry.followers)}</span>
                    <span className="sr-only">{PLATFORM_LABELS[entry.platform]} followers</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="text-small text-ink">
              <span className="tabular-nums">{formatNumber(space.memberCount)}</span>{' '}
              {pluralize(space.memberCount, 'fan')} in{' '}
              <span className="tabular-nums">{formatNumber(space.communityCount)}</span>{' '}
              {pluralize(space.communityCount, 'community', 'communities')}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
