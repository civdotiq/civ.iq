#!/usr/bin/env node
/**
 * Performance Benchmark Suite
 * Comprehensive performance testing for civic-intel-hub
 */

import { metricsCollector } from '../src/lib/performance/metrics-collector';
import fs from 'fs';
import path from 'path';

interface BenchmarkConfig {
  name: string;
  url: string;
  method?: string;
  expectedStatus?: number;
  warmupRuns?: number;
  testRuns?: number;
}

interface BenchmarkResult {
  name: string;
  url: string;
  runs: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  errorCount: number;
  successRate: number;
}

class PerformanceBenchmark {
  private baseUrl: string;
  private results: BenchmarkResult[] = [];

  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Run a single benchmark test
   */
  async runBenchmark(config: BenchmarkConfig): Promise<BenchmarkResult> {
    const {
      name,
      url,
      method = 'GET',
      expectedStatus = 200,
      warmupRuns = 3,
      testRuns = 10,
    } = config;

    console.log(`\n🔬 Running benchmark: ${name}`);
    console.log(`   URL: ${this.baseUrl}${url}`);
    console.log(`   Method: ${method}`);
    console.log(`   Warmup runs: ${warmupRuns}`);
    console.log(`   Test runs: ${testRuns}`);

    // Warmup runs
    console.log('   Warming up...');
    for (let i = 0; i < warmupRuns; i++) {
      await this.makeRequest(url, method);
      process.stdout.write('.');
    }
    console.log(' ✓');

    // Test runs
    console.log('   Running tests...');
    const durations: number[] = [];
    let errorCount = 0;

    for (let i = 0; i < testRuns; i++) {
      const startTime = performance.now();
      try {
        const response = await fetch(`${this.baseUrl}${url}`, { method });
        const endTime = performance.now();
        const duration = endTime - startTime;

        if (response.status === expectedStatus) {
          durations.push(duration);
          process.stdout.write('✓');
        } else {
          errorCount++;
          process.stdout.write('✗');
        }
      } catch (error) {
        errorCount++;
        process.stdout.write('✗');
      }
    }
    console.log('');

    // Calculate statistics
    const sortedDurations = durations.sort((a, b) => a - b);
    const result: BenchmarkResult = {
      name,
      url,
      runs: testRuns,
      avgDuration: this.average(sortedDurations),
      minDuration: Math.min(...sortedDurations),
      maxDuration: Math.max(...sortedDurations),
      p50Duration: this.percentile(sortedDurations, 50),
      p95Duration: this.percentile(sortedDurations, 95),
      p99Duration: this.percentile(sortedDurations, 99),
      errorCount,
      successRate: ((testRuns - errorCount) / testRuns) * 100,
    };

    this.results.push(result);
    this.printResult(result);
    return result;
  }

  /**
   * Run all benchmarks
   */
  async runAll(benchmarks: BenchmarkConfig[]): Promise<void> {
    console.log('🚀 Starting Performance Benchmark Suite');
    console.log('═'.repeat(60));

    const startTime = Date.now();

    for (const benchmark of benchmarks) {
      await this.runBenchmark(benchmark);
    }

    const totalTime = Date.now() - startTime;
    console.log('\n' + '═'.repeat(60));
    console.log(`✅ All benchmarks completed in ${(totalTime / 1000).toFixed(2)}s`);

    this.printSummary();
    await this.saveResults();
  }

  /**
   * Compare with baseline
   */
  async compareWithBaseline(): Promise<void> {
    const baselinePath = path.join(process.cwd(), 'performance-baseline.json');

    if (!fs.existsSync(baselinePath)) {
      console.log('\n📊 No baseline found. Current results will be saved as baseline.');
      await this.saveBaseline();
      return;
    }

    const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
    console.log('\n📊 Comparing with baseline:');
    console.log('═'.repeat(60));

    for (const result of this.results) {
      const baselineResult = baseline.find((b: BenchmarkResult) => b.name === result.name);
      if (baselineResult) {
        const avgDiff =
          ((result.avgDuration - baselineResult.avgDuration) / baselineResult.avgDuration) * 100;
        const p95Diff =
          ((result.p95Duration - baselineResult.p95Duration) / baselineResult.p95Duration) * 100;

        const avgSymbol = avgDiff > 10 ? '🔴' : avgDiff < -10 ? '🟢' : '🟡';
        const p95Symbol = p95Diff > 10 ? '🔴' : p95Diff < -10 ? '🟢' : '🟡';

        console.log(`\n${result.name}:`);
        console.log(
          `  Avg: ${result.avgDuration.toFixed(2)}ms (${avgDiff >= 0 ? '+' : ''}${avgDiff.toFixed(1)}%) ${avgSymbol}`
        );
        console.log(
          `  P95: ${result.p95Duration.toFixed(2)}ms (${p95Diff >= 0 ? '+' : ''}${p95Diff.toFixed(1)}%) ${p95Symbol}`
        );
      }
    }
  }

