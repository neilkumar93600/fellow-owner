import {
  aiFeedbackSchema,
  communityDetailQuerySchema,
  createCommunitySchema,
  createPromotionSchema,
  createSpaceSchema,
  handleCheckQuerySchema,
  ideasQuerySchema,
  idParamsSchema,
  inboxQuerySchema,
  membershipParamsSchema,
  peopleQuerySchema,
  promotionActionSchema,
  promotionPostParamsSchema,
  promotionsQuerySchema,
  setPersonCommunitiesSchema,
  spotlightSchema,
  studioCommunityParamsSchema,
  studioPitchActionSchema,
  studioPostActionSchema,
  updateCommunitySchema,
  updateSettingsSchema,
} from '@fellow-owners/shared';
import type { Request, Response } from 'express';
import { sessionOf } from '../middlewares/require-session.js';
import { bodyOf, paramsOf, queryOf } from '../middlewares/validate.js';
import type { AccessService, OwnerContext } from '../services/access.service.js';
import type { BriefingService } from '../services/briefing.service.js';
import type { CommunitiesService } from '../services/communities.service.js';
import type { DiscoveryService } from '../services/discovery.service.js';
import type { MembershipsService } from '../services/memberships.service.js';
import type { OverviewService } from '../services/overview.service.js';
import type { PitchesService } from '../services/pitches.service.js';
import type { PostsService } from '../services/posts.service.js';
import type { PromotionsService } from '../services/promotions.service.js';
import type { SpacesService } from '../services/spaces.service.js';

export interface StudioControllerDeps {
  access: AccessService;
  spaces: SpacesService;
  overview: OverviewService;
  briefing: BriefingService;
  pitches: PitchesService;
  discovery: DiscoveryService;
  posts: PostsService;
  memberships: MembershipsService;
  communities: CommunitiesService;
  promotions: PromotionsService;
}

