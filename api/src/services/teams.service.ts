import type { PostDetail } from '@fellow-owners/shared';
import type { Db, DbOrTx } from '../db/client.js';
import { badRequest, conflict, forbidden, notFound, validationError } from '../lib/errors.js';
import type { Logger } from '../lib/logger.js';
import { isLeadRole, matchRole, roleKey } from '../lib/present.js';
import type { Repos } from '../repositories/index.js';
import type { AccessService } from './access.service.js';
import type { PostsService } from './posts.service.js';

export interface TeamsServiceDeps {
  db: Db;
  repos: Repos;
  access: AccessService;
  posts: PostsService;
  logger: Logger;
}

/**
 * Project teams (05 §2 team_members, §7): only projects have teams; a member requests a role that
 * the project lists and nobody holds yet; the project author accepts or declines. A role is
 * filled when one accepted member holds it. Decisions lock the post row so two accepts cannot
 * fill one role.
 */
export function createTeamsService(deps: TeamsServiceDeps) {
  const { db, repos, access, posts } = deps;
  const log = deps.logger.child({ module: 'teams' });

  /** The accepted member holding `role` (case-insensitive), if any. */
  async function roleHolder(postId: string, role: string, tx: DbOrTx) {
    const accepted = await repos.teams.listByPost(postId, { statuses: ['accepted'] }, tx);
    return accepted.find((row) => roleKey(row.role) === roleKey(role)) ?? null;
  }

  return {
    /** POST /api/posts/:id/team: request an open role (status `requested`). */
    async request(postId: string, userId: string, role: string): Promise<PostDetail> {
      const ctx = await access.requirePostAccess(postId, userId);
      const { post, membership } = ctx;
      if (post.type !== 'project') throw badRequest('Only projects have teams');
      const matched = matchRole(post.rolesNeeded, role);
      if (!matched) {
        throw validationError([
          {
            location: 'body',
            path: ['role'],
            message: "This project isn't looking for that role",
            code: 'custom',
          },
        ]);
      }

      await db.transaction(async (tx) => {
        const locked = await repos.posts.lockForUpdate(ctx.space.id, post.id, tx);
        if (!locked || locked.deletedAt || locked.hiddenAt) throw notFound('Post');
        const existing = await repos.teams.find(post.id, membership.id, tx);
        if (existing) {
          throw conflict(
            isLeadRole(existing.role)
              ? 'You lead this project'
              : existing.status === 'declined'
                ? 'Your request to join this team was declined'
                : "You're already on this team",
          );
        }
        if (await roleHolder(post.id, matched, tx)) throw conflict('This role is already filled');
        const inserted = await repos.teams.insert(
          { postId: post.id, membershipId: membership.id, role: matched, status: 'requested' },
          tx,
        );
        if (!inserted) throw conflict("You're already on this team");
      });
      log.debug({ postId, membershipId: membership.id, role: matched }, 'team role requested');
      return posts.buildDetail(ctx.space, post, membership);
    },

    /** PATCH /api/posts/:id/team/:membershipId (project author): accept or decline. */
    async decide(
      postId: string,
      userId: string,
      memberId: string,
      status: 'accepted' | 'declined',
    ): Promise<PostDetail> {
      const ctx = await access.requirePostAccess(postId, userId);
      const { post, membership } = ctx;
      if (post.authorMembershipId !== membership.id) {
        throw forbidden('Only the project author can decide on team requests');
      }
      if (post.type !== 'project') throw badRequest('Only projects have teams');

      await db.transaction(async (tx) => {
        const locked = await repos.posts.lockForUpdate(ctx.space.id, post.id, tx);
        if (!locked || locked.deletedAt) throw notFound('Post');
        const row = await repos.teams.find(post.id, memberId, tx);
        if (!row) throw notFound('Team request');
        if (isLeadRole(row.role) || row.membershipId === post.authorMembershipId) {
          throw badRequest("The project lead's place on the team can't be changed");
        }
        if (row.status === status) return;
        if (status === 'accepted') {
          const requester = await repos.memberships.findById(ctx.space.id, memberId, tx);
          if (!requester || requester.removedAt) {
            throw conflict('This member is no longer part of the space');
          }
          const holder = await roleHolder(post.id, row.role, tx);
          if (holder && holder.membershipId !== memberId) {
            throw conflict('This role is already filled');
          }
        }
        await repos.teams.decide(post.id, memberId, status, tx);
      });
      log.debug({ postId, memberId, status }, 'team request decided');
      return posts.buildDetail(ctx.space, post, membership);
    },
  };
}

export type TeamsService = ReturnType<typeof createTeamsService>;
