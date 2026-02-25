/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Reading Level Analytics — Fire-and-forget Tracker
 *
 * Logs Flesch-Kincaid grade levels for every AI summary generated.
 * Follows request-counter.ts pattern exactly: never blocks, 30-day TTL.
 */

import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  try {
    redis = new Redis({ url, token });
    return redis;
  } catch {
    return null;
  }
}

const TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

/**
 * Track a reading level measurement. Fire-and-forget — never blocks.
 * Key format: analytics:reading-level:{date}:{gradeLevel}
 */
export function trackReadingLevel(gradeLevel: number, billId?: string): void {
  const client = getRedis();
  if (!client) return;

  const date = new Date().toISOString().slice(0, 10);
  const roundedGrade = Math.round(gradeLevel);
  const key = `analytics:reading-level:${date}:${roundedGrade}`;

  // Fire and forget
  client.incr(key).then(
    val => {
      if (val === 1) {
        client.expire(key, TTL_SECONDS).catch(() => {});
      }
    },
    () => {}
  );

  // Also track the raw value for trend analysis
  const rawKey = `analytics:reading-level-raw:${date}`;
  client.rpush(rawKey, JSON.stringify({ grade: gradeLevel, billId, ts: Date.now() })).then(
    val => {
      if (val === 1) {
        client.expire(rawKey, TTL_SECONDS).catch(() => {});
      }
    },
    () => {}
  );
}

export interface ReadingLevelDistribution {
  date: string;
  distribution: Record<number, number>;
  total: number;
  avgGrade: number;
  passRate: number; // % at or below grade 8
}

/**
 * Get reading level distribution for a date range.
 */
export async function getReadingLevelStats(
  startDate: string,
  endDate: string
): Promise<ReadingLevelDistribution[]> {
  const client = getRedis();
  if (!client) return [];

  const results: ReadingLevelDistribution[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const date = d.toISOString().slice(0, 10);
    const distribution: Record<number, number> = {};
    let total = 0;
    let weightedSum = 0;
    let passCount = 0;

    // Scan grade levels 1-16
    const keys = Array.from({ length: 16 }, (_, i) => `analytics:reading-level:${date}:${i + 1}`);
    const pipeline = client.pipeline();
    for (const key of keys) {
      pipeline.get(key);
    }

    const values = await pipeline.exec();

    for (let i = 0; i < 16; i++) {
      const count = parseInt(String(values[i] ?? 0)) || 0;
      if (count > 0) {
        const grade = i + 1;
        distribution[grade] = count;
        total += count;
        weightedSum += grade * count;
        if (grade <= 8) passCount += count;
      }
    }

    if (total > 0) {
      results.push({
        date,
        distribution,
        total,
        avgGrade: Math.round((weightedSum / total) * 10) / 10,
        passRate: Math.round((passCount / total) * 100),
      });
    }
  }

  return results;
}