/** /api/studio/*: the caller's own space, resolved by requireOwner and re-checked here. */
export function createStudioController(deps: StudioControllerDeps) {
  const { access } = deps;

  const ownerOf = (req: Request): OwnerContext =>
    access.assertOwner({
      userId: sessionOf(req).user.id,
      space: req.space,
      membership: req.membership,
    });

  return {
    // ---------------------------------------------------------------- space and onboarding

    /** GET /space -> StudioSpace (404 when the user has no space yet) */
    async getSpace(req: Request, res: Response): Promise<void> {
      res.json(await deps.spaces.studioSpace(ownerOf(req).space));
    },

    /** GET /handle-check?handle= -> HandleCheck */
    async handleCheck(req: Request, res: Response): Promise<void> {
      const { handle } = queryOf(req, handleCheckQuerySchema);
      res.json(await deps.spaces.checkHandle(handle, sessionOf(req).user.id));
    },

    /** POST /space -> StudioSpace (201) */
    async createSpace(req: Request, res: Response): Promise<void> {
      const { user } = sessionOf(req);
      const space = await deps.spaces.create(
        { id: user.id, image: user.image ?? null },
        bodyOf(req, createSpaceSchema),
      );
      res.status(201).json(space);
    },

    /** PUT /settings -> StudioSpace */
    async updateSettings(req: Request, res: Response): Promise<void> {
      res.json(await deps.spaces.updateSettings(ownerOf(req), bodyOf(req, updateSettingsSchema)));
    },

    // ---------------------------------------------------------------- today

    /** GET /overview -> Overview */
    async overview(req: Request, res: Response): Promise<void> {
      res.json(await deps.overview.overview(ownerOf(req)));
    },

    /** POST /sweep -> SweepResponse */
    async sweep(req: Request, res: Response): Promise<void> {
      res.json(await deps.overview.sweep(ownerOf(req)));
    },

    /** GET /briefing -> Briefing */
    async briefing(req: Request, res: Response): Promise<void> {
      res.json(await deps.briefing.get(ownerOf(req)));
    },

    /** POST /briefing/regenerate -> Briefing */
    async regenerateBriefing(req: Request, res: Response): Promise<void> {
      res.json(await deps.briefing.regenerate(ownerOf(req)));
    },

    /** POST /feedback -> FeedbackResponse */
    async feedback(req: Request, res: Response): Promise<void> {
      res.json(await deps.briefing.feedback(ownerOf(req), bodyOf(req, aiFeedbackSchema)));
    },

    // ---------------------------------------------------------------- inbox

    /** GET /inbox -> InboxPage */
    async inbox(req: Request, res: Response): Promise<void> {
      res.json(await deps.pitches.inbox(ownerOf(req), queryOf(req, inboxQuerySchema)));
    },

    /** GET /inbox/:id -> InboxDetail */
    async inboxDetail(req: Request, res: Response): Promise<void> {
      const { id } = paramsOf(req, idParamsSchema);
      res.json(await deps.pitches.inboxDetail(ownerOf(req), id));
    },

    /** PATCH /inbox/:id -> InboxDetail */
    async inboxAction(req: Request, res: Response): Promise<void> {
      const { id } = paramsOf(req, idParamsSchema);
      res.json(await deps.pitches.act(ownerOf(req), id, bodyOf(req, studioPitchActionSchema)));
    },

    /** POST /inbox/:id/suggest-reply -> { reply } (429 at the daily cap, 503 AI unavailable) */
    async suggestReply(req: Request, res: Response): Promise<void> {
      const { id } = paramsOf(req, idParamsSchema);
      res.json(await deps.promotions.suggestReply(ownerOf(req), id));
    },

    // ---------------------------------------------------------------- ideas and posts

    /** GET /ideas -> IdeasPage */
    async ideas(req: Request, res: Response): Promise<void> {
      res.json(await deps.discovery.ideas(ownerOf(req), queryOf(req, ideasQuerySchema)));
    },

    /** GET /posts/:id -> StudioPostDetail */
    async postDetail(req: Request, res: Response): Promise<void> {
      const { id } = paramsOf(req, idParamsSchema);
      res.json(await deps.posts.studioDetail(ownerOf(req), id));
    },

    /** PATCH /posts/:id -> StudioPostDetail */
    async postAction(req: Request, res: Response): Promise<void> {
      const { id } = paramsOf(req, idParamsSchema);
      const { action } = bodyOf(req, studioPostActionSchema);
      res.json(await deps.posts.studioAction(ownerOf(req), id, action));
    },

    /** POST /posts/:id/love -> { lovedAt } */
    async lovePost(req: Request, res: Response): Promise<void> {
      const { id } = paramsOf(req, idParamsSchema);
      res.json(await deps.posts.love(ownerOf(req), id, true));
    },

    /** DELETE /posts/:id/love -> { lovedAt: null } */
    async unlovePost(req: Request, res: Response): Promise<void> {
      const { id } = paramsOf(req, idParamsSchema);
      res.json(await deps.posts.love(ownerOf(req), id, false));
    },

    // ---------------------------------------------------------------- people

    /** GET /people -> PeoplePage */
    async people(req: Request, res: Response): Promise<void> {
      res.json(await deps.discovery.people(ownerOf(req), queryOf(req, peopleQuerySchema)));
    },

    /** DELETE /people/:membershipId -> 204 */
    async removePerson(req: Request, res: Response): Promise<void> {
      const { membershipId } = paramsOf(req, membershipParamsSchema);
      await deps.memberships.remove(ownerOf(req), membershipId);
      res.status(204).end();
    },

    /** PUT /people/:membershipId/communities -> PersonRow */
    async setPersonCommunities(req: Request, res: Response): Promise<void> {
      const { membershipId } = paramsOf(req, membershipParamsSchema);
      const { communityIds } = bodyOf(req, setPersonCommunitiesSchema);
      res.json(await deps.memberships.setCommunities(ownerOf(req), membershipId, communityIds));
    },

    /** POST /people/:membershipId/spotlight/draft -> { note } */
    async draftSpotlight(req: Request, res: Response): Promise<void> {
      const { membershipId } = paramsOf(req, membershipParamsSchema);
      res.json(await deps.promotions.draftSpotlight(ownerOf(req), membershipId));
    },

    /** PUT /people/:membershipId/spotlight -> FanSpotlight */
    async setSpotlight(req: Request, res: Response): Promise<void> {
      const { membershipId } = paramsOf(req, membershipParamsSchema);
      const { note } = bodyOf(req, spotlightSchema);
      res.json(await deps.promotions.setSpotlight(ownerOf(req), membershipId, note));
    },

    /** DELETE /people/:membershipId/spotlight -> 204 */
    async clearSpotlight(req: Request, res: Response): Promise<void> {
      const { membershipId } = paramsOf(req, membershipParamsSchema);
      await deps.promotions.clearSpotlight(ownerOf(req), membershipId);
      res.status(204).end();
    },

    // ---------------------------------------------------------------- communities

    /** GET /communities -> StudioCommunity[] */
    async communities(req: Request, res: Response): Promise<void> {
      res.json(await deps.communities.studioList(ownerOf(req)));
    },

    /** POST /communities -> StudioCommunity (201) */
    async createCommunity(req: Request, res: Response): Promise<void> {
      const community = await deps.communities.create(
        ownerOf(req),
        bodyOf(req, createCommunitySchema),
      );
      res.status(201).json(community);
    },

    /** GET /communities/:slug -> StudioCommunityDetail */
    async communityDetail(req: Request, res: Response): Promise<void> {
      const { slug } = paramsOf(req, studioCommunityParamsSchema);
      res.json(
        await deps.communities.detail(ownerOf(req), slug, queryOf(req, communityDetailQuerySchema)),
      );
    },

    /** PATCH /communities/:id -> StudioCommunity */
    async updateCommunity(req: Request, res: Response): Promise<void> {
      const { id } = paramsOf(req, idParamsSchema);
      res.json(await deps.communities.update(ownerOf(req), id, bodyOf(req, updateCommunitySchema)));
    },

    // ---------------------------------------------------------------- promotions

    /** GET /promotions -> PromotionsPage */
    async promotions(req: Request, res: Response): Promise<void> {
      res.json(await deps.promotions.list(ownerOf(req), queryOf(req, promotionsQuerySchema)));
    },

    /** GET /promotions/post/:postId -> PromotionComposer */
    async promotionComposer(req: Request, res: Response): Promise<void> {
      const { postId } = paramsOf(req, promotionPostParamsSchema);
      res.json(await deps.promotions.composer(ownerOf(req), postId));
    },

    /** POST /promotions -> Promotion (201 created, 200 when it already existed) */
    async createPromotion(req: Request, res: Response): Promise<void> {
      const { postId } = bodyOf(req, createPromotionSchema);
      const { promotion, created } = await deps.promotions.create(ownerOf(req), postId);
      res.status(created ? 201 : 200).json(promotion);
    },

    /** PATCH /promotions/:id -> Promotion */
    async promotionAction(req: Request, res: Response): Promise<void> {
      const { id } = paramsOf(req, idParamsSchema);
      res.json(await deps.promotions.act(ownerOf(req), id, bodyOf(req, promotionActionSchema)));
    },
  };
}

export type StudioController = ReturnType<typeof createStudioController>;
