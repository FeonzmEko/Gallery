/**
 * Universal URL-Safe Base64 encoding and decoding
 * Compatible with Node.js, Cloudflare Workers, and standard Web Browsers.
 */

// Safe reference to Node's Buffer if present without requiring @types/node
interface BufferLike {
  from(str: string, encoding: string): { toString(encoding: string): string };
}

function getGlobalBuffer(): BufferLike | null {
  const g = globalThis as unknown as { Buffer?: BufferLike };
  return typeof g.Buffer !== 'undefined' && typeof g.Buffer.from === 'function' ? g.Buffer : null;
}

/**
 * Encode a string (UTF-8 supported) to URL-safe Base64 without padding '='.
 */
export function toUrlSafeBase64(input: string): string {
  const buffer = getGlobalBuffer();
  if (buffer) {
    return buffer.from(input, 'utf-8').toString('base64url');
  }

  // Universal browser / Workers fallback
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const base64 = btoa(binary);
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decode a URL-safe Base64 string to a UTF-8 string.
 * Returns null if the string is not valid base64 / base64url.
 */
export function fromUrlSafeBase64(encoded: string): string | null {
  try {
    const buffer = getGlobalBuffer();
    if (buffer) {
      return buffer.from(encoded, 'base64url').toString('utf-8');
    }

    // Universal browser / Workers fallback
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}
