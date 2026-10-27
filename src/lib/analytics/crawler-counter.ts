/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Crawler Counter — Upstash Redis
 *
 * Middleware only logs User-Agent for `/api/` paths, so page-path traffic has
 * historically been unattributable: a zero result for Googlebot in the runtime
 * logs proved nothing. This counts named search and AI crawlers on page paths
 * so `npm run stats` can answer "is anything indexing us?" — the load-bearing
 * question for the GEO/discoverability work.
 *
 * Deliberately narrow: only a curated bot list increments, so cost is one
 * Redis command per *crawler* hit, never per human pageview. (Middleware runs
 * before the CDN, so an unfiltered counter here would bill on every cache HIT.)
 * Humans are covered by GA4 and Vercel Web Analytics instead.
 *
 * Key format: analytics:crawler:{YYYY-MM-DD}:{botName}
 *
 * Crawlers that fetch a page because a person just asked an AI assistant a
 * question (ChatGPT-User, Perplexity-User) also record WHICH page, in a sorted
 * set per day: analytics:crawler-path:{YYYY-MM-DD}:{botName} → path → count.
 * Index crawlers don't, because their paths say nothing about what gets cited.
 */

import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  try {
    redis = new Redis({ url, token, cache: 'default' });
    return redis;
  } catch {
    return null;
  }
}

const TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days, matching adoption-counter

/**
 * Substring → canonical label. Ordered most-specific first: several AI crawlers
 * embed "bot" or a browser UA, so the first match wins.
 */
const CRAWLER_SIGNATURES: ReadonlyArray<readonly [string, string]> = [
  ['googlebot', 'googlebot'],
  ['google-extended', 'google-extended'],
  ['bingbot', 'bingbot'],
  ['gptbot', 'gptbot'],
  ['oai-searchbot', 'oai-searchbot'],
  ['chatgpt-user', 'chatgpt-user'],
  ['claudebot', 'claudebot'],
  ['claude-web', 'claude-web'],
  ['anthropic-ai', 'anthropic-ai'],
  ['perplexitybot', 'perplexitybot'],
  ['perplexity-user', 'perplexity-user'],
  ['applebot', 'applebot'],
  ['duckduckbot', 'duckduckbot'],
  ['yandexbot', 'yandexbot'],
  ['baiduspider', 'baiduspider'],
  ['ccbot', 'ccbot'],
  ['bytespider', 'bytespider'],
  ['amazonbot', 'amazonbot'],
  ['meta-externalagent', 'meta-externalagent'],
  ['meta-webindexer', 'meta-webindexer'],
  ['facebookexternalhit', 'facebookexternalhit'],
  ['twitterbot', 'twitterbot'],
  ['linkedinbot', 'linkedinbot'],
  ['slackbot', 'slackbot'],
  ['discordbot', 'discordbot'],
];

/**
 * Crawlers that fetch a page live for a user's question, not to build an index.
 * The page they open is the citation signal, so their paths are kept.
 */
export const PATH_TRACKED_CRAWLERS: ReadonlySet<string> = new Set([
  'chatgpt-user',
  'perplexity-user',
]);

const MAX_PATH_LENGTH = 200;

export function crawlerPathKey(date: string, label: string): string {
  return `analytics:crawler-path:${date}:${label}`;
}

/** Return the canonical crawler label for a User-Agent, or null if not a known bot. */
export function identifyCrawler(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null;
  const ua = userAgent.toLowerCase();
  for (const [needle, label] of CRAWLER_SIGNATURES) {
    if (ua.includes(needle)) return label;
  }
  return null;
}

/**
 * Count a page-path request from a known crawler, plus the path itself for
 * PATH_TRACKED_CRAWLERS. Fire-and-forget: never awaited, never throws, never
 * blocks a response.
 */
export function incrementCrawlerHit(userAgent: string | null | undefined, pathname?: string): void {
  const label = identifyCrawler(userAgent);
  if (!label) return;

  const client = getRedis();
  if (!client) return;

  const date = new Date().toISOString().slice(0, 10);
  const key = `analytics:crawler:${date}:${label}`;

  client.incr(key).then(
    val => {
      if (val === 1) {
        client.expire(key, TTL_SECONDS).catch(() => {});
      }
    },
    () => {} // Silently ignore errors
  );

  if (!pathname || !PATH_TRACKED_CRAWLERS.has(label)) return;

  const pathKey = crawlerPathKey(date, label);
  client.zincrby(pathKey, 1, pathname.slice(0, MAX_PATH_LENGTH)).then(
    score => {
      // A path's first hit of the day (re)sets the TTL; repeats cost nothing extra.
      if (score === 1) {
        client.expire(pathKey, TTL_SECONDS).catch(() => {});
      }
    },
    () => {}
  );
}