  /**
   * Make HTTP request
   */
  private async makeRequest(url: string, method: string): Promise<Response> {
    return fetch(`${this.baseUrl}${url}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Calculate average
   */
  private average(array: number[]): number {
    if (array.length === 0) return 0;
    return array.reduce((sum, val) => sum + val, 0) / array.length;
  }

  /**
   * Calculate percentile
   */
  private percentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;

    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) {
      return sortedArray[lower] ?? 0;
    }

    const lowerValue = sortedArray[lower] ?? 0;
    const upperValue = sortedArray[upper] ?? 0;
    return lowerValue * (1 - weight) + upperValue * weight;
  }

  /**
   * Print single result
   */
  private printResult(result: BenchmarkResult): void {
    console.log(`\n   📊 Results for ${result.name}:`);
    console.log(`      Success Rate: ${result.successRate.toFixed(1)}%`);
    console.log(`      Avg Duration: ${result.avgDuration.toFixed(2)}ms`);
    console.log(
      `      Min/Max: ${result.minDuration.toFixed(2)}ms / ${result.maxDuration.toFixed(2)}ms`
    );
    console.log(
      `      P50/P95/P99: ${result.p50Duration.toFixed(2)}ms / ${result.p95Duration.toFixed(2)}ms / ${result.p99Duration.toFixed(2)}ms`
    );
  }

  /**
   * Print summary
   */
  private printSummary(): void {
    console.log('\n📈 Performance Summary:');
    console.log('═'.repeat(60));

    // Sort by average duration
    const sorted = [...this.results].sort((a, b) => b.avgDuration - a.avgDuration);

    console.log('\nSlowest endpoints:');
    sorted.slice(0, 3).forEach((result, i) => {
      console.log(
        `  ${i + 1}. ${result.name}: ${result.avgDuration.toFixed(2)}ms (P95: ${result.p95Duration.toFixed(2)}ms)`
      );
    });

    console.log('\nFastest endpoints:');
    sorted
      .slice(-3)
      .reverse()
      .forEach((result, i) => {
        console.log(
          `  ${i + 1}. ${result.name}: ${result.avgDuration.toFixed(2)}ms (P95: ${result.p95Duration.toFixed(2)}ms)`
        );
      });

    // Overall statistics
    const totalAvg = this.average(this.results.map(r => r.avgDuration));
    const totalP95 = this.average(this.results.map(r => r.p95Duration));
    const totalSuccess = this.average(this.results.map(r => r.successRate));

    console.log('\nOverall:');
    console.log(`  Average response time: ${totalAvg.toFixed(2)}ms`);
    console.log(`  Average P95: ${totalP95.toFixed(2)}ms`);
    console.log(`  Average success rate: ${totalSuccess.toFixed(1)}%`);
  }

  /**
   * Save results to file
   */
  private async saveResults(): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsPath = path.join(process.cwd(), `performance-results-${timestamp}.json`);

    const output = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      results: this.results,
      summary: {
        totalTests: this.results.length,
        avgResponseTime: this.average(this.results.map(r => r.avgDuration)),
        avgP95: this.average(this.results.map(r => r.p95Duration)),
        avgSuccessRate: this.average(this.results.map(r => r.successRate)),
      },
    };

    fs.writeFileSync(resultsPath, JSON.stringify(output, null, 2));
    console.log(`\n💾 Results saved to: ${resultsPath}`);
  }

  /**
   * Save as baseline
   */
  private async saveBaseline(): Promise<void> {
    const baselinePath = path.join(process.cwd(), 'performance-baseline.json');
    fs.writeFileSync(baselinePath, JSON.stringify(this.results, null, 2));
    console.log(`📊 Baseline saved to: ${baselinePath}`);
  }
}

// Define benchmark configurations
const benchmarks: BenchmarkConfig[] = [
  {
    name: 'Landing Page',
    url: '/',
    warmupRuns: 2,
    testRuns: 5,
  },
  {
    name: 'Representative Profile',
    url: '/api/representative/T000480',
    warmupRuns: 3,
    testRuns: 10,
  },
  {
    name: 'Districts All (Heavy)',
    url: '/api/districts/all',
    warmupRuns: 2,
    testRuns: 5,
  },
  {
    name: 'Representative News',
    url: '/api/representative/T000480/news',
    warmupRuns: 2,
    testRuns: 8,
  },
  {
    name: 'Representative Votes',
    url: '/api/representative/T000480/votes',
    warmupRuns: 2,
    testRuns: 8,
  },
];

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const baseUrl = args[0] || 'http://localhost:3000';

  // Check if server is running
  try {
    const response = await fetch(baseUrl);
    if (!response.ok && response.status !== 404) {
      throw new Error(`Server returned ${response.status}`);
    }
  } catch (error) {
    console.error(`❌ Cannot connect to server at ${baseUrl}`);
    console.error('   Make sure the development server is running: npm run dev');
    process.exit(1);
  }

  const benchmark = new PerformanceBenchmark(baseUrl);

  // Run benchmarks
  await benchmark.runAll(benchmarks);

  // Compare with baseline
  await benchmark.compareWithBaseline();

  // Get metrics from collector if available
  if (process.env.PERF_LOGGING === 'true') {
    console.log('\n📊 Server-side metrics:');
    console.log(metricsCollector.generateReport());
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Benchmark failed:', error);
    process.exit(1);
  });
}

export { PerformanceBenchmark };
export type { BenchmarkConfig, BenchmarkResult };
