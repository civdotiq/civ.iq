/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Reading Level Analytics — Fire-and-forget Tracker
 *
 * Logs Flesch-Kincaid grade levels and Flesch Reading Ease scores
 * for every AI summary generated.
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
 * Flesch ease key format: analytics:flesch-ease:{date}:{bucket}
 */
export function trackReadingLevel(
  gradeLevel: number,
  billId?: string,
  fleschReadingEase?: number
): void {
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

  // Track Flesch Reading Ease in buckets of 10 (0, 10, 20, ... 100)
  if (fleschReadingEase !== undefined) {
    const bucket = Math.min(100, Math.max(0, Math.floor(fleschReadingEase / 10) * 10));
    const fleschKey = `analytics:flesch-ease:${date}:${bucket}`;

    client.incr(fleschKey).then(
      val => {
        if (val === 1) {
          client.expire(fleschKey, TTL_SECONDS).catch(() => {});
        }
      },
      () => {}
    );
  }

  // Also track the raw value for trend analysis
  const rawKey = `analytics:reading-level-raw:${date}`;
  const rawRecord: { grade: number; billId?: string; fleschReadingEase?: number; ts: number } = {
    grade: gradeLevel,
    billId,
    ts: Date.now(),
  };
  if (fleschReadingEase !== undefined) {
    rawRecord.fleschReadingEase = fleschReadingEase;
  }
  client.rpush(rawKey, JSON.stringify(rawRecord)).then(
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
  avgFleschEase: number;
  fleschEasePassRate: number; // % with Flesch ease >= 60
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
    const gradeKeys = Array.from(
      { length: 16 },
      (_, i) => `analytics:reading-level:${date}:${i + 1}`
    );

    // Scan Flesch ease buckets 0-100 (step 10)
    const fleschBuckets = Array.from({ length: 11 }, (_, i) => i * 10);
    const fleschKeys = fleschBuckets.map(b => `analytics:flesch-ease:${date}:${b}`);

    const pipeline = client.pipeline();
    for (const key of gradeKeys) {
      pipeline.get(key);
    }
    for (const key of fleschKeys) {
      pipeline.get(key);
    }

    const values = await pipeline.exec();

    // Parse grade level results (first 16 values)
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

    // Parse Flesch ease results (next 11 values)
    let fleschTotal = 0;
    let fleschWeightedSum = 0;
    let fleschPassCount = 0;

    for (let i = 0; i < 11; i++) {
      const count = parseInt(String(values[16 + i] ?? 0)) || 0;
      if (count > 0) {
        const bucket = i * 10; // 0, 10, 20, ... 100
        fleschTotal += count;
        fleschWeightedSum += (bucket + 5) * count; // midpoint of bucket
        if (bucket >= 60) fleschPassCount += count;
      }
    }

    if (total > 0) {
      results.push({
        date,
        distribution,
        total,
        avgGrade: Math.round((weightedSum / total) * 10) / 10,
        passRate: Math.round((passCount / total) * 100),
        avgFleschEase:
          fleschTotal > 0 ? Math.round((fleschWeightedSum / fleschTotal) * 10) / 10 : 0,
        fleschEasePassRate: fleschTotal > 0 ? Math.round((fleschPassCount / fleschTotal) * 100) : 0,
      });
    }
  }

  return results;
}
