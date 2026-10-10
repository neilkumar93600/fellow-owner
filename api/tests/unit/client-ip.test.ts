import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import { clientIp } from '../../src/lib/client-ip.js';

const KEY = 'k'.repeat(40);
const env = { INTERNAL_API_KEY: KEY };

function req(headers: Record<string, string>, socket = '10.0.0.9'): Request {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    get: (name: string) => lower[name.toLowerCase()],
    socket: { remoteAddress: socket },
  } as unknown as Request;
}

describe('clientIp', () => {
  it('with the edge key: x-edge-client-ip from the web proxy wins over a rewritten X-Forwarded-For', () => {
    const r = req({
      'x-edge-key': KEY,
      'x-edge-client-ip': '203.0.113.9',
      'x-forwarded-for': '13.127.127.107',
      'x-real-ip': '13.127.127.107',
    });
    expect(clientIp(r, env)).toBe('203.0.113.9');
  });

  it('without the key: x-edge-client-ip is ignored', () => {
    const r = req({ 'x-edge-client-ip': '6.6.6.6', 'x-real-ip': '198.51.100.2' });
    expect(clientIp(r, env)).toBe('198.51.100.2');
  });

  it('with the edge key: the first X-Forwarded-For entry', () => {
    const r = req({
      'x-edge-key': KEY,
      'x-forwarded-for': '203.0.113.5, 76.76.21.1',
      'x-real-ip': '76.76.21.1',
    });
    expect(clientIp(r, env)).toBe('203.0.113.5');
  });

  it('with the edge key and no X-Forwarded-For: x-vercel-forwarded-for, then x-real-ip', () => {
    expect(clientIp(req({ 'x-edge-key': KEY, 'x-vercel-forwarded-for': '203.0.113.6' }), env)).toBe(
      '203.0.113.6',
    );
    expect(clientIp(req({ 'x-edge-key': KEY, 'x-real-ip': '203.0.113.7' }), env)).toBe(
      '203.0.113.7',
    );
  });

  it('without the key: x-real-ip, even when X-Forwarded-For is forged', () => {
    const r = req({ 'x-forwarded-for': '6.6.6.6', 'x-real-ip': '198.51.100.1' });
    expect(clientIp(r, env)).toBe('198.51.100.1');
  });

  it('with a wrong key: x-real-ip', () => {
    const r = req({
      'x-edge-key': 'w'.repeat(40),
      'x-forwarded-for': '6.6.6.6',
      'x-real-ip': '198.51.100.2',
    });
    expect(clientIp(r, env)).toBe('198.51.100.2');
  });

  it('with no key configured: X-Forwarded-For is never trusted', () => {
    const r = req({ 'x-edge-key': '', 'x-forwarded-for': '6.6.6.6' });
    expect(clientIp(r, { INTERNAL_API_KEY: undefined })).toBe('10.0.0.9');
  });

  it('nothing usable: the socket address (non-IP header values are ignored)', () => {
    expect(clientIp(req({}), env)).toBe('10.0.0.9');
    expect(clientIp(req({ 'x-real-ip': 'not-an-ip' }), env)).toBe('10.0.0.9');
  });
});
