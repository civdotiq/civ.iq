/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * ActivityPub Federation Configuration
 *
 * Environment-aware config for the ActivityPub actor, outbox, and inbox.
 * Pattern matches nostr.config.ts exactly.
 */

const domain = process.env.ACTIVITYPUB_DOMAIN || 'civdotiq.org';
const baseUrl = `https://${domain}`;

export const activitypubConfig = {
  /** Instance domain */
  domain,

  /** Base URL for all ActivityPub IRIs */
  baseUrl,

  /** Actor configuration */
  actor: {
    id: `${baseUrl}/api/activitypub/actor`,
    username: 'civiq',
    name: 'CIV.IQ Civic Intelligence',
    summary:
      'Open civic intelligence infrastructure. Bills, votes, spending, committees — real government data, published as public record.',
    inbox: `${baseUrl}/api/activitypub/inbox`,
    outbox: `${baseUrl}/api/activitypub/outbox`,
    followers: `${baseUrl}/api/activitypub/followers`,
    following: `${baseUrl}/api/activitypub/following`,
    keyId: `${baseUrl}/api/activitypub/actor#main-key`,
  },

  /** Outbox settings */
  outboxPageSize: 20,
  maxOutboxItems: 500,

  /** Redis key prefixes */
  dedupPrefix: 'activitypub:published:',
  followersKey: 'activitypub:followers',
  outboxKey: 'activitypub:outbox',

  /** TTLs in seconds */
  dedupTTL: 30 * 24 * 60 * 60, // 30 days (for dedup keys only)
  /**
   * Outbox is public record, so keep it as long as the cache allows: the
   * 90-day Redis TTL cap (MAX_TTL_SECONDS in redis-client). Anything longer
   * is clamped to 90 days anyway and logged as an error on every write —
   * the old 1-year value emitted two such errors per published event.
   */
  outboxTTL: 90 * 24 * 60 * 60,

  /** Rate limit for inbox (follows per minute) */
  inboxRateLimit: 30,
} as const;
