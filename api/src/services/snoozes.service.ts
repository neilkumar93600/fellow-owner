import type { ChecklistStepInput, SnoozeInput, SnoozeRefType } from '@fellow-owners/shared';
import type { CoreDeps } from '../container.js';
import { notFound } from '../lib/errors.js';

export type SnoozesServiceDeps = Pick<CoreDeps, 'repos' | 'logger'>;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Today "Later" snoozes and the setup checklist. */
export function createSnoozesService({ repos }: SnoozesServiceDeps) {
  /** The ref must belong to this space (inbound.id or posts.id), else 404. */
  async function assertOwned(spaceId: string, refType: SnoozeRefType, refId: string) {
    const found =
      refType === 'pitch'
        ? await repos.pitches.findById(spaceId, refId)
        : await repos.posts.findById(refId);
    if (!found || ('spaceId' in found && found.spaceId !== spaceId)) throw notFound('Item');
  }

  return {
    async snooze(spaceId: string, input: SnoozeInput): Promise<void> {
      const { refType, refId, days = 1 } = input;
      await assertOwned(spaceId, refType, refId);
      await repos.snoozes.upsert(spaceId, refType, refId, new Date(Date.now() + days * DAY_MS));
    },
    async unsnooze(spaceId: string, refType: SnoozeRefType, refId: string): Promise<void> {
      await repos.snoozes.remove(spaceId, refType, refId);
    },
    async markChecklistStep(spaceId: string, _input: ChecklistStepInput): Promise<void> {
      await repos.spaces.markBioLinkShared(spaceId);
    },
  };
}

export type SnoozesService = ReturnType<typeof createSnoozesService>;
