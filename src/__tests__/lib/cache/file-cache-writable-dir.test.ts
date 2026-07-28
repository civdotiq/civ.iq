/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * File cache location — regression guard
 *
 * Vercel serves functions from a read-only deployment bundle; at runtime only
 * the OS temp directory is writable. The file cache defaulted to
 * `process.cwd()/.next/cache/congress-data`, so in production every read missed
 * and every write failed.
 *
 * Nothing broke visibly — `FileCache` catches both — but the layer meant to
 * absorb congress lookups absorbed nothing, and all 52 `getAllEnhancedRepresentatives`
 * call sites fell through to Redis and pulled the full ~1 MB
 * `congress-legislators-current` blob over the network. That was ~2% of our
 * Redis commands and effectively all of our bandwidth: 231 GB in a month
 * against a 200 GB allowance.
 *
 * These tests pin the location and prove the directory is actually writable,
 * since a silently unwritable cache is indistinguishable from a working one.
 */

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { FileCache, defaultCacheDir } from '@/lib/cache/file-cache';

describe('file cache location', () => {
  const originalVercel = process.env.VERCEL;

  afterEach(() => {
    if (originalVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = originalVercel;
  });

  it('uses a writable temp directory on Vercel', () => {
    process.env.VERCEL = '1';

    const dir = defaultCacheDir();

    expect(dir.startsWith(os.tmpdir())).toBe(true);
    // The deployment bundle is read-only — writing under cwd is the bug.
    expect(dir.startsWith(process.cwd())).toBe(false);
  });

  it('keeps the cache alongside the build when running locally', () => {
    delete process.env.VERCEL;

    expect(defaultCacheDir()).toBe(path.join(process.cwd(), '.next', 'cache', 'congress-data'));
  });

  it('round-trips a value through the directory it picks for Vercel', async () => {
    process.env.VERCEL = '1';
    const cache = new FileCache(defaultCacheDir());

    const wrote = await cache.set('roster-probe', { members: 537 }, 60);
    expect(wrote).toBe(true);

    await expect(cache.get('roster-probe')).resolves.toEqual({ members: 537 });

    await cache.delete('roster-probe');
    await expect(cache.get('roster-probe')).resolves.toBeNull();
  });

  it('reports failure rather than claiming a write it could not make', async () => {
    // A path under a file (not a directory) cannot be created or written.
    const blocker = path.join(os.tmpdir(), `civiq-blocker-${process.pid}`);
    await fs.writeFile(blocker, 'not a directory', 'utf-8');

    try {
      const cache = new FileCache(path.join(blocker, 'nested'));
      await expect(cache.set('k', { a: 1 }, 60)).resolves.toBe(false);
      await expect(cache.get('k')).resolves.toBeNull();
    } finally {
      await fs.unlink(blocker);
    }
  });
});
