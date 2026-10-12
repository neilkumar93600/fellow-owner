import type { Db } from '../db/client.js';

/**
 * F5 Instagram DM switch: instagram_connections (db/schema/brands.ts). The token column only ever
 * holds lib/crypto.ts ciphertext (a CHECK refuses anything else): encrypt before insert, decrypt
 * after read, never log either. Wave A skeleton (registered as repos.instagram); B4 adds the queries.
 */
export function createInstagramRepo(_db: Db) {
  return {};
}

export type InstagramRepo = ReturnType<typeof createInstagramRepo>;
