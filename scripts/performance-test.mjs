#!/usr/bin/env node

/**
 * Performance Testing Script for civic-intel-hub
 * Measures API response times, bundle sizes, and performance metrics
 */

import { performance } from 'perf_hooks';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class PerformanceTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      api: {},
      bundle: {},
      lighthouse: {},
      meta: {
        nodeVersion: process.version,
        platform: process.platform,
      },
    };
  }

  async measureApiEndpoint(url, label) {
    const measurements = [];
    const iterations = 5;

    console.log(`Testing ${label}: ${url}`);

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();

      try {
        const response = await fetch(url);
        const end = performance.now();

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const responseTime = end - start;

        measurements.push({
          responseTime,
          status: response.status,
          size: JSON.stringify(data).length,
          headers: Object.fromEntries(response.headers.entries()),
        });

        console.log(`  Iteration ${i + 1}: ${responseTime.toFixed(2)}ms`);
      } catch (error) {
        console.error(`  Iteration ${i + 1} failed:`, error.message);
        measurements.push({
          responseTime: null,
          error: error.message,
        });
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const validMeasurements = measurements.filter(m => m.responseTime !== null);
    const responseTimes = validMeasurements.map(m => m.responseTime);

    if (responseTimes.length === 0) {
      return {
        label,
        url,
        error: 'All requests failed',
        measurements,
      };
    }

    return {
      label,
      url,
      average: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      min: Math.min(...responseTimes),
      max: Math.max(...responseTimes),
      p95: this.calculatePercentile(responseTimes, 0.95),
      p99: this.calculatePercentile(responseTimes, 0.99),
      successRate: validMeasurements.length / measurements.length,
      averageSize:
        validMeasurements.length > 0
          ? validMeasurements.reduce((a, b) => a + (b.size || 0), 0) / validMeasurements.length
          : 0,
      measurements,
    };
  }

  calculatePercentile(arr, percentile) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[Math.max(0, index)];
  }

  async measureBundleSize() {
    console.log('Building production bundle...');

    try {
      const { stdout } = await execAsync('npm run build', {
        cwd: process.cwd(),
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      });

      console.log('Build completed successfully');

      // Parse Next.js build output for bundle sizes
      const buildLines = stdout.split('\n');
      const bundleInfo = {
        pages: {},
        chunks: {},
        total: 0,
      };

      // Look for bundle size information in build output
      let inBundleSection = false;
      for (const line of buildLines) {
        if (line.includes('Route (app)') || line.includes('Size')) {
          inBundleSection = true;
          continue;
        }

        if (inBundleSection && line.trim()) {
          // Parse bundle size lines (simplified)
          const sizeMatch = line.match(/(\d+(?:\.\d+)?)\s*(B|kB|MB)/);
          if (sizeMatch) {
            const [, size, unit] = sizeMatch;
            let bytes = parseFloat(size);
            if (unit === 'kB') bytes *= 1024;
            if (unit === 'MB') bytes *= 1024 * 1024;
            bundleInfo.total += bytes;
          }
        }
      }

      // Get .next directory size
      const nextDirPath = path.join(process.cwd(), '.next');
      if (fs.existsSync(nextDirPath)) {
        bundleInfo.nextDirSize = await this.getDirectorySize(nextDirPath);
      }

      return bundleInfo;
    } catch (error) {
      console.error('Build failed:', error.message);
      return { error: error.message };
    }
  }

  async getDirectorySize(dirPath) {
    let totalSize = 0;

    const traverse = async currentPath => {
      const stat = fs.statSync(currentPath);

      if (stat.isFile()) {
        totalSize += stat.size;
      } else if (stat.isDirectory()) {
        const items = fs.readdirSync(currentPath);
        for (const item of items) {
          await traverse(path.join(currentPath, item));
        }
      }
    };

    try {
      await traverse(dirPath);
      return totalSize;
    } catch (error) {
      console.error('Error calculating directory size:', error);
      return 0;
    }
  }

  async runLighthouse(url = 'http://localhost:3000') {
    console.log('Running Lighthouse audit...');

    try {
      const { stdout } = await execAsync(
        `npx lighthouse ${url} --output json --quiet --chrome-flags="--headless --no-sandbox"`,
        { maxBuffer: 1024 * 1024 * 10 }
      );

      const report = JSON.parse(stdout);

      return {
        performance: report.lhr.categories.performance.score * 100,
        accessibility: report.lhr.categories.accessibility.score * 100,
        bestPractices: report.lhr.categories['best-practices'].score * 100,
        seo: report.lhr.categories.seo.score * 100,
        fcp: report.lhr.audits['first-contentful-paint'].numericValue,
        lcp: report.lhr.audits['largest-contentful-paint'].numericValue,
        cls: report.lhr.audits['cumulative-layout-shift'].numericValue,
        tti: report.lhr.audits['interactive'].numericValue,
        tbt: report.lhr.audits['total-blocking-time'].numericValue,
      };
    } catch (error) {
      console.error('Lighthouse failed:', error.message);
      return { error: error.message };
    }
  }

  async runApiTests() {
    const baseUrl = 'http://localhost:3000';
    const endpoints = [
      { url: `${baseUrl}/api/districts/all`, label: 'Districts API' },
      { url: `${baseUrl}/api/representatives?zip=48221`, label: 'Representatives by ZIP' },
      { url: `${baseUrl}/api/representative/K000367`, label: 'Individual Representative' },
      { url: `${baseUrl}/api/representative/K000367/bills`, label: 'Representative Bills' },
    ];

    console.log('=== API Performance Tests ===');

    for (const endpoint of endpoints) {
      try {
        this.results.api[endpoint.label] = await this.measureApiEndpoint(
          endpoint.url,
          endpoint.label
        );
      } catch (error) {
        console.error(`Failed to test ${endpoint.label}:`, error);
        this.results.api[endpoint.label] = { error: error.message };
      }
    }
  }

  async runBundleTests() {
    console.log('\n=== Bundle Size Tests ===');
    this.results.bundle = await this.measureBundleSize();
  }

  async runLighthouseTests() {
    console.log('\n=== Lighthouse Performance Tests ===');
    this.results.lighthouse = await this.runLighthouse();
  }

  formatResults() {
    console.log('\n=== PERFORMANCE TEST RESULTS ===');
    console.log(`Timestamp: ${this.results.timestamp}`);
    console.log(`Platform: ${this.results.meta.platform}`);
    console.log(`Node: ${this.results.meta.nodeVersion}`);

    // API Results
    console.log('\nAPI Performance:');
    for (const [label, data] of Object.entries(this.results.api)) {
      if (data.error) {
        console.log(`  ${label}: ERROR - ${data.error}`);
      } else {
        console.log(`  ${label}:`);
        console.log(`    Average: ${data.average.toFixed(2)}ms`);
        console.log(`    P95: ${data.p95.toFixed(2)}ms`);
        console.log(`    Success Rate: ${(data.successRate * 100).toFixed(1)}%`);
        console.log(`    Avg Size: ${(data.averageSize / 1024).toFixed(2)}KB`);
      }
    }

    // Bundle Results
    console.log('\nBundle Analysis:');
    if (this.results.bundle.error) {
      console.log(`  ERROR: ${this.results.bundle.error}`);
    } else {
      console.log(`  Total Bundle Size: ${(this.results.bundle.total / 1024).toFixed(2)}KB`);
      if (this.results.bundle.nextDirSize) {
        console.log(
          `  .next Directory: ${(this.results.bundle.nextDirSize / 1024 / 1024).toFixed(2)}MB`
        );
      }
    }

    // Lighthouse Results
    console.log('\nLighthouse Scores:');
    if (this.results.lighthouse.error) {
      console.log(`  ERROR: ${this.results.lighthouse.error}`);
    } else {
      console.log(`  Performance: ${this.results.lighthouse.performance}/100`);
      console.log(`  Accessibility: ${this.results.lighthouse.accessibility}/100`);
      console.log(`  Best Practices: ${this.results.lighthouse.bestPractices}/100`);
      console.log(`  SEO: ${this.results.lighthouse.seo}/100`);
      console.log(`  FCP: ${this.results.lighthouse.fcp}ms`);
      console.log(`  LCP: ${this.results.lighthouse.lcp}ms`);
      console.log(`  CLS: ${this.results.lighthouse.cls}`);
    }
  }

  async saveResults() {
    const resultsDir = path.join(process.cwd(), 'performance-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `performance-${timestamp}.json`;
    const filepath = path.join(resultsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(this.results, null, 2));
    console.log(`\nResults saved to: ${filepath}`);

    // Also update latest.json
    const latestPath = path.join(resultsDir, 'latest.json');
    fs.writeFileSync(latestPath, JSON.stringify(this.results, null, 2));
    console.log(`Latest results: ${latestPath}`);
  }

  async run() {
    console.log('Starting performance test suite...\n');

    try {
      await this.runApiTests();
      await this.runBundleTests();
      await this.runLighthouseTests();

      this.formatResults();
      await this.saveResults();

      console.log('\nPerformance test suite completed successfully!');
    } catch (error) {
      console.error('Performance test suite failed:', error);
      process.exit(1);
    }
  }
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const tester = new PerformanceTester();
  tester.run().catch(console.error);
}

export default PerformanceTester;
