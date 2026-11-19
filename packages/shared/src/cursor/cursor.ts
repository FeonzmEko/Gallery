import { toUrlSafeBase64, fromUrlSafeBase64 } from './base64url.js';

/**
 * Generic Cursor encoding:
 * Serializes any serializable object to a URL-safe Base64 string.
 */
export function encodeCursor<T extends object>(data: T): string {
  const jsonStr = JSON.stringify(data);
  return toUrlSafeBase64(jsonStr);
}

/**
 * Generic Cursor decoding:
 * Parses a URL-safe Base64 string back into an object of type T.
 * Returns null if the cursor is malformed or invalid JSON.
 */
export function decodeCursor<T extends object>(
  cursorStr: string,
  validator?: (data: unknown) => data is T
): T | null {
  if (!cursorStr || typeof cursorStr !== 'string') {
    return null;
  }

  const rawJson = fromUrlSafeBase64(cursorStr);
  if (!rawJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawJson);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null;
    }

    if (validator && !validator(parsed)) {
      return null;
    }

    return parsed as T;
  } catch {
    return null;
  }
}
