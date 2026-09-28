/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { getRedisCache } from '@/lib/cache/redis-client';

const CURSOR_TTL_SECONDS = 7 * 24 * 60 * 60;

/** Read a slice cursor for a rotating cron, normalised into [0, length). */
export async function readCronCursor(key: string, length: number): Promise<number> {
  const raw = await getRedisCache().get<number | string>(key);
  let cursor = 0;
  if (typeof raw === 'number') cursor = raw;
  else if (typeof raw === 'string') cursor = Number.parseInt(raw, 10) || 0;
  return ((cursor % length) + length) % length;
}

export async function writeCronCursor(key: string, cursor: number): Promise<void> {
  await getRedisCache().set(key, cursor, CURSOR_TTL_SECONDS);
}
