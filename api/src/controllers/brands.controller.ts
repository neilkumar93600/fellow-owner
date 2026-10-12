import {
  brandRequestsQuerySchema,
  handleIdParamsSchema,
  handleParamsSchema,
  inboundEmailSchema,
  updateBrandRequestSchema,
  workWithMeSchema,
} from '@fellow-owners/shared';
import type { Request, Response } from 'express';
import { userIdOf } from '../middlewares/require-session.js';
import { bodyOf, paramsOf, queryOf } from '../middlewares/validate.js';
import type { AccessService, OwnerContext } from '../services/access.service.js';
import type { BrandsService } from '../services/brands.service.js';

/**
 * F5 Brand inbox: the public work-with-me form, the owner's inbox under /api/spaces/:handle
 * (requireSpaceOwner), and the signed email webhook (POST /api/inbound/email).
 */
export function createBrandsController(deps: { access: AccessService; brands: BrandsService }) {
  const ownerOf = (req: Request): OwnerContext =>
    deps.access.assertOwner({
      userId: userIdOf(req),
      space: req.space,
      membership: req.membership,
    });

  return {
    /** POST /api/spaces/:handle/work-with-me -> WorkWithMeReceipt (201) */
    async submit(req: Request, res: Response): Promise<void> {
      const { handle } = paramsOf(req, handleParamsSchema);
      const receipt = await deps.brands.submit(handle, bodyOf(req, workWithMeSchema), {
        ip: req.clientIp,
        userAgent: req.get('user-agent') ?? null,
      });
      res.status(201).json(receipt);
    },

    /** GET /api/spaces/:handle/brand-requests -> BrandRequestsPage */
    async list(req: Request, res: Response): Promise<void> {
      res.json(await deps.brands.list(ownerOf(req), queryOf(req, brandRequestsQuerySchema)));
    },

    /** GET /api/spaces/:handle/brand-requests/:id -> BrandRequestDetail */
    async get(req: Request, res: Response): Promise<void> {
      res.json(await deps.brands.get(ownerOf(req), paramsOf(req, handleIdParamsSchema).id));
    },

    /** PATCH /api/spaces/:handle/brand-requests/:id -> BrandRequest */
    async update(req: Request, res: Response): Promise<void> {
      const { id } = paramsOf(req, handleIdParamsSchema);
      res.json(await deps.brands.update(ownerOf(req), id, bodyOf(req, updateBrandRequestSchema)));
    },

    /** GET /api/spaces/:handle/brand-pick -> BrandPick */
    async pick(req: Request, res: Response): Promise<void> {
      res.json(await deps.brands.pick(ownerOf(req)));
    },

    /** GET /api/spaces/:handle/brand-settings -> BrandSettings */
    async settings(req: Request, res: Response): Promise<void> {
      res.json(await deps.brands.settings(ownerOf(req)));
    },

    /** POST /api/spaces/:handle/brand-settings/alias -> BrandSettings */
    async rotateAlias(req: Request, res: Response): Promise<void> {
      res.json(await deps.brands.rotateAlias(ownerOf(req)));
    },

    /** POST /api/inbound/email (signed) -> 204 */
    async receiveEmail(req: Request, res: Response): Promise<void> {
      await deps.brands.receiveEmail(bodyOf(req, inboundEmailSchema));
      res.status(204).end();
    },
  };
}

export type BrandsController = ReturnType<typeof createBrandsController>;
