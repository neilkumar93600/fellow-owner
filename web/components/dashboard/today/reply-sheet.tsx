'use client';

import { ReplyBox } from '@/components/dashboard/inbox/reply-box';
import { AvatarInitials } from '@/components/shared/avatar-initials';
import { MatchLabel } from '@/components/shared/match-label';
import { SidePanel } from '@/components/shared/side-panel';
import type { DecisionItem } from './decision-items';

export interface ReplySheetProps {
  /** The fan message on show; kept while the sheet closes so its title does not blank mid-exit. */
  item: DecisionItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Gets the item and the reply once it passes the shared schema. */
  onSend: (item: DecisionItem, reply: string) => void;
}

/**
 * Today's inline reply: the fan message read-only (who, what they wrote, why the AI picked it), and the
 * Fan mail reply box under it, with "Draft in my voice". Nothing is sent until the creator presses Send.
 */
export function ReplySheet({ item, open, onOpenChange, onSend }: ReplySheetProps) {
  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title={`Reply to ${item.name.split(' ')[0]}`}
      footer={
        <ReplyBox
          key={item.id}
          pitchId={item.refId}
          name={item.name}
          onSend={(reply) => onSend(item, reply)}
        />
      }
    >
      <div className="flex items-center gap-3">
        <AvatarInitials name={item.name} image={item.avatarUrl} size={40} />
        <div className="min-w-0 flex-1">
          <p className="text-label-strong text-ink">{item.name}</p>
          <p className="text-small text-ink-soft">{item.context}</p>
        </div>
        <MatchLabel score={item.score} />
      </div>
      <p className="mt-4 text-label-strong text-ink">{item.title}</p>
      <p className="mt-2 max-w-[68ch] text-body whitespace-pre-line text-ink">{item.quote}</p>
      {item.reason ? (
        <p className="mt-3 text-small text-ink-soft">
          <span className="font-medium text-ink">Why:</span> {item.reason}
        </p>
      ) : null}
    </SidePanel>
  );
}
