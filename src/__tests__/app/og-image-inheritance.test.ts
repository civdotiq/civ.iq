/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Next merges metadata shallowly: a segment that sets `openGraph` replaces
 * its parent's whole object, image included. On 2026-10-07 that left every
 * page except the homepage and Congress profiles with no link-preview image.
 *
 * The rule this enforces, for every `openGraph: {` under src/app:
 * - if the folder has its own `opengraph-image`, the block leaves `images`
 *   out (Next skips the file when the segment sets `openGraph.images`);
 * - otherwise the block sets `images` (normally `SITE_OG_IMAGES`).
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
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

/** The text of each `openGraph: { ... }` object literal in a file. */
function openGraphBlocks(source: string): string[] {
  const blocks: string[] = [];
  let from = 0;
  for (;;) {
    const start = source.indexOf('openGraph: {', from);
    if (start === -1) return blocks;
    const open = source.indexOf('{', start);
    let depth = 0;
    let end = open;
    for (; end < source.length; end++) {
      if (source[end] === '{') depth++;
      else if (source[end] === '}' && --depth === 0) break;
    }
    blocks.push(source.slice(open, end + 1));
    from = end;
  }
}

/** True when the block's own top level names `images` (nested objects ignored). */
function setsImages(block: string): boolean {
  let depth = 0;
  for (let i = 0; i < block.length; i++) {
    const c = block[i];
    if (c === '{' || c === '[' || c === '(') depth++;
    else if (c === '}' || c === ']' || c === ')') depth--;
    else if (depth === 1 && block.startsWith('images', i) && /^images\s*:/.test(block.slice(i))) {
      return true;
    }
  }
  return false;
}

function hasOwnImageFile(dir: string): boolean {
  return ['tsx', 'ts', 'js', 'png', 'jpg', 'jpeg'].some(ext =>
    existsSync(join(dir, `opengraph-image.${ext}`))
  );
}

describe('every openGraph block keeps a share image', () => {
  const withOpenGraph = walk(APP_DIR)
    .filter(f => /\.tsx?$/.test(f))
    .map(file => ({ file, blocks: openGraphBlocks(readFileSync(file, 'utf8')) }))
    .filter(({ blocks }) => blocks.length > 0);

  it('finds blocks to check, so the test cannot pass by finding nothing', () => {
    expect(withOpenGraph.length).toBeGreaterThan(50);
  });

  it.each(withOpenGraph.map(({ file, blocks }) => [relative(APP_DIR, file), file, blocks]))(
    '%s',
    (_name, file, blocks) => {
      const dir = join(file as string, '..');
      // The root layout names src/app/opengraph-image itself (SITE_OG_IMAGES).
      const ownImage = dir !== APP_DIR && hasOwnImageFile(dir);
      for (const block of blocks as string[]) {
        expect(setsImages(block)).toBe(!ownImage);
      }
    }
  );
});
