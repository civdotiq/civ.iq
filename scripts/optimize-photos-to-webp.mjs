#!/usr/bin/env node

/**
 * Optimize Representative Photos to WebP
 *
 * Converts downloaded JPG photos to WebP format for better compression
 * and faster loading times (60-80% file size reduction).
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const CONFIG = {
  inputDir: path.join(process.cwd(), 'public', 'photos'),
  outputDir: path.join(process.cwd(), 'public', 'photos', 'webp'),
  quality: 85, // WebP quality (85 is a good balance)
  testMode: process.env.TEST_MODE === 'true',
};

class PhotoOptimizer {
  constructor() {
    this.stats = {
      total: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      originalBytes: 0,
      optimizedBytes: 0,
    };
  }

  /**
   * Get all JPG files in the input directory
   */
  async getPhotoFiles() {
    try {
      const files = await fs.readdir(CONFIG.inputDir);
      return files.filter(file => file.toLowerCase().endsWith('.jpg'));
    } catch (error) {
      console.error('Error reading input directory:', error.message);
      throw error;
    }
  }

  /**
   * Optimize a single photo to WebP
   */
  async optimizePhoto(filename) {
    const inputPath = path.join(CONFIG.inputDir, filename);
    const outputPath = path.join(
      CONFIG.outputDir,
      filename.replace(/\.jpg$/i, '.webp')
    );

    try {
      // Check if output already exists
      try {
        await fs.access(outputPath);
        // File exists, skip
        this.stats.skipped++;
        return { success: true, skipped: true };
      } catch {
        // File doesn't exist, proceed with optimization
      }

      // Get original file size
      const inputStats = await fs.stat(inputPath);
      const originalSize = inputStats.size;

      // Convert to WebP
      await sharp(inputPath)
        .webp({ quality: CONFIG.quality })
        .toFile(outputPath);

      // Get optimized file size
      const outputStats = await fs.stat(outputPath);
      const optimizedSize = outputStats.size;

      this.stats.originalBytes += originalSize;
      this.stats.optimizedBytes += optimizedSize;

      const reduction = Math.round((1 - optimizedSize / originalSize) * 100);

      return {
        success: true,
        skipped: false,
        originalSize,
        optimizedSize,
        reduction,
      };
    } catch (error) {
      console.error(`Error optimizing ${filename}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Optimize all photos
   */
  async optimizeAll() {
    console.log('🎨 Starting photo optimization to WebP...\n');

    // Create output directory
    console.log('📁 Creating output directory...');
    await fs.mkdir(CONFIG.outputDir, { recursive: true });
    console.log(`   → ${CONFIG.outputDir}\n`);

    // Get all photo files
    console.log('📋 Finding photo files...');
    let photoFiles = await this.getPhotoFiles();

    if (CONFIG.testMode) {
      photoFiles = photoFiles.slice(0, 5);
      console.log(`⚠️  TEST MODE: Processing only ${photoFiles.length} photos\n`);
    }

    this.stats.total = photoFiles.length;
    console.log(`✓ Found ${this.stats.total} photos to optimize\n`);

    if (this.stats.total === 0) {
      console.log('⚠️  No photos found. Run download-representative-photos.mjs first.\n');
      return;
    }

    // Optimize photos with progress tracking
    let processed = 0;
    const startTime = Date.now();

    for (const filename of photoFiles) {
      processed++;

      const result = await this.optimizePhoto(filename);

      if (result.success) {
        if (result.skipped) {
          console.log(`[${processed}/${this.stats.total}] ${filename} - Skipped (already exists)`);
        } else {
          this.stats.successful++;
          const originalKB = (result.originalSize / 1024).toFixed(1);
          const optimizedKB = (result.optimizedSize / 1024).toFixed(1);
          console.log(
            `[${processed}/${this.stats.total}] ${filename} - Optimized (${originalKB} KB → ${optimizedKB} KB, -${result.reduction}%)`
          );
        }
      } else {
        this.stats.failed++;
        console.log(`[${processed}/${this.stats.total}] ${filename} - Failed (${result.error})`);
      }

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
    const originalMB = (this.stats.originalBytes / 1024 / 1024).toFixed(2);
    const optimizedMB = (this.stats.optimizedBytes / 1024 / 1024).toFixed(2);
    const totalReduction = this.stats.originalBytes > 0
      ? Math.round((1 - this.stats.optimizedBytes / this.stats.originalBytes) * 100)
      : 0;
    const savedMB = ((this.stats.originalBytes - this.stats.optimizedBytes) / 1024 / 1024).toFixed(2);

    console.log('\n📊 Final Statistics:');
    console.log(`   Total Photos: ${this.stats.total}`);
    console.log(
      `   Optimized: ${this.stats.successful} (${Math.round((this.stats.successful / this.stats.total) * 100)}%)`
    );
    console.log(
      `   Skipped (existing): ${this.stats.skipped} (${Math.round((this.stats.skipped / this.stats.total) * 100)}%)`
    );
    console.log(
      `   Failed: ${this.stats.failed} (${Math.round((this.stats.failed / this.stats.total) * 100)}%)`
    );
    console.log(`   Original Size: ${originalMB} MB`);
    console.log(`   Optimized Size: ${optimizedMB} MB`);
    console.log(`   Total Reduction: ${totalReduction}% (saved ${savedMB} MB)`);
    console.log(`   Total Time: ${totalTime}s`);
    console.log('\n✅ Photo optimization complete!\n');
  }
}

// Run the optimizer
const optimizer = new PhotoOptimizer();
optimizer.optimizeAll().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
