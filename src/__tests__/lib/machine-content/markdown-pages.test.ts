/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import {
  MARKDOWN_PAGES,
  AGENT_NOT_FOUND_MARKDOWN,
  WHEN_TO_USE_MARKDOWN,
  VERSIONING_POLICY_MARKDOWN,
} from '@/lib/machine-content/markdown-pages';

describe('markdown page variants', () => {
  it('covers the negotiated page set with normalized keys', () => {
    const paths = [...MARKDOWN_PAGES.keys()];
    expect(paths).toEqual(
      expect.arrayContaining(['/', '/about', '/developers', '/docs/api', '/mcp', '/support'])
    );
    for (const path of paths) {
      // Middleware normalizes to lowercase and strips trailing slashes
      // before lookup — keys must already be in that form.
      expect(path).toBe(path.toLowerCase());
      if (path !== '/') expect(path.endsWith('/')).toBe(false);
    }
  });

  it('every variant is substantial markdown with an h1 and absolute links', () => {
    for (const [path, markdown] of MARKDOWN_PAGES) {
      expect(markdown.length).toBeGreaterThan(300);
      expect(markdown.startsWith('# ')).toBe(true);
      expect(markdown).toContain('https://civdotiq.org');
      expect(`${path}: ${markdown}`).not.toContain('undefined');
    }
  });

  it('the homepage variant names the core entry points', () => {
    const home = MARKDOWN_PAGES.get('/') ?? '';
    for (const link of ['/llms.txt', '/openapi.json', '/developers', '/representatives']) {
      expect(home).toContain(link);
    }
  });
});

describe('agent 404 body', () => {
  it('is short and points at sitemap, llms.txt, and docs', () => {
    expect(AGENT_NOT_FOUND_MARKDOWN.length).toBeLessThan(2000);
    expect(AGENT_NOT_FOUND_MARKDOWN).toContain('# 404');
    for (const link of [
      'https://civdotiq.org/sitemap.xml',
      'https://civdotiq.org/llms.txt',
      'https://civdotiq.org/openapi.json',
      'https://civdotiq.org/developers',
    ]) {
      expect(AGENT_NOT_FOUND_MARKDOWN).toContain(link);
    }
  });
});

describe('shared doc blocks', () => {
  it('when-to-use guidance names concrete jobs and the not-covered cases', () => {
    expect(WHEN_TO_USE_MARKDOWN).toContain('When to use CIV.IQ');
    expect(WHEN_TO_USE_MARKDOWN).toContain('Do NOT use CIV.IQ for');
    expect(WHEN_TO_USE_MARKDOWN).toContain('/api/v1');
    expect(WHEN_TO_USE_MARKDOWN).toContain('/api/mcp');
  });

  it('versioning policy documents RFC 8594 sunset signaling', () => {
    expect(VERSIONING_POLICY_MARKDOWN).toContain('Sunset');
    expect(VERSIONING_POLICY_MARKDOWN).toContain('Deprecation');
    expect(VERSIONING_POLICY_MARKDOWN).toContain('successor-version');
    expect(VERSIONING_POLICY_MARKDOWN).toContain('/api/v1/changelog');
  });
});
