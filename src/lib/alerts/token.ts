/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * HMAC-SHA256 token signing for alert verification and unsubscribe links.
 * Uses Web Crypto API — no external dependencies.
 */

const ALGORITHM = { name: 'HMAC', hash: 'SHA-256' } as const;

function getSecret(): string {
  const secret = process.env.ALERT_TOKEN_SECRET;
  if (!secret) {
    throw new Error('ALERT_TOKEN_SECRET environment variable is required');
  }
  return secret;
}

async function getKey(): Promise<CryptoKey> {
  const secret = getSecret();
  const encoder = new TextEncoder();
  return crypto.subtle.importKey('raw', encoder.encode(secret), ALGORITHM, false, [
    'sign',
    'verify',
  ]);
}

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export interface TokenPayload {
  /** Email hash */
  sub: string;
  /** Alert purposes plus the weekly digest's own verify/unsubscribe pair */
  purpose: 'verify' | 'unsub' | 'manage' | 'digest-verify' | 'digest-unsub';
  /** Issued at (epoch seconds) */
  iat: number;
  /** Expires at (epoch seconds) */
  exp: number;
}

/**
 * Create a signed token encoding the given payload.
 * Format: base64url(payload).base64url(signature)
 */
export async function createToken(
  emailHash: string,
  purpose: TokenPayload['purpose'],
  ttlSeconds: number = 7 * 24 * 60 * 60 // 7 days default
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    sub: emailHash,
    purpose,
    iat: now,
    exp: now + ttlSeconds,
  };

  const encoder = new TextEncoder();
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = toBase64Url(encoder.encode(payloadStr));

  const key = await getKey();
  const signature = await crypto.subtle.sign(ALGORITHM.name, key, encoder.encode(payloadB64));
  const signatureB64 = toBase64Url(signature);

  return `${payloadB64}.${signatureB64}`;
}

/**
 * Verify and decode a signed token.
 * Returns null if invalid, expired, or tampered.
 */
export async function verifyToken(
  token: string,
  expectedPurpose: TokenPayload['purpose']
): Promise<TokenPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, signatureB64] = parts;
  if (!payloadB64 || !signatureB64) return null;

  try {
    const key = await getKey();
    const encoder = new TextEncoder();
    const signatureBytes = fromBase64Url(signatureB64);

    const valid = await crypto.subtle.verify(
      ALGORITHM.name,
      key,
      signatureBytes,
      encoder.encode(payloadB64)
    );

    if (!valid) return null;

    const payloadBytes = fromBase64Url(payloadB64);
    const decoder = new TextDecoder();
    const payload = JSON.parse(decoder.decode(payloadBytes)) as TokenPayload;

    if (payload.purpose !== expectedPurpose) return null;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Hash an email address with SHA-256 for use as a Redis key.
 * Normalizes to lowercase and trims whitespace.
 */
export async function hashEmail(email: string): Promise<string> {
  const normalized = email.toLowerCase().trim();
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(normalized));
  return toBase64Url(hash);
}
