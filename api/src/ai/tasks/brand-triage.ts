import type {
  BrandBudgetRange,
  BrandFlag,
  BrandRequestSource,
  BrandUrgency,
  TasteProfile,
} from '@fellow-owners/shared';
import type { AiRuntime } from '../run.js';
import { type AiContext, AiUnavailableError } from '../types.js';

/**
 * brandTriage (F5 brand inbox, fast tier): scores one brand request for the creator (fit with the
 * taste profile, budget, legitimacy flags, urgency) and writes a one-line summary. Brand text is
 * untrusted data; the output is data only. Capped per space per day (TASK_CAPS.brandTriage =
 * BRAND_LIMITS.triagePerDay); counts toward the space's AI budget like pitch triage.
 */

export interface BrandTriageAiInput {
  request: {
    source: BrandRequestSource;
    brandName: string;
    contactName: string | null;
    email: string | null;
    website: string | null;
    budgetRange: BrandBudgetRange | null;
    deliverables: string | null;
    timeline: string | null;
    subject: string | null;
    /** Cut to LIMITS.ai.inputCharsMax by the implementation. */
    message: string;
  };
  creatorName: string;
  tasteProfile: TasteProfile;
}

export interface BrandTriageAiOutput {
  /** Integer 0..100. */
  score: number;
  /** One line, at most BRAND_LIMITS.summaryMax characters. */
  summary: string;
  /** Only BRAND_FLAGS values. */
  flags: BrandFlag[];
  urgency: BrandUrgency;
  model: string;
}

/**
 * Wave A stub: the live prompt is not written yet, so callers degrade as for "AI off" (the request
 * stays pending; the fake in ai/fakes/brand-triage.ts answers without a key). B4 replaces this.
 */
export async function brandTriage(
  _rt: AiRuntime,
  _input: BrandTriageAiInput,
  _ctx: AiContext,
): Promise<BrandTriageAiOutput> {
  throw new AiUnavailableError('disabled', 'Brand triage is not built yet', {
    task: 'brandTriage',
  });
}
