import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Field encryption for secrets stored in the database (Instagram access tokens): AES-256-GCM with
 * FIELD_ENCRYPTION_KEY (32 random bytes, base64: `openssl rand -base64 32`).
 *
 * Ciphertext: `v1.<iv>.<tag>.<data>`, each part base64url, a fresh 12-byte IV per value and a
 * 16-byte tag, so a changed byte fails to decrypt instead of returning garbage. The version prefix
 * leaves room to rotate the key; the instagram_connections CHECK refuses anything that is not in
 * this shape, so a raw token cannot be stored by mistake.
 *
 * ponytail: one key, no rotation; add `v2` with a second key (decrypt both, encrypt v2) when needed.
 */

const VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const BASE64_KEY = /^[A-Za-z0-9+/_-]{43}=?$/;

/** The 32-byte key from its base64 (or base64url) text; null when it is anything else. */
export function decodeFieldKey(text: string): Buffer | null {
  const trimmed = text.trim();
  if (!BASE64_KEY.test(trimmed)) return null;
  const key = Buffer.from(trimmed, 'base64');
  return key.length === KEY_BYTES ? key : null;
}

export function isFieldEncryptionKey(text: string): boolean {
  return decodeFieldKey(text) !== null;
}

export interface FieldCipher {
  encrypt(plain: string): string;
  /** Throws on a value that is not this key's ciphertext (wrong key, tampered, wrong shape). */
  decrypt(ciphertext: string): string;
}

export function createFieldCipher(keyText: string): FieldCipher {
  const key = decodeFieldKey(keyText);
  if (!key) throw new Error('FIELD_ENCRYPTION_KEY must be 32 bytes, base64');
  return {
    encrypt(plain) {
      // Secrets are never empty, and the database CHECK wants a data part.
      if (!plain) throw new Error('Nothing to encrypt');
      const iv = randomBytes(IV_BYTES);
      const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
      const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();
      return `${VERSION}.${iv.toString('base64url')}.${tag.toString('base64url')}.${data.toString('base64url')}`;
    },
    decrypt(ciphertext) {
      const parts = ciphertext.split('.');
      const [version, ivText, tagText, dataText] = parts;
      if (parts.length !== 4 || version !== VERSION || !ivText || !tagText || !dataText) {
        throw new Error('Not a field ciphertext');
      }
      const iv = Buffer.from(ivText, 'base64url');
      const tag = Buffer.from(tagText, 'base64url');
      if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES)
        throw new Error('Not a field ciphertext');
      const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
      decipher.setAuthTag(tag);
      return Buffer.concat([
        decipher.update(Buffer.from(dataText, 'base64url')),
        decipher.final(),
      ]).toString('utf8');
    },
  };
}

/** The cipher for this process, or null without FIELD_ENCRYPTION_KEY (features storing secrets stay off). */
export function fieldCipherFrom(env: {
  FIELD_ENCRYPTION_KEY: string | undefined;
}): FieldCipher | null {
  return env.FIELD_ENCRYPTION_KEY ? createFieldCipher(env.FIELD_ENCRYPTION_KEY) : null;
}
