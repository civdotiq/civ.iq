/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * NIP-11 Relay Information
 *
 * Fetches relay capability documents before publishing to avoid
 * silent rejections (oversized payload, payment required, auth required).
 * Caches results for 24 hours. Fail-open: if all relays are filtered out,
 * returns the original list.
 */

import { nostrConfig } from '@/config/nostr.config';
import logger from '@/lib/logging/simple-logger';

export interface RelayInfo {
  name?: string;
  supported_nips?: number[];
  limitation?: {
    max_message_length?: number;
    auth_required?: boolean;
    payment_required?: boolean;
  };
}

const relayInfoCache = new Map<string, { info: RelayInfo | null; expiresAt: number }>();

/** Convert wss:// relay URL to https:// for NIP-11 fetch */
function toHttpUrl(relayUrl: string): string {
  return relayUrl.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://');
}

/** Fetch NIP-11 relay information document */
export async function fetchRelayInfo(relayUrl: string): Promise<RelayInfo | null> {
  // Check cache first
  const cached = relayInfoCache.get(relayUrl);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.info;
  }

  try {
    const httpUrl = toHttpUrl(relayUrl);
    const response = await fetch(httpUrl, {
      headers: { Accept: 'application/nostr+json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      relayInfoCache.set(relayUrl, {
        info: null,
        expiresAt: Date.now() + nostrConfig.nip11CacheTTL * 1000,
      });
      return null;
    }

    const info = (await response.json()) as RelayInfo;
    relayInfoCache.set(relayUrl, {
      info,
      expiresAt: Date.now() + nostrConfig.nip11CacheTTL * 1000,
    });
    return info;
  } catch (error) {
    logger.warn('NIP-11 fetch failed (fail-open)', {
      relay: relayUrl,
      error: error instanceof Error ? error.message : 'Unknown',
      operation: 'nostr_publisher',
    });
    // Cache the failure too to avoid repeated attempts
    relayInfoCache.set(relayUrl, { info: null, expiresAt: Date.now() + 300_000 }); // 5min for failures
    return null;
  }
}

/**
 * Filter relays that can accept the given payload size.
 * Excludes relays that require payment or auth.
 * Fail-open: returns original list if all relays are filtered out.
 */
export async function filterCapableRelays(
  relayUrls: string[],
  payloadSize: number
): Promise<string[]> {
  const results = await Promise.all(
    relayUrls.map(async url => {
      const info = await fetchRelayInfo(url);
      if (!info) return { url, capable: true }; // Unknown = assume capable (fail-open)

      if (info.limitation?.payment_required) {
        return { url, capable: false };
      }
      if (info.limitation?.auth_required) {
        return { url, capable: false };
      }
      if (info.limitation?.max_message_length && payloadSize > info.limitation.max_message_length) {
        return { url, capable: false };
      }

      return { url, capable: true };
    })
  );

  const capable = results.filter(r => r.capable).map(r => r.url);

  // Fail-open: if all filtered out, return original list
  if (capable.length === 0) {
    logger.warn('NIP-11: all relays filtered — fail-open, using original list', {
      relayCount: relayUrls.length,
      payloadSize,
      operation: 'nostr_publisher',
    });
    return relayUrls;
  }

  if (capable.length < relayUrls.length) {
    logger.info(`NIP-11: filtered ${relayUrls.length - capable.length} incapable relays`, {
      original: relayUrls.length,
      capable: capable.length,
      payloadSize,
      operation: 'nostr_publisher',
    });
  }

  return capable;
}

/** Clear the in-memory relay info cache (for testing) */
export function clearRelayInfoCache(): void {
  relayInfoCache.clear();
}
