import type { Db } from '../db/client.js';

/**
 * F6 Media kit: the spaces.media_kit_enabled / media_kit_rates / media_kit_note columns
 * (db/schema/spaces.ts). Wave A skeleton (registered as repos.mediaKit); B4 adds the reads and the
 * settings update.
 */
export function createMediaKitRepo(_db: Db) {
  return {};
}

export type MediaKitRepo = ReturnType<typeof createMediaKitRepo>;
