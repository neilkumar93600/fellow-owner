import { demoSessionSchema } from '@fellow-owners/shared';
import type { Request, Response } from 'express';
import { CLIENT_IP_HEADER } from '../auth/index.js';
import { bodyOf } from '../middlewares/validate.js';
import type { DemoService } from '../services/demo.service.js';

export interface DemoControllerDeps {
  demo: DemoService;
}

/** The caller's user-agent and client IP, so the session row records the real visitor. Never cookies. */
function forwardedHeaders(req: Request): Headers {
  const headers = new Headers();
  const userAgent = req.get('user-agent');
  if (userAgent) headers.set('user-agent', userAgent);
  headers.set(CLIENT_IP_HEADER, req.clientIp);
  return headers;
}

export function createDemoController(deps: DemoControllerDeps) {
  return {
    /** POST /api/demo/session -> DemoSessionResponse, with the Better Auth session cookie. */
    async session(req: Request, res: Response): Promise<void> {
      const { as } = bodyOf(req, demoSessionSchema);
      const { setCookies, body } = await deps.demo.session(as, forwardedHeaders(req));
      for (const cookie of setCookies) res.append('Set-Cookie', cookie);
      res.json(body);
    },
  };
}

export type DemoController = ReturnType<typeof createDemoController>;
