/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 *
 * Crawler counter tests
 *
 * The bot list is the only thing standing between "we can see search/AI
 * indexing" and the previous state of total blindness on page paths. A
 * mis-ordered signature silently mislabels traffic, so pin the tricky cases:
 * bots whose UA also contains another bot's name or a full browser UA.
 */

const mockIncr = jest.fn().mockResolvedValue(1);
const mockZincrby = jest.fn().mockResolvedValue(1);
const mockExpire = jest.fn().mockResolvedValue(true);

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    incr: mockIncr,
    zincrby: mockZincrby,
    expire: mockExpire,
  })),
}));

process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

import { identifyCrawler, incrementCrawlerHit } from '@/lib/analytics/crawler-counter';

const CHATGPT_USER =
  'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot';
const flush = () => new Promise(resolve => setTimeout(resolve, 10));

describe('identifyCrawler', () => {
  it('identifies search crawlers', () => {
    expect(
      identifyCrawler('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')
    ).toBe('googlebot');
    expect(identifyCrawler('Mozilla/5.0 (compatible; bingbot/2.0)')).toBe('bingbot');
  });

  it('identifies AI crawlers', () => {
    expect(identifyCrawler('Mozilla/5.0 (compatible; GPTBot/1.2)')).toBe('gptbot');
    expect(identifyCrawler('Mozilla/5.0 (compatible; ClaudeBot/1.0)')).toBe('claudebot');
    expect(identifyCrawler('Mozilla/5.0 (compatible; PerplexityBot/1.0)')).toBe('perplexitybot');
    expect(identifyCrawler('Mozilla/5.0 (compatible; CCBot/2.0)')).toBe('ccbot');
  });

  it('keeps Meta AI search indexing distinct from Meta training', () => {
    // Meta-WebIndexer feeds Meta AI search citations; meta-externalagent is
    // training/product indexing. Separate labels show which one reads us.
    expect(
      identifyCrawler(
        'meta-webindexer/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)'
      )
    ).toBe('meta-webindexer');
    expect(identifyCrawler('meta-externalagent/1.1')).toBe('meta-externalagent');
  });

  it('is case-insensitive', () => {
    expect(identifyCrawler('GOOGLEBOT/2.1')).toBe('googlebot');
  });

  it('keeps Google-Extended distinct from Googlebot', () => {
    // Google-Extended is the AI-training agent; conflating it with the search
    // crawler would hide whether Google is indexing us vs training on us.
    expect(identifyCrawler('Google-Extended')).toBe('google-extended');
    expect(identifyCrawler('Googlebot/2.1')).toBe('googlebot');
  });

  it('matches a bot name embedded in a full browser UA', () => {
    const ua = 'Mozilla/5.0 (Linux; Android 6.0.1) AppleWebKit/537.36 (compatible; Bytespider)';
    expect(identifyCrawler(ua)).toBe('bytespider');
  });

  it('returns null for humans and unknown agents', () => {
    const chrome =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
    expect(identifyCrawler(chrome)).toBeNull();
    expect(identifyCrawler('python-requests/2.31.0')).toBeNull();
    expect(identifyCrawler(null)).toBeNull();
    expect(identifyCrawler('')).toBeNull();
  });
});

describe('incrementCrawlerHit page paths', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('records the page a live AI assistant fetch opened', async () => {
    incrementCrawlerHit(CHATGPT_USER, '/representative/S000033/record');
    await flush();

    expect(mockIncr).toHaveBeenCalledWith(
      expect.stringMatching(/^analytics:crawler:\d{4}-\d{2}-\d{2}:chatgpt-user$/)
    );
    expect(mockZincrby).toHaveBeenCalledWith(
      expect.stringMatching(/^analytics:crawler-path:\d{4}-\d{2}-\d{2}:chatgpt-user$/),
      1,
      '/representative/S000033/record'
    );
    // First hit of both keys sets both TTLs
    expect(mockExpire).toHaveBeenCalledTimes(2);
  });

  it('skips the TTL on repeat hits of a path', async () => {
    mockIncr.mockResolvedValueOnce(5);
    mockZincrby.mockResolvedValueOnce(3);
    incrementCrawlerHit(CHATGPT_USER, '/');
    await flush();

    expect(mockExpire).not.toHaveBeenCalled();
  });

  it('does not record paths for index crawlers', async () => {
    incrementCrawlerHit('Mozilla/5.0 (compatible; OAI-SearchBot/1.0)', '/about');
    await flush();

    expect(mockIncr).toHaveBeenCalledTimes(1);
    expect(mockZincrby).not.toHaveBeenCalled();
  });

  it('caps very long paths', async () => {
    incrementCrawlerHit('Perplexity-User/1.0', `/${'a'.repeat(500)}`);
    await flush();

    const member = mockZincrby.mock.calls[0]![2] as string;
    expect(member).toHaveLength(200);
  });

  it('costs nothing for humans', async () => {
    incrementCrawlerHit('Mozilla/5.0 (Macintosh) Chrome/126.0.0.0 Safari/537.36', '/');
    await flush();

    expect(mockIncr).not.toHaveBeenCalled();
    expect(mockZincrby).not.toHaveBeenCalled();
  });
});
