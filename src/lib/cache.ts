// Simple in-memory cache with TTL
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry>();
  private defaultTTL = 3600 * 1000; // 1 hour in milliseconds

  set(key: string, data: any, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  size(): number {
    return this.cache.size;
  }
}

export const cache = new SimpleCache();

// Cache helper function with automatic key generation
export async function cachedFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cached = cache.get(key);
  if (cached) {
    console.log(`Cache hit for key: ${key}`);
    return cached;
  }

  console.log(`Cache miss for key: ${key}`);
  const data = await fetchFn();
  cache.set(key, data, ttl);
  return data;
}