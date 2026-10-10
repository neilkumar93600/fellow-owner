import { LIMITS, PLATFORM_LABELS, type PromotionPlatform } from '@fellow-owners/shared';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, TextArea } from '@/components/ui/field';
import { formatNumber } from '@/lib/format';

export interface DraftEditorProps {
  platform: PromotionPlatform;
  value: string;
  onChange: (value: string) => void;
  hashtags: string[];
  /** The AI could not draft this platform last time (Promotion.draftErrors). */
  failed: boolean;
  /** A regenerate (or any save) is running. */
  regenerating?: boolean;
  onRegenerate: () => void;
}

/**
 * The composer's editable draft for one platform: its character count against the platform limit
 * (warm from 90%, red over it, which also blocks Publish), the hashtags that go out with it, and
 * Regenerate.
 */
export function DraftEditor({
  platform,
  value,
  onChange,
  hashtags,
  failed,
  regenerating = false,
  onRegenerate,
}: DraftEditorProps) {
  const label = PLATFORM_LABELS[platform];
  const max = LIMITS.promotion.text[platform];
  const over = value.length > max;

  return (
    <section aria-label={`${label} draft`} className="glass-strong rounded-panel p-6">
      <Field
        label={`${label} draft`}
        helper={
          value
            ? 'Drafted in your voice. Edit it freely.'
            : failed
              ? `The AI could not draft for ${label}. Regenerate to try again.`
              : `No ${label} draft yet. Write one, or regenerate.`
        }
        count={{ value: value.length, max }}
        error={over ? `Cut it to ${formatNumber(max)} characters to publish.` : undefined}
      >
        <TextArea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={platform === 'x' ? 5 : 9}
          placeholder={`Write the ${label} post, or regenerate a draft.`}
        />
      </Field>

      {hashtags.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <p className="text-small-strong text-ink">Hashtags</p>
          <ul className="flex flex-wrap gap-1.5">
            {hashtags.map((tag) => (
              <li
                key={tag}
                className="inline-flex h-6 items-center rounded-full bg-aurora-sky px-2.5 text-caption text-ink"
              >
                #{tag}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button
          variant="secondary"
          icon={<RefreshCw />}
          loading={regenerating}
          disabled={regenerating}
          onClick={onRegenerate}
        >
          Regenerate draft
        </Button>
        <p className="text-small text-ink-soft">Replaces this draft with a fresh one.</p>
      </div>
    </section>
  );
}
