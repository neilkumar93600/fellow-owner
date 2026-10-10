import type { BriefingHighlight, IdeaItem, InboxItem } from '@fellow-owners/shared';
import { routes } from '@/lib/routes';
import * as core from './decision-items-core.mjs';

export type DecisionKind = 'pitch' | 'post' | 'fan';

/** One card on the Today stack. */
export interface DecisionItem {
  /** `${kind}:${refId}`, unique in a stack. */
  id: string;
  kind: DecisionKind;
  /** The pitch, post or membership id. */
  refId: string;
  name: string;
  avatarUrl: string | null;
  /** The community, or the pitch type label ("Brand deal"). */
  context: string;
  title: string;
  quote: string;
  /** The AI's "why this one"; null when it has none. */
  reason: string | null;
  /** 0 to 100 match; shown only as a MatchLabel, never a number. */
  score: number | null;
  /** When the creator loved it (posts only); null when not loved. */
  lovedAt: string | null;
  /** The item in its dashboard list (side panel open). */
  href: string;
}

export interface DecisionInput {
  briefing: BriefingHighlight[];
  pitches: InboxItem[];
  posts: IdeaItem[];
  limit?: number;
}

/** Briefing picks first, then pitches by match, then ideas by signals; one card per item; 5 by default. */
export const buildDecisionItems: (input: DecisionInput) => DecisionItem[] = core.buildDecisionItems;

/** Minutes to clear `count` cards: Math.max(1, Math.round(count * 1.2)). */
export const estimateMinutes: (count: number) => number = core.estimateMinutes;

/** "Budget Travel was your busiest community this week: 41 new ideas.", or null when none had ideas. */
export const pulseSentence: (communities: Array<{ name: string; posts: number }>) => string | null =
  core.pulseSentence;

/** Where Feature goes: a post to the Spotlight composer, a fan to their spotlight panel; pitches have none. */
export function featureHref(item: DecisionItem): string | null {
  if (item.kind === 'post') return routes.dashboard.promoteComposer(item.refId);
  if (item.kind === 'fan') return routes.dashboard.people({ spotlight: item.refId });
  return null;
}
