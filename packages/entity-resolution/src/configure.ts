/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { setLogger, type Logger } from './logger.js';
import { setCache, type CacheAdapter } from './cache.js';

/**
 * Configure the entity-resolution package with app-specific dependencies.
 * Call once at application startup before using any resolution functions.
 */
export function configure(options: { logger?: Logger; cache?: CacheAdapter }): void {
  if (options.logger) {
    setLogger(options.logger);
  }
  if (options.cache) {
    setCache(options.cache);
  }
}
