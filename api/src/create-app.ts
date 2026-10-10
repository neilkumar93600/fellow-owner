import { toNodeHandler } from 'better-auth/node';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { AUTH_BASE_PATH } from './auth/index.js';
import type { Container } from './container.js';
import { errorHandler } from './middlewares/error-handler.js';
import { notFoundHandler } from './middlewares/not-found.js';
import { requestId, requestLogger } from './middlewares/request-id.js';
import { createApiRouter, createRootRouter } from './routes/index.js';

/**
 * The Express app: request id + logging, helmet, Better Auth (before express.json(), it reads
 * the raw body), JSON body parsing (100kb; 512kb for settings and space creation; 1mb for follower
 * imports), /api routes, /r/:code, 404, error handler.
 */
export function createApp(container: Container): Express {
  const app = express();
  app.disable('x-powered-by');
  // Behind Vercel and the Next.js rewrite: req.ip / protocol come from X-Forwarded-*.
  app.set('trust proxy', true);

  app.use(requestId(container.logger));
  app.use(requestLogger());
  app.use(helmet());

  app.all(`${AUTH_BASE_PATH}/*splat`, toNodeHandler(container.auth));

  // Follower imports send up to LIMITS.follower.importChars (200k) characters of CSV or pasted text.
  app.use('/api/studio/followers/import', express.json({ limit: '1mb' }));
  // Settings and space creation carry the avatar, which may be a data URL (up to 350k characters).
  app.use(['/api/studio/settings', '/api/studio/space'], express.json({ limit: '512kb' }));
  app.use(express.json({ limit: '100kb' }));
  app.use('/api', createApiRouter(container));
  app.use(createRootRouter(container));

  app.use(notFoundHandler());
  app.use(errorHandler());
  return app;
}
