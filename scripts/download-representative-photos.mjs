#!/usr/bin/env node

/**
 * Download Representative Photos
 *
 * Downloads official photos for all current representatives from the
 * unitedstates/images GitHub repository and saves them locally.
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  outputDir: path.join(process.cwd(), 'public', 'photos'),
  mappingsPath: path.join(process.cwd(), 'src', 'lib', 'data', 'enhanced-wikipedia-mappings.ts'),
  requestDelay: 100, // 100ms between requests
  timeout: 10000, // 10 second timeout
  maxRetries: 2,
  testMode: process.env.TEST_MODE === 'true',
  testLimit: 5,
  // Photo size to download (450x550 is a good balance)
  photoSize: '450x550',
};

// Photo source URLs (from representative-photo API endpoint)
const PHOTO_SOURCES = [
  {
    name: 'unitedstates-450x550',
    urlPattern: id =>
      `https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/${id.toUpperCase()}.jpg`,
  },
  {
    name: 'unitedstates-225x275',
    urlPattern: id =>
      `https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/225x275/${id.toUpperCase()}.jpg`,
  },
  {
    name: 'unitedstates-original',
    urlPattern: id =>
      `https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/original/${id.toUpperCase()}.jpg`,
  },
];

class PhotoDownloader {
  constructor() {
    this.stats = {
      total: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      totalBytes: 0,
    };
  }

  /**
   * Sleep helper for rate limiting
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Fetch with timeout and retry
   */
  async fetchWithRetry(url, retries = CONFIG.maxRetries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'CivicIntelHub/1.0 (https://civ.iq) Photo Downloader',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok && retries > 0) {
        await this.sleep(CONFIG.requestDelay * 2);
        return this.fetchWithRetry(url, retries - 1);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (retries > 0) {
        await this.sleep(CONFIG.requestDelay * 2);
        return this.fetchWithRetry(url, retries - 1);
      }

      throw error;
    }
  }

  /**
   * Load bioguide IDs from TypeScript mapping file
   */
  async loadBioguideIds() {
    try {
      const content = await fs.readFile(CONFIG.mappingsPath, 'utf-8');

      // Extract the mapping object from TypeScript file
      const mappingMatch = content.match(/export const ENHANCED_BIOGUIDE_TO_WIKIPEDIA[^{]*{([^}]+)}/s);

      if (!mappingMatch) {
        throw new Error('Could not find ENHANCED_BIOGUIDE_TO_WIKIPEDIA mapping');
      }

      // Parse each line of the mapping
      const lines = mappingMatch[1].split('\n');
      const bioguideIds = [];

      for (const line of lines) {
        // Match pattern: BIOGUIDE_ID: 'Wikipedia_Page_Name',
        const lineMatch = line.trim().match(/^([A-Z]\d+):/);
        if (lineMatch) {
          bioguideIds.push(lineMatch[1]);
        }
      }

      console.log(`  Parsed ${bioguideIds.length} bioguide IDs`);
      return bioguideIds;
    } catch (error) {
      console.error('Error loading bioguide IDs:', error.message);
      throw error;
    }
  }

  /**
   * Download a single photo
   */
  async downloadPhoto(bioguideId) {
    // Check if file already exists
    const outputPath = path.join(CONFIG.outputDir, `${bioguideId}.jpg`);

    try {
      await fs.access(outputPath);
      // File exists, skip
      this.stats.skipped++;
      return { success: true, skipped: true };
    } catch {
      // File doesn't exist, proceed with download
    }

    // Try each photo source until we find one
    for (const source of PHOTO_SOURCES) {
      try {
        const url = source.urlPattern(bioguideId);
        const response = await this.fetchWithRetry(url);

        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer());

          // Save to file
          await fs.writeFile(outputPath, buffer);

          this.stats.totalBytes += buffer.length;
          return {
            success: true,
            skipped: false,
            size: buffer.length,
            source: source.name,
          };
        }
      } catch (error) {
        // Try next source
        continue;
      }
    }

    // No photo found from any source
    return { success: false, error: 'No photo found' };
  }

  /**
   * Download all photos
   */
  async downloadAll() {
    console.log('📸 Starting representative photo download...\n');

    // Create output directory
    console.log('📁 Creating output directory...');
    await fs.mkdir(CONFIG.outputDir, { recursive: true });
    console.log(`   → ${CONFIG.outputDir}\n`);

    // Load bioguide IDs
    console.log('📋 Loading bioguide IDs...');
    let bioguideIds = await this.loadBioguideIds();

    // Test mode: only process first few
    if (CONFIG.testMode) {
      bioguideIds = bioguideIds.slice(0, CONFIG.testLimit);
      console.log(`⚠️  TEST MODE: Processing only ${bioguideIds.length} representatives\n`);
    }

    this.stats.total = bioguideIds.length;
    console.log(`✓ Found ${this.stats.total} representatives\n`);

    // Download photos with progress tracking
    let processed = 0;
    const startTime = Date.now();

    for (const bioguideId of bioguideIds) {
      processed++;

      const result = await this.downloadPhoto(bioguideId);

      if (result.success) {
        if (result.skipped) {
          console.log(`[${processed}/${this.stats.total}] ${bioguideId} - Skipped (already exists)`);
        } else {
          this.stats.successful++;
          const sizeMB = (result.size / 1024 / 1024).toFixed(2);
          console.log(
            `[${processed}/${this.stats.total}] ${bioguideId} - Downloaded (${sizeMB} MB, ${result.source})`
          );
        }
      } else {
        this.stats.failed++;
        console.log(`[${processed}/${this.stats.total}] ${bioguideId} - Failed (${result.error})`);
      }

      // Rate limiting
      await this.sleep(CONFIG.requestDelay);

      // Progress update every 50 items
      if (processed % 50 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const rate = (processed / (Date.now() - startTime)) * 1000;
        const remaining = ((this.stats.total - processed) / rate).toFixed(0);
        console.log(
          `\n📊 Progress: ${processed}/${this.stats.total} (${Math.round((processed / this.stats.total) * 100)}%) - ${elapsed}s elapsed, ~${remaining}s remaining\n`
        );
      }
    }

    // Final statistics
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const totalSizeMB = (this.stats.totalBytes / 1024 / 1024).toFixed(2);

    console.log('\n📊 Final Statistics:');
    console.log(`   Total Representatives: ${this.stats.total}`);
    console.log(
      `   Downloaded: ${this.stats.successful} (${Math.round((this.stats.successful / this.stats.total) * 100)}%)`
    );
    console.log(
      `   Skipped (existing): ${this.stats.skipped} (${Math.round((this.stats.skipped / this.stats.total) * 100)}%)`
    );
    console.log(
      `   Failed: ${this.stats.failed} (${Math.round((this.stats.failed / this.stats.total) * 100)}%)`
    );
    console.log(`   Total Size: ${totalSizeMB} MB`);
    console.log(`   Total Time: ${totalTime}s`);
    console.log('\n✅ Photo download complete!\n');
  }
}

// Run the downloader
const downloader = new PhotoDownloader();
downloader.downloadAll().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
