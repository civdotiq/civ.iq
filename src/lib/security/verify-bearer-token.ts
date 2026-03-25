/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { timingSafeEqual } from 'crypto';

/**
 * Verify a Bearer token using timing-safe comparison.
 * Prevents timing attacks that could leak token information.
 *
 * @param authHeader - The Authorization header value (e.g. "Bearer <token>")
 * @param secret - The expected secret to compare against
 * @returns true if the token matches the secret
 */
export function verifyBearerToken(authHeader: string | null, secret: string): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);

  if (token.length !== secret.length) {
    return false;
  }

  try {
    return timingSafeEqual(Buffer.from(token, 'utf8'), Buffer.from(secret, 'utf8'));
  } catch {
    return false;
  }
}
