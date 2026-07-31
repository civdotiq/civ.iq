/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * GA4 AI-referral classifier tests
 *
 * `npm run stats` reports AI assistant referrals as the read on whether the
 * agent-native bet is landing. A missed pattern reads as "no AI traffic" and
 * would argue for abandoning a strategy that is actually working, so the
 * source list is worth pinning.
 */

import { isAiSource } from '../../../../scripts/ga4-client';

describe('isAiSource', () => {
  it('matches the AI assistants that send referral traffic', () => {
    for (const source of [
      'chatgpt.com',
      'chat.openai.com',
      'perplexity.ai',
      'www.perplexity.ai',
      'claude.ai',
      'copilot.microsoft.com',
      'gemini.google.com',
    ]) {
      expect(isAiSource(source)).toBe(true);
    }
  });

  it('is case-insensitive', () => {
    expect(isAiSource('ChatGPT.com')).toBe(true);
  });

  it('does not match ordinary search and social sources', () => {
    for (const source of ['google', 'bing', 'duckduckgo', '(direct)', 'reddit.com', 't.co']) {
      expect(isAiSource(source)).toBe(false);
    }
  });
});
