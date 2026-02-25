/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * ActivityPub Actor Configuration
 *
 * Builds the JSON-LD Actor document for WebFinger discovery
 * and ActivityPub federation.
 */

import { activitypubConfig } from '@/config/activitypub.config';
import type { APActor } from '@/types/activitypub';

/**
 * Get the RSA public key PEM from environment.
 * Returns empty string if not configured (federation disabled).
 */
export function getPublicKeyPem(): string {
  return process.env.ACTIVITYPUB_PUBLIC_KEY?.replace(/\\n/g, '\n') || '';
}

/**
 * Get the RSA private key PEM from environment.
 * Returns empty string if not configured (federation disabled).
 */
export function getPrivateKeyPem(): string {
  return process.env.ACTIVITYPUB_PRIVATE_KEY?.replace(/\\n/g, '\n') || '';
}

/** Check if ActivityPub federation is configured (has keys) */
export function isFederationEnabled(): boolean {
  return !!getPublicKeyPem() && !!getPrivateKeyPem();
}

/** Build the Actor JSON-LD document */
export function buildActorDocument(): APActor {
  const { actor } = activitypubConfig;

  return {
    '@context': ['https://www.w3.org/ns/activitystreams', { '@language': 'en' }],
    type: 'Service',
    id: actor.id,
    name: actor.name,
    preferredUsername: actor.username,
    summary: actor.summary,
    url: activitypubConfig.baseUrl,
    inbox: actor.inbox,
    outbox: actor.outbox,
    followers: actor.followers,
    following: actor.following,
    publicKey: {
      id: actor.keyId,
      owner: actor.id,
      publicKeyPem: getPublicKeyPem(),
    },
  };
}
