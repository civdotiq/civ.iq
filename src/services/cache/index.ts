// Export unified cache services
// UNIFIED CACHE: Redis primary with in-memory fallback for high availability

export { govCache, unifiedCache, cachedFetch, cachedHeavyEndpoint } from './unified-cache.service';
export type { CacheOptions, CacheStats } from './unified-cache.service';
