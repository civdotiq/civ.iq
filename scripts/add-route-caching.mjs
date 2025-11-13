#!/usr/bin/env node

/**
 * Add ISR Caching to API Routes
 *
 * Automatically adds `export const revalidate = <seconds>` to API routes
 * based on data freshness requirements.
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import fs from 'fs/promises';
import path from 'path';

// Cache duration categories (in seconds)
const CACHE_DURATIONS = {
  WEEK: 604800,    // 1 week - biographical, boundaries
  DAY: 86400,      // 1 day - profiles, demographics
  HOUR: 3600,      // 1 hour - bills, votes, finance
  FIVE_MIN: 300,   // 5 minutes - news, trending
  NO_CACHE: null,  // No caching - search, user-specific
};

// Route categorization by cache duration
const ROUTE_CATEGORIES = {
  [CACHE_DURATIONS.WEEK]: [
    'representative/[bioguideId]/simple',
    'representative-photo/[id]',
    'committee/[committeeId]/wikipedia',
    'district-boundaries/[districtId]',
    'district-boundaries/metadata',
    'state-boundaries/[stateCode]',
    'district-map',
    'congress/119th/stats',
    'districts/all',
  ],

  [CACHE_DURATIONS.DAY]: [
    'representative/[bioguideId]/route.ts',  // Main profile
    'representative/[bioguideId]/district',
    'representative/[bioguideId]/leadership',
    'representative/[bioguideId]/committees',
    'representatives/all',
    'v2/representatives/route.ts',
    'v2/representatives/[id]',
    'districts/[districtId]/route.ts',  // Main district
    'districts/[districtId]/economic-profile',
    'districts/[districtId]/government-spending',
    'districts/[districtId]/services-health',
    'districts/[districtId]/neighbors',
    'state-demographics/[stateCode]',
    'state-executives/[state]',
    'state-judiciary/[state]',
    'committees/route.ts',
    'committee/[committeeId]/route.ts',  // Main committee
    'committee/[committeeId]/timeline',
    'state-legislature/[state]/route.ts',  // Main state
    'state-legislature/[state]/legislator/[id]/route.ts',  // Main legislator
    'state-legislature/[state]/committee/[id]',
    'state-legislature/[state]/committees',
    'local-government/[location]',
  ],

  [CACHE_DURATIONS.HOUR]: [
    'bills/latest',
    'bill/[billId]/route.ts',
    'bill/[billId]/summary',
    'representative/[bioguideId]/bills',
    'committee/[committeeId]/bills',
    'committee/[committeeId]/reports',
    'state-legislature/[state]/bill/[id]',
    'state-bills/[state]',
    'state-legislature/[state]/legislator/[id]/bills',
    'vote/[voteId]',
    'senate-votes/[voteNumber]',
    'representative/[bioguideId]/votes',
    'representative/[bioguideId]/votes-simple',
    'representative/[bioguideId]/voting-record',
    'representative/[bioguideId]/party-alignment',
    'state-legislature/[state]/legislator/[id]/votes',
    'representative/[bioguideId]/finance/route.ts',
    'representative/[bioguideId]/finance/comprehensive',
    'representative/[bioguideId]/finance/contributors',
    'representative/[bioguideId]/finance/expenditures',
    'representative/[bioguideId]/finance/funding-sources',
    'representative/[bioguideId]/finance/geography',
    'representative/[bioguideId]/finance/industries',
    'representative/[bioguideId]/election-cycles',
    'representative/[bioguideId]/state-legislature',
    'representative/[bioguideId]/lobbying',
    'representatives/by-district',
    'state-representatives',
    'compare',
  ],

  [CACHE_DURATIONS.FIVE_MIN]: [
    'representative/[bioguideId]/news',
    'districts/[districtId]/news',
    'state-legislature/[state]/legislator/[id]/news',
    'news/batch',
    'representative/[bioguideId]/trending',
    'cron/rss-aggregator',
    'gdelt/route.ts',
    'gdelt/batch',
    'gdelt/cache/status',
  ],

  // NO_CACHE routes - skip these
  [CACHE_DURATIONS.NO_CACHE]: [
    'search',
    'geocode',
    'unified-geocode',
    'state-legislators-by-address',
    'representatives-multi-district',
    'representative/[bioguideId]/batch',
    'warmup',
    'admin/cache',
    'admin/fec-health',
    'debug/route.ts',
    'debug/clear-cache',
    'cache/status',
    'cache/warm',
    'cache/refresh',
    'cache/invalidate',
    'health/route.ts',
    'health/redis',
    'agent',
  ],
};

class CacheAdder {
  constructor() {
    this.stats = {
      total: 0,
      added: 0,
      skipped: 0,
      failed: 0,
    };
  }

  /**
   * Find all API route files
   */
  async findRouteFiles() {
    const routesDir = path.join(process.cwd(), 'src', 'app', 'api');
    const files = [];

    async function walk(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.name === 'route.ts') {
          files.push(fullPath);
        }
      }
    }

    await walk(routesDir);
    return files;
  }

  /**
   * Get cache duration for a route path
   */
  getCacheDuration(routePath) {
    // Convert absolute path to relative API path
    const apiPath = routePath
      .replace(/.*\/src\/app\/api\//, '')
      .replace(/\/route\.ts$/, '');

    // Check each category
    for (const [duration, patterns] of Object.entries(ROUTE_CATEGORIES)) {
      for (const pattern of patterns) {
        // Exact match
        if (apiPath === pattern || apiPath + '/route.ts' === pattern) {
          return duration === 'null' ? null : parseInt(duration);
        }

        // Pattern match (without /route.ts suffix)
        const cleanPattern = pattern.replace(/\/route\.ts$/, '');
        if (apiPath === cleanPattern) {
          return duration === 'null' ? null : parseInt(duration);
        }
      }
    }

    return null; // No cache by default
  }

  /**
   * Check if file already has revalidate export
   */
  async hasRevalidate(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    return /export\s+const\s+revalidate\s*=/.test(content);
  }

  /**
   * Add revalidate export to file
   */
  async addRevalidate(filePath, duration) {
    const content = await fs.readFile(filePath, 'utf-8');

    // Find the position after the last import
    const lines = content.split('\n');
    let insertIndex = 0;
    let foundImports = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Track imports
      if (line.startsWith('import ') || line.startsWith('import{')) {
        foundImports = true;
        insertIndex = i + 1;
      }
      // Stop at first non-import, non-empty, non-comment line after imports
      else if (foundImports && line && !line.startsWith('//') && !line.startsWith('/*')) {
        break;
      }
    }

    // Insert revalidate export after imports
    const comment = `// ISR: Revalidate every ${this.formatDuration(duration)}`;
    const exportLine = `export const revalidate = ${duration};`;

    lines.splice(insertIndex, 0, '', comment, exportLine);

    const newContent = lines.join('\n');
    await fs.writeFile(filePath, newContent, 'utf-8');
  }

  /**
   * Format duration for human-readable comment
   */
  formatDuration(seconds) {
    if (seconds >= 604800) return `${seconds / 604800} week`;
    if (seconds >= 86400) return `${seconds / 86400} day`;
    if (seconds >= 3600) return `${seconds / 3600} hour`;
    if (seconds >= 60) return `${seconds / 60} minutes`;
    return `${seconds} seconds`;
  }

  /**
   * Process all routes
   */
  async processRoutes() {
    console.log('🔄 Adding ISR caching to API routes...\n');

    const routeFiles = await this.findRouteFiles();
    this.stats.total = routeFiles.length;

    console.log(`📋 Found ${this.stats.total} route files\n`);

    for (const filePath of routeFiles) {
      const relativePath = filePath.replace(process.cwd() + '/', '');
      const duration = this.getCacheDuration(filePath);

      try {
        // Skip if no cache
        if (duration === null) {
          console.log(`⏭️  ${relativePath} - No cache (user-specific/dynamic)`);
          this.stats.skipped++;
          continue;
        }

        // Skip if already has revalidate
        if (await this.hasRevalidate(filePath)) {
          console.log(`⏭️  ${relativePath} - Already cached`);
          this.stats.skipped++;
          continue;
        }

        // Add revalidate export
        await this.addRevalidate(filePath, duration);
        console.log(`✅ ${relativePath} - Added ${this.formatDuration(duration)} cache`);
        this.stats.added++;

      } catch (error) {
        console.error(`❌ ${relativePath} - Failed: ${error.message}`);
        this.stats.failed++;
      }
    }

    // Final statistics
    console.log('\n📊 Final Statistics:');
    console.log(`   Total Routes: ${this.stats.total}`);
    console.log(`   Cache Added: ${this.stats.added}`);
    console.log(`   Skipped (no cache or existing): ${this.stats.skipped}`);
    console.log(`   Failed: ${this.stats.failed}`);
    console.log('\n✅ ISR caching setup complete!\n');
  }
}

// Run the cache adder
const adder = new CacheAdder();
adder.processRoutes().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
