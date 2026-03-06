/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Initialize @civiq/entity-resolution with app-specific dependencies.
 * Call once from intelligence API route handlers before using any
 * entity resolution functions.
 */

import { configure } from '@civiq/entity-resolution';
import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';

let initialized = false;

export function initEntityResolution(): void {
  if (initialized) return;

  configure({
    logger,
    cache: {
      get: async <T>(key: string) => getRedisCache().get<T>(key),
      set: async (key: string, value: unknown, ttlSeconds: number) => {
        await getRedisCache().set(key, value, ttlSeconds);
      },
    },
  });

  initialized = true;
}
