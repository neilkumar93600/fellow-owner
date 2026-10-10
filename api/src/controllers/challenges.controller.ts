import {
  challengeEntrySchema,
  challengeParamsSchema,
  challengeWinnerSchema,
  createChallengeSchema,
} from '@fellow-owners/shared';
import type { Request, Response } from 'express';
import { sessionOf } from '../middlewares/require-session.js';
import { bodyOf, paramsOf } from '../middlewares/validate.js';
import type { AccessService, OwnerContext } from '../services/access.service.js';
import type { ChallengesService } from '../services/challenges.service.js';
import { memberContextOf } from './spaces.controller.js';

/**
 * Creator challenges (F2): /api/studio/challenges (owner, resolved by requireOwner) and
 * /api/spaces/:handle/challenges (fans, resolved by requireMember).
 */
export function createChallengesController(deps: {
  access: AccessService;
  challenges: ChallengesService;
}) {
  const { access, challenges } = deps;
  const ownerOf = (req: Request): OwnerContext =>
    access.assertOwner({
      userId: sessionOf(req).user.id,
      space: req.space,
      membership: req.membership,
    });
  const idOf = (req: Request) => paramsOf(req, challengeParamsSchema).id;

  return {
    /** GET /api/studio/challenges -> { items: ChallengeSummary[] } */
    async list(req: Request, res: Response): Promise<void> {
      res.json(await challenges.list(ownerOf(req)));
    },

    /** POST /api/studio/challenges -> ChallengeSummary (201) */
    async create(req: Request, res: Response): Promise<void> {
      const created = await challenges.create(ownerOf(req), bodyOf(req, createChallengeSchema));
      res.status(201).json(created);
    },

    /** GET /api/studio/challenges/:id -> ChallengeSummary & { entries: IdeaItem[] } */
    async detail(req: Request, res: Response): Promise<void> {
      res.json(await challenges.detail(ownerOf(req), idOf(req)));
    },

    /** POST /api/studio/challenges/:id/close -> ChallengeSummary */
    async close(req: Request, res: Response): Promise<void> {
      res.json(await challenges.close(ownerOf(req), idOf(req)));
    },

    /** POST /api/studio/challenges/:id/winner -> ChallengeSummary */
    async winner(req: Request, res: Response): Promise<void> {
      const { postId } = bodyOf(req, challengeWinnerSchema);
      res.json(await challenges.setWinner(ownerOf(req), idOf(req), postId));
    },

    /** GET /api/spaces/:handle/challenges -> { items: ChallengeSummary[] } */
    async listForFans(req: Request, res: Response): Promise<void> {
      res.json(await challenges.listForFans(memberContextOf(access, req)));
    },

    /** POST /api/spaces/:handle/challenges/:id/entries -> PostDetail & { challenge } (201) */
    async enter(req: Request, res: Response): Promise<void> {
      const entry = await challenges.enter(
        memberContextOf(access, req),
        idOf(req),
        bodyOf(req, challengeEntrySchema),
      );
      res.status(201).json(entry);
    },
  };
}

export type ChallengesController = ReturnType<typeof createChallengesController>;
