/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Drift guard for src/generated/known-route-prefixes.ts.
 *
 * Middleware answers agents' 404s from this manifest: a top-level segment
 * missing from it makes middleware serve a markdown 404 for a page that
 * actually exists. Recompute the set from the filesystem with the same
 * rules as the generator and fail if the committed file is stale.
 *
 * On failure: node scripts/gen-known-route-prefixes.mjs
 */

import fs from 'fs';
import path from 'path';
import { KNOWN_ROUTE_PREFIXES } from '@/generated/known-route-prefixes';

const APP_DIR = path.join(process.cwd(), 'src', 'app');
const PUBLIC_DIR = path.join(process.cwd(), 'public');

function collectFromFilesystem(): string[] {
  const prefixes = new Set<string>();

  function addSegmentsFrom(dir: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('(') && entry.name.endsWith(')')) {
        addSegmentsFrom(path.join(dir, entry.name));
      } else if (entry.name.startsWith('[')) {
        throw new Error(
          `Top-level dynamic segment ${entry.name}: the known-prefix 404 shortcut is unsafe — rework the middleware check.`
        );
      } else {
        prefixes.add(entry.name.toLowerCase());
      }
    }
  }

  addSegmentsFrom(APP_DIR);

  for (const entry of fs.readdirSync(PUBLIC_DIR, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    prefixes.add(entry.name.toLowerCase());
  }

  for (const extra of [
    '_next',
    '.well-known',
    'sitemap.xml',
    'sitemap-images.xml',
    'opengraph-image',
    'icon-192.png',
    'icon-512.png',
    'monitoring',
    'lite',
  ]) {
    prefixes.add(extra);
  }

  return [...prefixes].sort();
}

describe('known-route-prefixes manifest', () => {
  it('matches a fresh scan of src/app and public/ (run scripts/gen-known-route-prefixes.mjs if this fails)', () => {
    expect([...KNOWN_ROUTE_PREFIXES].sort()).toEqual(collectFromFilesystem());
  });

  it('contains the load-bearing entries middleware depends on', () => {
    for (const prefix of ['api', 'llms.txt', 'llms-full.txt', 'openapi.json', 'mcp', '_next']) {
      expect(KNOWN_ROUTE_PREFIXES.has(prefix)).toBe(true);
    }
  });

  it('never claims obviously bogus prefixes', () => {
    expect(KNOWN_ROUTE_PREFIXES.has('some-path-that-does-not-exist')).toBe(false);
  });
});
