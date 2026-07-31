/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Crawler counter tests
 *
 * The bot list is the only thing standing between "we can see search/AI
 * indexing" and the previous state of total blindness on page paths. A
 * mis-ordered signature silently mislabels traffic, so pin the tricky cases:
 * bots whose UA also contains another bot's name or a full browser UA.
 */

import { identifyCrawler } from '@/lib/analytics/crawler-counter';

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
