import type {
  CommentModerationInput,
  CreateReportInput,
  ReportActionInput,
  ReportItem,
  ReportsPage,
  ReportsQuery,
} from '@fellow-owners/shared';
import type { CoreDeps } from '../container.js';
import { notImplemented } from '../lib/errors.js';

export type ModerationServiceDeps = Pick<CoreDeps, 'db' | 'repos' | 'logger'>;

/** F25 moderation: reports, the owner queue, comment hide, leaving a space. Stub: F07. */
export function createModerationService(_deps: ModerationServiceDeps) {
  return {
    async reportPost(_userId: string, _postId: string, _input: CreateReportInput): Promise<void> {
      throw notImplemented('Reports');
    },
    async reportComment(
      _userId: string,
      _commentId: string,
      _input: CreateReportInput,
    ): Promise<void> {
      throw notImplemented('Reports');
    },
    async listReports(_spaceId: string, _query: ReportsQuery): Promise<ReportsPage> {
      throw notImplemented('Reports');
    },
    async actOnReport(
      _spaceId: string,
      _userId: string,
      _reportId: string,
      _input: ReportActionInput,
    ): Promise<ReportItem> {
      throw notImplemented('Reports');
    },
    async moderateComment(
      _spaceId: string,
      _postId: string,
      _commentId: string,
      _input: CommentModerationInput,
    ): Promise<void> {
      throw notImplemented('Comment moderation');
    },
    /** DELETE /api/spaces/:handle/me; the owner cannot leave their own space (400). */
    async leave(_handle: string, _userId: string): Promise<void> {
      throw notImplemented('Leaving a space');
    },
  };
}

export type ModerationService = ReturnType<typeof createModerationService>;
