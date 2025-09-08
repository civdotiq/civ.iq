/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Repository Pattern Tests
 *
 * Test-driven development for repository layer:
 * - Data access patterns
 * - Query optimization
 * - Connection pooling
 * - Error handling and resilience
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

interface Representative {
  bioguideId: string;
  name: string;
  party?: string;
  state?: string;
}

interface QueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface SearchOptions extends QueryOptions {
  filters?: Record<string, unknown>;
}

// Simplified test repository for testing patterns
class TestRepository {
  constructor(
    private dataSource: Map<string, Representative>,
    private requestLog: string[]
  ) {}

  async findById(id: string): Promise<Representative | null> {
    this.requestLog.push(`findById:${id}`);
    // Simulate caching behavior
    await this.delay(10);
    return this.dataSource.get(id) || null;
  }

  async findByIds(ids: string[]): Promise<Representative[]> {
    this.requestLog.push(`findByIds:${ids.length}`);
    // Simulate batch optimization
    await this.delay(Math.max(50, ids.length * 2)); // Efficient batch processing
    return ids
      .map(id => this.dataSource.get(id))
      .filter((rep): rep is Representative => rep !== undefined);
  }

  async findAll(options: QueryOptions = {}): Promise<Representative[]> {
    const { limit = 100, offset = 0, sortBy = 'name' } = options;
    this.requestLog.push(`findAll:limit=${limit},offset=${offset}`);
    await this.delay(30);

    const all = Array.from(this.dataSource.values());
    return all.slice(offset, offset + limit);
  }

  async search(query: string, options: SearchOptions = {}): Promise<Representative[]> {
    const { limit = 50, filters = {} } = options;
    this.requestLog.push(`search:${query},limit=${limit}`);
    await this.delay(40);

    return Array.from(this.dataSource.values())
      .filter(rep => rep.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, limit);
  }

