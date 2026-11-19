import { toUrlSafeBase64, fromUrlSafeBase64 } from '@archive/shared';

/**
 * Universal binary <-> hex helpers
 */
function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToUint8Array(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Constant-time comparison of two Uint8Arrays to prevent timing attacks
 */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/**
 * Hash a password using PBKDF2-HMAC-SHA256 (100,000 iterations).
 * Format: `pbkdf2:100000:<saltHex>:<hashHex>`
 */
export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 100000;
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    passwordKey,
    256
  );

  const hashBytes = new Uint8Array(derivedBits);
  return `pbkdf2:${iterations}:${bytesToHex(salt)}:${bytesToHex(hashBytes)}`;
}

/**
 * Verify a plain-text password against a stored password hash.
 */
export async function verifyPassword(password: string, storedHash?: string | null): Promise<boolean> {
  if (!storedHash) {
    return false;
  }

  if (storedHash.startsWith('pbkdf2:')) {
    const parts = storedHash.split(':');
    if (parts.length !== 4) {
      return false;
    }
    const iterations = parseInt(parts[1], 10);
    const salt = hexToBytes(parts[2]);
    const expectedHash = hexToBytes(parts[3]);

    const enc = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt as unknown as BufferSource,
        iterations,
        hash: 'SHA-256',
      },
      passwordKey,
      256
    );

    const derivedBytes = new Uint8Array(derivedBits);
    return timingSafeEqual(derivedBytes, expectedHash);
  }

  // Fallback for development/testing if plain text hash is used
  return password === storedHash;
}

/**
 * Sign a JWT token with HMAC-SHA256
 */
export async function signJwt(
  payload: Record<string, unknown>,
  secret: string,
  expiresInSeconds: number = 7 * 24 * 3600
): Promise<string> {
  const enc = new TextEncoder();
  const nowSec = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const fullPayload = {
    ...payload,
    iat: nowSec,
    exp: nowSec + expiresInSeconds,
  };

  const encodedHeader = toUrlSafeBase64(JSON.stringify(header));
  const encodedPayload = toUrlSafeBase64(JSON.stringify(fullPayload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(signingInput));
  const encodedSignature = uint8ArrayToBase64Url(new Uint8Array(signature));

  return `${signingInput}.${encodedSignature}`;
}

/**
 * Verify and decode an HMAC-SHA256 JWT token
 */
export async function verifyJwt<T extends Record<string, unknown> = Record<string, unknown>>(
  token: string,
  secret: string
): Promise<T | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBytes = base64UrlToUint8Array(encodedSignature);
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes as unknown as BufferSource,
      enc.encode(signingInput)
    );

    if (!isValid) {
      return null;
    }

    const payloadJson = fromUrlSafeBase64(encodedPayload);
    if (!payloadJson) {
      return null;
    }

    const payload = JSON.parse(payloadJson) as T;
    const exp = (payload as Record<string, unknown>).exp;
    if (typeof exp === 'number') {
      const nowSec = Math.floor(Date.now() / 1000);
      if (nowSec >= exp) {
        return null; // Expired
      }
    }

    return payload;
  } catch {
    return null;
  }
}
