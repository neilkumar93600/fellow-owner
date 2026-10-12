import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { AiUnavailableError } from '../../src/ai/types.js';
import { errorHandler, toAppError } from '../../src/middlewares/error-handler.js';

function pgError(code: string, constraint?: string) {
  return Object.assign(new Error('pg'), { code, constraint_name: constraint });
}

describe('toAppError', () => {
  it('answers a provider failure with a fixed message, not the upstream text', () => {
    const raw = 'AI coach failed: provider error 402: Insufficient credits on key sk-or-v1-abc';
    const mapped = toAppError(new AiUnavailableError('provider', raw));
    expect(mapped?.status).toBe(503);
    expect(mapped?.code).toBe('ai_unavailable');
    expect(mapped?.details).toEqual({ reason: 'provider' });
    expect(JSON.stringify(mapped?.toBody())).not.toMatch(/402|credits|sk-or/i);
  });

  it('keeps AI caps as a 429', () => {
    const mapped = toAppError(new AiUnavailableError('cap', 'AI task cap reached: model-x'));
    expect(mapped?.status).toBe(429);
    expect(mapped?.code).toBe('rate_limited');
    expect(mapped?.message).not.toMatch(/model-x/);
  });

  it('maps a framework error that carries a 4xx status (malformed path param) to that status', () => {
    const error = Object.assign(new URIError('URI malformed'), { status: 400 });
    expect(toAppError(error)?.status).toBe(400);
    expect(toAppError(error)?.code).toBe('bad_request');
    expect(toAppError(Object.assign(new Error('x'), { statusCode: 404 }))?.status).toBe(404);
  });

  it('does not treat a 5xx status or a plain error as a client error', () => {
    expect(toAppError(Object.assign(new Error('x'), { status: 502 }))).toBeNull();
    expect(toAppError(new Error('boom'))).toBeNull();
  });

  it('maps Postgres data exceptions (class 22) to 400', () => {
    for (const code of ['22003', '22007', '22008', '22001']) {
      expect(toAppError(pgError(code))?.status).toBe(400);
    }
    expect(toAppError(pgError('22P02'))?.status).toBe(400);
  });

  it('never returns a constraint name to the client', () => {
    for (const code of ['23505', '23503', '23514']) {
      const mapped = toAppError(pgError(code, 'spaces_owner_user_id_uidx'));
      expect(mapped).not.toBeNull();
      expect(JSON.stringify(mapped?.toBody())).not.toContain('spaces_owner_user_id_uidx');
    }
  });
});

describe('errorHandler', () => {
  it('logs the constraint server-side', () => {
    const log = { debug: vi.fn(), error: vi.fn(), warn: vi.fn() };
    const json = vi.fn();
    const res = { headersSent: false, status: vi.fn(() => ({ json })) } as unknown as Response;
    errorHandler()(
      pgError('23505', 'spaces_handle_uidx'),
      { log } as unknown as Request,
      res,
      vi.fn(),
    );
    expect(json).toHaveBeenCalledOnce();
    const logged = JSON.stringify([...log.debug.mock.calls, ...log.warn.mock.calls]);
    expect(logged).toContain('spaces_handle_uidx');
  });
});