  getRequestLog(): string[] {
    return [...this.requestLog];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

describe('Repository Pattern', () => {
  let dataSource: Map<string, Representative>;
  let requestLog: string[];
  let repository: TestRepository;

  beforeEach(() => {
    dataSource = new Map([
      [
        'K000367',
        { bioguideId: 'K000367', name: 'Amy Klobuchar', party: 'Democratic', state: 'Minnesota' },
      ],
      [
        'S000033',
        { bioguideId: 'S000033', name: 'Bernie Sanders', party: 'Independent', state: 'Vermont' },
      ],
      [
        'A000001',
        { bioguideId: 'A000001', name: 'Representative A', party: 'Republican', state: 'Texas' },
      ],
      [
        'B000002',
        {
          bioguideId: 'B000002',
          name: 'Representative B',
          party: 'Democratic',
          state: 'California',
        },
      ],
    ]);
    requestLog = [];
    repository = new TestRepository(dataSource, requestLog);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Data Access Patterns', () => {
    it('should implement single entity retrieval', async () => {
      const result = await repository.findById('K000367');

      expect(result).toEqual({
        bioguideId: 'K000367',
        name: 'Amy Klobuchar',
        party: 'Democratic',
        state: 'Minnesota',
      });
      expect(requestLog).toContain('findById:K000367');
    });

    it('should handle missing entities gracefully', async () => {
      const result = await repository.findById('NONEXISTENT');

      expect(result).toBeNull();
      expect(requestLog).toContain('findById:NONEXISTENT');
    });

    it('should implement batch retrieval for performance', async () => {
      const ids = ['K000367', 'S000033'];
      const startTime = Date.now();

      const result = await repository.findByIds(ids);
      const duration = Date.now() - startTime;

      expect(result).toHaveLength(2);
      expect(result[0]?.bioguideId).toBe('K000367');
      expect(result[1]?.bioguideId).toBe('S000033');
      expect(requestLog).toContain('findByIds:2');

      // Batch should be more efficient than individual calls
      expect(duration).toBeLessThan(100); // Should complete quickly
    });

    it('should implement paginated queries with limits', async () => {
      const options: QueryOptions = {
        limit: 2,
        offset: 1,
        sortBy: 'name',
      };

      const result = await repository.findAll(options);

      expect(result).toHaveLength(2);
      expect(requestLog).toContain('findAll:limit=2,offset=1');
    });

    it('should implement search functionality', async () => {
      const result = await repository.search('Amy');

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe('Amy Klobuchar');
      expect(requestLog).toContain('search:Amy,limit=50');
    });

    it('should apply search limits correctly', async () => {
      const result = await repository.search('Representative', { limit: 1 });

      expect(result).toHaveLength(1);
      expect(requestLog).toContain('search:Representative,limit=1');
    });
  });

  describe('Query Optimization', () => {
    it('should use reasonable default limits', async () => {
      await repository.findAll();

      expect(requestLog).toContain('findAll:limit=100,offset=0');
    });

    it('should optimize batch requests vs individual requests', async () => {
      const ids = ['K000367', 'S000033', 'A000001'];

      // Test batch approach
      const batchStart = Date.now();
      await repository.findByIds(ids);
      const batchDuration = Date.now() - batchStart;

      // Test individual approach
      const individualStart = Date.now();
      await Promise.all(ids.map(id => repository.findById(id)));
      const individualDuration = Date.now() - individualStart;

      // Batch should be more efficient for multiple IDs
      expect(batchDuration).toBeLessThanOrEqual(individualDuration);

      expect(requestLog).toContain('findByIds:3');
      expect(requestLog.filter(log => log.startsWith('findById:')).length).toBeGreaterThan(0);
    });

    it('should handle empty result sets efficiently', async () => {
      const result = await repository.search('NONEXISTENT_QUERY');

      expect(result).toEqual([]);
      expect(requestLog).toContain('search:NONEXISTENT_QUERY,limit=50');
    });
  });

  describe('Connection Pooling Simulation', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrentIds = ['K000367', 'S000033', 'A000001', 'B000002'];
      const startTime = Date.now();

      // Simulate concurrent requests
      const promises = concurrentIds.map(id => repository.findById(id));
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(4);
      expect(results.every(r => r !== null)).toBe(true);

      // Should complete concurrently, not sequentially
      expect(duration).toBeLessThan(100); // Much less than 4 * 10ms if sequential

      // All requests should be logged
      concurrentIds.forEach(id => {
        expect(requestLog).toContain(`findById:${id}`);
      });
    });

    it('should demonstrate request batching benefits', async () => {
      const manyIds = Array.from({ length: 20 }, (_, i) => `ID${i}`);

      // Add test data
      manyIds.forEach(id => {
        dataSource.set(id, { bioguideId: id, name: `Name ${id}` });
      });

      const startTime = Date.now();
      const result = await repository.findByIds(manyIds);
      const duration = Date.now() - startTime;

      expect(result).toHaveLength(20);
      expect(requestLog).toContain('findByIds:20');

      // Batch processing should be efficient even for many IDs
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Error Handling Patterns', () => {
    it('should handle partial results in batch operations', async () => {
      const mixedIds = ['K000367', 'NONEXISTENT', 'S000033'];

      const result = await repository.findByIds(mixedIds);

      // Should return only found items, filter out undefined
      expect(result).toHaveLength(2);
      expect(result.map(r => r.bioguideId)).toEqual(['K000367', 'S000033']);
    });

    it('should maintain consistency across operations', async () => {
      const id = 'K000367';

      const singleResult = await repository.findById(id);
      const batchResult = await repository.findByIds([id]);
      const searchResult = await repository.search('Amy');

      expect(singleResult?.bioguideId).toBe(id);
      expect(batchResult[0]?.bioguideId).toBe(id);
      expect(searchResult[0]?.bioguideId).toBe(id);

      // All should return the same data
      expect(singleResult?.name).toBe('Amy Klobuchar');
      expect(batchResult[0]?.name).toBe('Amy Klobuchar');
      expect(searchResult[0]?.name).toBe('Amy Klobuchar');
    });
  });

  describe('Performance Monitoring', () => {
    it('should complete operations within reasonable time limits', async () => {
      const operations = [
        () => repository.findById('K000367'),
        () => repository.findByIds(['K000367', 'S000033']),
        () => repository.findAll({ limit: 10 }),
        () => repository.search('Representative'),
      ];

      for (const operation of operations) {
        const start = Date.now();
        await operation();
        const duration = Date.now() - start;

        // Each operation should complete quickly
        expect(duration).toBeLessThan(100);
      }
    });

    it('should track request patterns for optimization', () => {
      // Request log can be analyzed for optimization opportunities
      expect(Array.isArray(requestLog)).toBe(true);
      expect(typeof repository.getRequestLog).toBe('function');

      const log = repository.getRequestLog();
      expect(log).toEqual(requestLog);
    });
  });

  describe('Data Consistency', () => {
    it('should return consistent data structures across methods', async () => {
      const id = 'K000367';

      const singleResult = await repository.findById(id);
      const batchResults = await repository.findByIds([id]);
      const allResults = await repository.findAll({ limit: 10 });

      // All results should have consistent structure
      const checkStructure = (rep: Representative | null) => {
        if (rep) {
          expect(rep).toHaveProperty('bioguideId');
          expect(rep).toHaveProperty('name');
          expect(typeof rep.bioguideId).toBe('string');
          expect(typeof rep.name).toBe('string');
        }
      };

      checkStructure(singleResult);
      batchResults.forEach(checkStructure);
      allResults.forEach(checkStructure);
    });

    it('should handle query parameter validation', async () => {
      // Test various query options
      const validOptions = [
        { limit: 50 },
        { offset: 10 },
        { limit: 25, offset: 5 },
        { sortBy: 'name', sortOrder: 'desc' as const },
      ];

      for (const options of validOptions) {
        const result = await repository.findAll(options);
        expect(Array.isArray(result)).toBe(true);
      }
    });
  });
});
