/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Cache TTL units — regression guard
 *
 * `cachedFetch(key, fn, ttlSeconds)` takes SECONDS, and the value reaches
 * Redis as `SETEX <key> <ttlSeconds>`. Writing the TTL as
 * `6 * 60 * 60 * 1000` — which reads naturally if you assume milliseconds —
 * asks for 250 days instead of 6 hours.
 *
 * That shipped at 39 call sites and surfaced on 2026-07-27 as
 * congress-legislators-current serving a 69-day-old roster: two sitting
 * members of Congress missing, one departed member still listed.
 *
 * These tests pin both halves of the fix: no call site may reintroduce a
 * millisecond-shaped TTL, and the cache layer clamps one if it slips past.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

describe('cache TTL units', () => {
  describe('call sites', () => {
    // Matches a lone numeric expression ending in `* 1000` on its own line —
    // the shape a TTL argument takes.
    const MS_SHAPED =
      /^\s+\d+ \* (?:60 \* )?(?:60 \* )?(?:24 \* )?(?:60 \* 60 \* )?1000\s*[,)]?\s*(?:\/\/.*)?$/;

    /** Name of the function call enclosing `lineIndex`, by paren depth. */
    function enclosingCall(lines: string[], lineIndex: number): string {
      let depth = 0;
      for (let j = lineIndex; j >= 0; j--) {
        const line = lines[j]!;
        depth += (line.match(/\)/g) ?? []).length - (line.match(/\(/g) ?? []).length;
        if (depth < 0) {
          const code = line.split('//')[0]!.trimEnd();
          return /(\w+)\s*\($/.exec(code)?.[1] ?? '';
        }
      }
      return '';
    }

    it('passes no millisecond-shaped TTL to a seconds parameter', () => {
      const root = path.join(process.cwd(), 'src');
      const files = execSync(`grep -rl "\\* 1000" ${JSON.stringify(root)} || true`, {
        encoding: 'utf8',
      })
        .split('\n')
        .filter(Boolean);

      const offenders: string[] = [];

      for (const file of files) {
        const lines = fs.readFileSync(file, 'utf8').split('\n');
        lines.forEach((line, i) => {
          if (!MS_SHAPED.test(line)) return;
          const owner = enclosingCall(lines, i);
          // setInterval/setTimeout genuinely take milliseconds.
          if (owner === 'cachedFetch' || owner === 'persistentCachedFetch') {
            offenders.push(`${path.relative(process.cwd(), file)}:${i + 1} -> ${owner}`);
          }
        });
      }

      expect(offenders).toEqual([]);
    });
  });

  describe('clamp', () => {
    it('clamps a millisecond-shaped TTL to the maximum', async () => {
      const { clampTtl, MAX_TTL_SECONDS } = await import('@/lib/cache/redis-client');

      // The exact mistake that shipped: 6 hours written in milliseconds.
      const sixHoursAsMs = 6 * 60 * 60 * 1000;
      expect(sixHoursAsMs / (24 * 60 * 60)).toBeGreaterThan(200); // ~250 days

      expect(clampTtl('probe', sixHoursAsMs)).toBe(MAX_TTL_SECONDS);
    });

    it('leaves a correctly-specified TTL untouched', async () => {
      const { clampTtl } = await import('@/lib/cache/redis-client');

      expect(clampTtl('probe', 6 * 60 * 60)).toBe(6 * 60 * 60); // 6 hours
      expect(clampTtl('probe', 30 * 24 * 60 * 60)).toBe(30 * 24 * 60 * 60); // 30 days,
      // the longest deliberate TTL in the codebase
    });

    it('falls back to one hour for a nonsensical TTL', async () => {
      const { clampTtl } = await import('@/lib/cache/redis-client');

      expect(clampTtl('probe', 0)).toBe(3600);
      expect(clampTtl('probe', -1)).toBe(3600);
      expect(clampTtl('probe', Number.NaN)).toBe(3600);
    });
  });
});
