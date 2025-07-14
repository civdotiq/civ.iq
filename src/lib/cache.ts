/*
 * CIV.IQ - Civic Information Hub
 * Copyright (C) 2025 Mark Sandford
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * For commercial licensing inquiries: mark@marksandford.dev
 */

import { getRedisCache } from '@/lib/cache/redis-client'
import { structuredLogger } from '@/lib/logging/logger'
import { monitorCache } from '@/lib/monitoring/telemetry'

// Get the Redis cache instance
const redisCache = getRedisCache()

// Cache helper function with automatic key generation
export async function cachedFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 3600
): Promise<T> {
  const monitor = monitorCache('get', key)
  
  try {
    const cached = await redisCache.get<T>(key)
    if (cached) {
      monitor.end(true)
      structuredLogger.info('Cache hit', { key, ttl: ttlSeconds })
      return cached
    }

    monitor.end(false)
    structuredLogger.info('Cache miss, fetching data', { key })
    const data = await fetchFn()
    
    // Set in cache with monitoring
    const setMonitor = monitorCache('set', key)
    const setSuccess = await redisCache.set(key, data, ttlSeconds)
    setMonitor.end()
    
    if (setSuccess) {
      structuredLogger.info('Data cached successfully', { key, ttl: ttlSeconds })
    } else {
      structuredLogger.warn('Failed to cache data', { key })
    }
    
    return data
  } catch (error) {
    monitor.end(false, error as Error)
    structuredLogger.error('Cache operation failed', error as Error, { key })
    
    // Fall back to direct fetch on cache error
    return await fetchFn()
  }
}

// Export Redis cache methods for direct use
export const cache = {
  get: async <T>(key: string): Promise<T | null> => {
    try {
      return await redisCache.get<T>(key)
    } catch (error) {
      structuredLogger.error('Cache get failed', error as Error, { key })
      return null
    }
  },
  
  set: async <T>(key: string, data: T, ttlSeconds: number = 3600): Promise<boolean> => {
    try {
      return await redisCache.set(key, data, ttlSeconds)
    } catch (error) {
      structuredLogger.error('Cache set failed', error as Error, { key })
      return false
    }
  },
  
  delete: async (key: string): Promise<boolean> => {
    try {
      return await redisCache.delete(key)
    } catch (error) {
      structuredLogger.error('Cache delete failed', error as Error, { key })
      return false
    }
  },
  
  clear: async (): Promise<boolean> => {
    try {
      return await redisCache.flush()
    } catch (error) {
      structuredLogger.error('Cache clear failed', error as Error)
      return false
    }
  },
  
  exists: async (key: string): Promise<boolean> => {
    try {
      return await redisCache.exists(key)
    } catch (error) {
      structuredLogger.error('Cache exists check failed', error as Error, { key })
      return false
    }
  },
  
  getStatus: () => redisCache.getStatus()
}