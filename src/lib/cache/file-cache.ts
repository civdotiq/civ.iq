/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import logger from '@/lib/logging/simple-logger';

interface FileCacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
  hash: string;
}

export class FileCache {
  private cacheDir: string;

  constructor(cacheDir?: string) {
    // Use .next/cache for persistent caching between restarts
    this.cacheDir = cacheDir || path.join(process.cwd(), '.next', 'cache', 'congress-data');
  }

  private async ensureCacheDir(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create cache directory', error as Error, {
        cacheDir: this.cacheDir,
      });
    }
  }

  private getCachePath(key: string): string {
    // Create safe filename from key
    const safeKey = key.replace(/[^a-zA-Z0-9-_]/g, '_');
    return path.join(this.cacheDir, `${safeKey}.json`);
  }

  private generateHash(data: unknown): string {
    return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const filePath = this.getCachePath(key);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const entry: FileCacheEntry<T> = JSON.parse(fileContent);

      // Check if cache is expired
      const now = Date.now();
      const age = now - entry.timestamp;
      if (age > entry.ttl * 1000) {
        logger.info('File cache expired', { key, age, ttl: entry.ttl });
        await this.delete(key);
        return null;
      }

      logger.info('File cache hit', { key, age: Math.round(age / 1000) });
      return entry.data;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'ENOENT') {
        logger.error('File cache read error', err, { key });
      }
      return null;
    }
  }

  async set<T>(key: string, data: T, ttlSeconds: number = 86400): Promise<boolean> {
    try {
      await this.ensureCacheDir();

      const entry: FileCacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttlSeconds,
        hash: this.generateHash(data),
      };

      const filePath = this.getCachePath(key);
      await fs.writeFile(filePath, JSON.stringify(entry, null, 2), 'utf-8');

      logger.info('File cache write successful', {
        key,
        ttl: ttlSeconds,
        size: JSON.stringify(entry).length,
      });
      return true;
    } catch (error) {
      logger.error('File cache write error', error as Error, { key });
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const filePath = this.getCachePath(key);
      await fs.unlink(filePath);
      logger.info('File cache entry deleted', { key });
      return true;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'ENOENT') {
        logger.error('File cache delete error', err, { key });
      }
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir);
      await Promise.all(files.map(file => fs.unlink(path.join(this.cacheDir, file))));
      logger.info('File cache cleared', { count: files.length });
    } catch (error) {
      logger.error('File cache clear error', error as Error);
    }
  }

  async getStats(): Promise<{
    entries: number;
    totalSize: number;
    oldestEntry: number;
  }> {
    try {
      const files = await fs.readdir(this.cacheDir);
      let totalSize = 0;
      let oldestEntry = Date.now();

      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const stat = await fs.stat(filePath);
        totalSize += stat.size;

        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const entry = JSON.parse(content);
          if (entry.timestamp < oldestEntry) {
            oldestEntry = entry.timestamp;
          }
        } catch {
          // Ignore parse errors
        }
      }

      return {
        entries: files.length,
        totalSize,
        oldestEntry,
      };
    } catch (error) {
      logger.error('File cache stats error', error as Error);
      return { entries: 0, totalSize: 0, oldestEntry: Date.now() };
    }
  }
}

// Singleton instance
let fileCacheInstance: FileCache | null = null;

export function getFileCache(): FileCache {
  if (!fileCacheInstance) {
    fileCacheInstance = new FileCache();
  }
  return fileCacheInstance;
}
