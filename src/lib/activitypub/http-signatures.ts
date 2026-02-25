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

interface SignatureHeaders {
  Signature: string;
  Date: string;
  Digest: string;
}

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
    `(request-target): ${method.toLowerCase()} ${url.pathname}`,
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

/**
 * Verify an incoming HTTP signature.
 * Fetches the remote actor's public key and validates.
 */
export async function verifySignature(
  method: string,
  path: string,
  headers: Record<string, string>
): Promise<{ valid: boolean; actor?: string; error?: string }> {
  const sigHeader = headers['signature'];
  if (!sigHeader) {
    return { valid: false, error: 'No Signature header' };
  }

  // Parse signature header
  const params: Record<string, string> = {};
  for (const part of sigHeader.split(',')) {
    const match = part.match(/^(\w+)="(.+)"$/);
    if (match?.[1] && match[2]) {
      params[match[1]] = match[2];
    }
  }

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

  // Fetch remote actor to get public key
  const actorUrl = keyId.split('#')[0];
  if (!actorUrl) {
    return { valid: false, error: 'Invalid keyId format' };
  }

  try {
    const actorResponse = await fetch(actorUrl, {
      headers: { Accept: 'application/activity+json, application/ld+json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!actorResponse.ok) {
      return { valid: false, error: `Failed to fetch actor: ${actorResponse.status}` };
    }

    const actor = await actorResponse.json();
    const publicKeyPem = actor?.publicKey?.publicKeyPem;
    if (!publicKeyPem) {
      return { valid: false, error: 'No public key found on actor' };
    }

    // Reconstruct signing string
    const signingParts = signedHeaders.map(header => {
      if (header === '(request-target)') {
        return `(request-target): ${method.toLowerCase()} ${path}`;
      }
      return `${header}: ${headers[header] || ''}`;
    });
    const signingString = signingParts.join('\n');

    // Verify
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(signingString);
    const valid = verifier.verify(publicKeyPem, signature, 'base64');

    return { valid, actor: actorUrl };
  } catch (error) {
    return {
      valid: false,
      error: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
