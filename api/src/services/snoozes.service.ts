import type { ChecklistStepInput, SnoozeInput, SnoozeRefType } from '@fellow-owners/shared';
import type { CoreDeps } from '../container.js';
import { notImplemented } from '../lib/errors.js';

export type SnoozesServiceDeps = Pick<CoreDeps, 'repos' | 'logger'>;

/** Today "Later" snoozes and the setup checklist. Stub: F16 builds it. */
export function createSnoozesService(_deps: SnoozesServiceDeps) {
  return {
    async snooze(_spaceId: string, _input: SnoozeInput): Promise<void> {
      throw notImplemented('Snoozes');
    },
    async unsnooze(_spaceId: string, _refType: SnoozeRefType, _refId: string): Promise<void> {
      throw notImplemented('Snoozes');
    },
    async markChecklistStep(_spaceId: string, _input: ChecklistStepInput): Promise<void> {
      throw notImplemented('Setup checklist');
    },
  };
}

export type SnoozesService = ReturnType<typeof createSnoozesService>;
