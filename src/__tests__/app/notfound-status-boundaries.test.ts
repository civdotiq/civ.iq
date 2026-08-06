/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * A route-level `loading.tsx` wraps its whole subtree in a Suspense boundary.
 * Next.js streams that fallback immediately, which commits the HTTP status
 * before the page has decided anything — so a later `notFound()` renders the
 * 404 UI under a **200**. Google treats that as a soft 404 and folds the page
 * into its thin-content bucket.
 *
 * Verified against the dev server 2026-08-06: /representative/ZZ99999 and a
 * vote URL missing its bill both returned 200 with a `loading.tsx` above them
 * and 404 with it removed, no other change.
 *
 * The rule this enforces: a page that can call `notFound()` must not sit under
 * a `loading.tsx`. Give the slow part of such a page its own `<Suspense>`
 * inside the page instead — that streams without swallowing the status.
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const APP_DIR = join(process.cwd(), 'src', 'app');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/** Every page.tsx whose own code can produce a 404. */
function pagesCallingNotFound(files: string[]): string[] {
  return files.filter(
    file => file.endsWith(`${'page'}.tsx`) && /\bnotFound\(\)/.test(readFileSync(file, 'utf8'))
  );
}

/** Directories between src/app and the page, inclusive of the page's own. */
function ancestorDirs(pageFile: string): string[] {
  const dirs: string[] = [];
  let dir = join(pageFile, '..');
  while (dir.startsWith(APP_DIR)) {
    dirs.push(dir);
    dir = join(dir, '..');
  }
  return dirs;
}

describe('pages that 404 are not under a streaming boundary', () => {
  const files = walk(APP_DIR);
  const loadingDirs = new Set(
    files.filter(f => f.endsWith(`${'loading'}.tsx`)).map(f => join(f, '..'))
  );

  it('finds pages to check, so the test cannot pass by finding nothing', () => {
    expect(pagesCallingNotFound(files).length).toBeGreaterThan(5);
  });

  it('has no loading.tsx at or above any page that calls notFound()', () => {
    const violations: string[] = [];

    for (const page of pagesCallingNotFound(files)) {
      for (const dir of ancestorDirs(page)) {
        if (loadingDirs.has(dir)) {
          violations.push(
            `${relative(process.cwd(), page)} is under ${relative(process.cwd(), join(dir, 'loading.tsx'))}`
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
