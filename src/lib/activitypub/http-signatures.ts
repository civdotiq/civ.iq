/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * HTTP Signatures for ActivityPub Server-to-Server Auth
 *
 * Implements draft-cavage-http-signatures (used by Mastodon/Pleroma).
 * Signs outgoing POST requests to follower inboxes.
 */

import crypto from 'crypto';
import { getPrivateKeyPem } from './actor';
import { activitypubConfig } from '@/config/activitypub.config';
import { getRedisCache } from '@/lib/cache/redis-client';
import logger from '@/lib/logging/simple-logger';

interface SignatureHeaders {
  Signature: string;
  Date: string;
  Digest: string;
}

const ACTOR_CACHE_PREFIX = 'activitypub:actor-cache:';
const ACTOR_CACHE_TTL = 3600; // 1 hour

/**
 * Sign an outgoing HTTP request for ActivityPub federation.
 * Uses RSA-SHA256 as required by Mastodon.
 */
export function signRequest(
  method: string,
  targetUrl: string,
  body: string
): SignatureHeaders | null {
  const privateKey = getPrivateKeyPem();
  if (!privateKey) return null;

  const url = new URL(targetUrl);
  const date = new Date().toUTCString();

  // Compute digest of body
  const digest = `SHA-256=${crypto.createHash('sha256').update(body).digest('base64')}`;

  // Build signing string
  const signingString = [
    `(request-target): ${method.toLowerCase()} ${url.pathname}${url.search}`,
    `host: ${url.host}`,
    `date: ${date}`,
    `digest: ${digest}`,
  ].join('\n');

  // Sign with RSA-SHA256
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingString);
  const signature = signer.sign(privateKey, 'base64');

  const keyId = activitypubConfig.actor.keyId;
  const signatureHeader = [
    `keyId="${keyId}"`,
    `algorithm="rsa-sha256"`,
    `headers="(request-target) host date digest"`,
    `signature="${signature}"`,
  ].join(',');

  return {
    Signature: signatureHeader,
    Date: date,
    Digest: digest,
  };
}

/** Fetch a remote actor document, with Redis caching (1h TTL) */
async function fetchActorCached(actorUrl: string): Promise<{ publicKeyPem?: string } | null> {
  const cache = getRedisCache();
  const cacheKey = `${ACTOR_CACHE_PREFIX}${encodeURIComponent(actorUrl)}`;

  // Check cache first
  const cached = await cache.get<{ publicKeyPem: string }>(cacheKey);
  if (cached?.publicKeyPem) {
    return cached;
  }

  try {
    const actorResponse = await fetch(actorUrl, {
      headers: { Accept: 'application/activity+json, application/ld+json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!actorResponse.ok) {
      return null;
    }

    const actor = await actorResponse.json();
    const publicKeyPem = actor?.publicKey?.publicKeyPem;
    if (!publicKeyPem) {
      return null;
    }

    // Cache the key
    await cache.set(cacheKey, { publicKeyPem }, ACTOR_CACHE_TTL);
    return { publicKeyPem };
  } catch (error) {
    logger.warn('Failed to fetch remote actor', {
      actorUrl,
      error: error instanceof Error ? error.message : 'Unknown',
      operation: 'activitypub_signatures',
    });
    return null;
  }
}

/**
 * Verify an incoming HTTP signature.
 * Fetches the remote actor's public key and validates.
 * When body is provided, also verifies the Digest header matches.
 */
/**
 * Parse a Signature header into key-value pairs.
 * Handles base64 values containing `=` and `+/` characters correctly
 * by matching `key="value"` pairs with a global regex rather than
 * splitting on commas (which is fragile).
 */
function parseSignatureHeader(header: string): Record<string, string> {
  const params: Record<string, string> = {};
  const re = /(\w+)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(header)) !== null) {
    if (m[1] && m[2] !== undefined) {
      params[m[1]] = m[2];
    }
  }
  return params;
}

/**
 * Normalize header keys to lowercase so lookups work regardless of
 * how the caller cased them (HTTP headers are case-insensitive per RFC 9110).
 */
function normalizeHeaders(headers: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = value;
  }
  return normalized;
}

export async function verifySignature(
  method: string,
  path: string,
  headers: Record<string, string>,
  body?: string
): Promise<{ valid: boolean; actor?: string; error?: string }> {
  const lc = normalizeHeaders(headers);

  const sigHeader = lc['signature'];
  if (!sigHeader) {
    return { valid: false, error: 'No Signature header' };
  }

  // Parse signature header using proper quoted-string extraction
  const params = parseSignatureHeader(sigHeader);

  const keyId = params['keyId'];
  const algorithm = params['algorithm'];
  const signedHeaders = params['headers']?.split(' ') ?? [];
  const signature = params['signature'];

  if (!keyId || !signature || !algorithm) {
    return { valid: false, error: 'Incomplete Signature header' };
  }

  if (algorithm !== 'rsa-sha256') {
    return { valid: false, error: `Unsupported algorithm: ${algorithm}` };
  }

  // Verify body digest if body is provided and digest is in signed headers
  if (body !== undefined && signedHeaders.includes('digest')) {
    const expectedDigest = `SHA-256=${crypto.createHash('sha256').update(body).digest('base64')}`;
    const actualDigest = lc['digest'] ?? '';
    if (actualDigest !== expectedDigest) {
      return { valid: false, error: 'Digest mismatch' };
    }
  }

  // Fetch remote actor to get public key (with caching)
  const actorUrl = keyId.split('#')[0];
  if (!actorUrl) {
    return { valid: false, error: 'Invalid keyId format' };
  }

  try {
    const actor = await fetchActorCached(actorUrl);
    if (!actor?.publicKeyPem) {
      return { valid: false, error: 'No public key found on actor' };
    }

    // Reconstruct signing string using lowercase header names for lookup
    const signingParts = signedHeaders.map(header => {
      if (header === '(request-target)') {
        return `(request-target): ${method.toLowerCase()} ${path}`;
      }
      return `${header}: ${lc[header] || ''}`;
    });
    const signingString = signingParts.join('\n');

    // Verify
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(signingString);
    const valid = verifier.verify(actor.publicKeyPem, signature, 'base64');

    return { valid, actor: actorUrl };
  } catch (error) {
    return {
      valid: false,
      error: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
