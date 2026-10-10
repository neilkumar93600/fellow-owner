import {
  ANALYSIS_STATUSES,
  MEMBERSHIP_ROLES,
  PITCH_STATUSES,
  PITCH_TYPES,
  POST_STATUSES,
  POST_TYPES,
  SIGNAL_KINDS,
  TEAM_STATUSES,
  TINTS,
} from '@fellow-owners/shared';
import { pgEnum } from 'drizzle-orm/pg-core';

// Postgres enums, value lists taken from shared/src/enums.ts so they cannot drift (05 §2).
// Adding a value later is an additive migration (ALTER TYPE ... ADD VALUE).

export const analysisStatusEnum = pgEnum('analysis_status', ANALYSIS_STATUSES);
export const membershipRoleEnum = pgEnum('membership_role', MEMBERSHIP_ROLES);
export const postTypeEnum = pgEnum('post_type', POST_TYPES);
export const postStatusEnum = pgEnum('post_status', POST_STATUSES);
export const signalKindEnum = pgEnum('signal_kind', SIGNAL_KINDS);
export const teamStatusEnum = pgEnum('team_status', TEAM_STATUSES);
export const pitchTypeEnum = pgEnum('pitch_type', PITCH_TYPES);
export const pitchStatusEnum = pgEnum('pitch_status', PITCH_STATUSES);
export const tintEnum = pgEnum('tint', TINTS);
