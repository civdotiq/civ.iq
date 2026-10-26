/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 *
 * Public count claims match their source of truth.
 *
 * The README, publiccode.yml, funding.json and /developers once claimed 181
 * or 198 API endpoints and 19, 23, 26 or 28 data sources, none of which any
 * counting rule could reproduce. Each number now has one definition:
 *
 *   Endpoints     the paths in public/openapi.json (the public contract)
 *   Data sources  the rows of the "Data sources" tables in docs/COVERAGE.md,
 *                 whose heading states the totals
 *
 * Every hand-edited copy of either number must agree with that definition.
 * MCP tool counts are held to the registered server in
 * src/lib/mcp/__tests__/tools.test.ts.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');
const read = (path: string): string => readFileSync(join(ROOT, path), 'utf8');

describe('endpoint counts match public/openapi.json', () => {
  const spec = JSON.parse(read('public/openapi.json')) as { paths: Record<string, unknown> };
  const pathCount = Object.keys(spec.paths).length;

  it.each([
    'README.md',
    'publiccode.yml',
    'funding.json',
    'docs/ARCHITECTURE.md',
    'src/app/(public)/developers/page.tsx',
  ])('every endpoint count stated in %s matches the spec', path => {
    const counts = [
      ...read(path).matchAll(
        /\b(\d+) (?:documented )?endpoints\b|(\d+)<\/div>\s*<div[^>]*>API Endpoints/g
      ),
    ].map(m => Number(m[1] ?? m[2]));
    expect(counts.length).toBeGreaterThan(0);
    for (const count of counts) expect(count).toBe(pathCount);
  });
});

describe('data-source counts match docs/COVERAGE.md', () => {
  const coverage = read('docs/COVERAGE.md');
  const heading = coverage.match(
    /^## Data sources \((\d+): (\d+) government, (\d+) open datasets\)$/m
  );

  /** Numbered rows of the table under a `### <title> (N)` heading. */
  const tableRows = (title: string): number => {
    const start = coverage.indexOf(`### ${title} (`);
    const end = coverage.indexOf('\n#', start + 1);
    const section = coverage.slice(start, end < 0 ? undefined : end);
    return [...section.matchAll(/^\| \d+ +\|/gm)].length;
  };

  it('the COVERAGE.md heading totals match its tables', () => {
    expect(heading).not.toBeNull();
    const [, total, gov, open] = heading!.map(Number);
    expect(tableRows('Government')).toBe(gov);
    expect(tableRows('Open datasets')).toBe(open);
    expect(gov! + open!).toBe(total);
  });

  it.each([
    'README.md',
    'publiccode.yml',
    'funding.json',
    'CITATION.cff',
    'packages/sdk/README.md',
    'src/app/(public)/about/page.tsx',
    'src/lib/seo/meta-descriptions.ts',
  ])('every source count stated in %s matches COVERAGE.md', path => {
    const [, total, gov, open] = heading!.map(Number);
    const text = read(path).replace(/\s+/g, ' ');
    const govCounts = [...text.matchAll(/\b(\d+) government(?: data)? sources\b/g)];
    const openCounts = [...text.matchAll(/\b(\d+) open datasets\b/g)];
    const totalCounts = [...text.matchAll(/\b(\d+) data sources:/g)];
    expect(govCounts.length + totalCounts.length).toBeGreaterThan(0);
    for (const m of govCounts) expect(Number(m[1])).toBe(gov);
    for (const m of openCounts) expect(Number(m[1])).toBe(open);
    for (const m of totalCounts) expect(Number(m[1])).toBe(total);
  });
});
