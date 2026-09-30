/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * robots.txt guards. Until 2026-09-29 every agent block carried
 * `Disallow: /_next/`, which hid all CSS, JS and optimized images from search
 * engines: Google could not render a single page or judge it mobile-friendly.
 *
 * `/api/` stays blocked on purpose. Google's renderer obeys robots.txt for a
 * page's sub-requests, so client-side fetches made while it renders a page can
 * never spend rate-limited upstream quota (OpenStates is 1,000 requests/day).
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const robots = readFileSync(join(process.cwd(), 'public', 'robots.txt'), 'utf8');

/** Each `User-agent:` block as its own list of rule lines. */
function blocks(): Array<{ agent: string; rules: string[] }> {
  return robots
    .split(/\n(?=User-agent:)/)
    .filter(chunk => chunk.startsWith('User-agent:'))
    .map(chunk => {
      const lines = chunk.split('\n').map(line => line.trim());
      return {
        agent: lines[0] ?? '',
        rules: lines.slice(1).filter(l => /^(Allow|Disallow):/.test(l)),
      };
    });
}

describe('public/robots.txt', () => {
  it('never blocks /_next/ (CSS, JS and images search engines need to render pages)', () => {
    expect(robots).not.toMatch(/Disallow:\s*\/_next/);
  });

  it('keeps /api/ blocked but allows the share-card images', () => {
    for (const block of blocks()) {
      if (!block.rules.includes('Disallow: /api/')) continue;
      expect(block.rules).toContain('Allow: /api/card/');
      expect(block.rules).toContain('Allow: /api/v1/');
    }
  });

  it('never blocks the whole site for any agent', () => {
    for (const block of blocks()) {
      expect(block.rules).not.toContain('Disallow: /');
    }
  });

  it('lists the sitemaps', () => {
    expect(robots).toMatch(/^Sitemap: https:\/\/civdotiq\.org\/sitemap\.xml$/m);
    expect(robots).toMatch(/^Sitemap: https:\/\/civdotiq\.org\/sitemap-state-legislators\.xml$/m);
  });
});
