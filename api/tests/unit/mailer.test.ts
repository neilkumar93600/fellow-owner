import { describe, expect, it, vi } from 'vitest';
import type { Env } from '../../src/config/env.js';
import type { Logger } from '../../src/lib/logger.js';
import { createMailer } from '../../src/lib/mailer.js';

function fakeLogger() {
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => logger,
  };
  return logger;
}

const env = {
  RESEND_API_KEY: undefined,
  EMAIL_FROM: 'Fellow Owners <noreply@example.com>',
} as unknown as Env;

describe('createMailer without RESEND_API_KEY', () => {
  it('logs the message instead of sending and never throws', async () => {
    const logger = fakeLogger();
    const mailer = createMailer({ env, logger: logger as unknown as Logger });
    await expect(
      mailer.send({
        to: 'priya@example.com',
        subject: 'Your weekly digest',
        text: 'Hello',
        headers: { 'List-Unsubscribe': '<https://example.com/u>' },
      }),
    ).resolves.toBeUndefined();
    expect(logger.info).toHaveBeenCalledTimes(1);
    const [fields] = logger.info.mock.calls[0] ?? [];
    expect(fields).toMatchObject({ subject: 'Your weekly digest' });
    // The address is masked in logs.
    expect(JSON.stringify(fields)).not.toContain('priya@example.com');
  });
});
