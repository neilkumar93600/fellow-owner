import { describe, expect, it } from 'vitest';
import { createSendThrottle } from '../../src/auth/email.js';
import { logger } from '../../src/lib/logger.js';

describe('createSendThrottle (memory store)', () => {
  it('allows one code per address per 60 s and 10 per UTC day', async () => {
    let now = Date.parse('2026-10-10T08:00:00Z');
    const throttle = createSendThrottle(null, logger, () => now);

    expect(await throttle.allow('Priya@Example.com')).toBe(true);
    // Same address (any case), inside the minute: dropped. Another address is not affected.
    expect(await throttle.allow('priya@example.com')).toBe(false);
    expect(await throttle.allow('raj@example.com')).toBe(true);

    for (let sent = 1; sent < 10; sent += 1) {
      now += 61_000;
      expect(await throttle.allow('priya@example.com')).toBe(true);
    }
    now += 61_000;
    expect(await throttle.allow('priya@example.com')).toBe(false);

    // The next UTC day starts a new count.
    now = Date.parse('2026-10-11T00:00:30Z');
    expect(await throttle.allow('priya@example.com')).toBe(true);
  });
});
