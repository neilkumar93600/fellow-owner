import { buildContainer } from './container.js';
import { createApp } from './create-app.js';
import { closeDb } from './db/client.js';
import { closeRedis } from './lib/redis.js';

/** Long-lived local server (pnpm dev / Docker): listens on PORT and shuts down gracefully. */
const container = buildContainer();
const { env, logger } = container;
const app = createApp(container);

const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, env: env.NODE_ENV, ai: container.ai.mode, version: env.APP_VERSION },
    `API listening on http://localhost:${env.PORT}`,
  );
  if (env.isProduction && container.ai.mode === 'fake') {
    logger.warn('AI is running on the fake in production: set OPENROUTER_API_KEY and AI_ENABLED');
  }
});
// Outlive the proxy's idle keep-alive (Railway/load balancers ~60 s) so it never reuses a socket
// we already closed (intermittent 502s); headersTimeout must exceed keepAliveTimeout.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

server.on('error', (error) => {
  logger.fatal({ err: error }, 'server failed to start');
  process.exit(1);
});

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'shutting down');
  const force = setTimeout(() => {
    logger.error('shutdown timed out, exiting');
    process.exit(1);
  }, 15_000);
  force.unref();
  const closed = new Promise<void>((resolve) => server.close(() => resolve()));
  // Open notification streams would hold server.close() open: end them (EventSource reconnects,
  // reaching the next deployment).
  container.controllers.notifications.closeStreams();
  await closed;
  await Promise.race([
    container.background.whenIdle(),
    new Promise((resolve) => setTimeout(resolve, 10_000)),
  ]);
  await closeDb();
  closeRedis();
  logger.info('bye');
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'unhandled rejection');
});
