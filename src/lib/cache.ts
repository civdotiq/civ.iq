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