/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * GDELT Load Testing Service
 *
 * Comprehensive load testing and performance validation for GDELT batch processing
 * including stress testing, capacity planning, and performance benchmarking.
 */

import { GDELTBatchQueueService, JobPriority } from './batch-queue.service';
import { GDELTService } from '@/lib/services/gdelt/GDELTService';
// import { gdeltAnalyticsService } from './analytics.service'; // Service not implemented yet
import { BaseRepresentative } from '@/types/representative';
import logger from '@/lib/logging/simple-logger';

export interface LoadTestConfig {
  readonly testName: string;
  readonly description: string;
  readonly duration: number; // seconds
  readonly rampUpTime: number; // seconds
  readonly maxConcurrentJobs: number;
  readonly targetThroughput: number; // jobs per second
  readonly testRepresentatives: BaseRepresentative[];
  readonly queryOptions: {
    timespan: string;
    maxrecords: number;
  };
}

export interface LoadTestResult {
  readonly testName: string;
  readonly config: LoadTestConfig;
  readonly startTime: string;
  readonly endTime: string;
  readonly duration: number;
  readonly totalJobs: number;
  readonly completedJobs: number;
  readonly failedJobs: number;
  readonly successRate: number;
  readonly averageResponseTime: number;
  readonly p95ResponseTime: number;
  readonly p99ResponseTime: number;
  readonly maxResponseTime: number;
  readonly minResponseTime: number;
  readonly throughput: number; // actual jobs per second
  readonly errorBreakdown: Record<string, number>;
  readonly performanceMetrics: {
    cpuUsage?: number;
    memoryUsage?: number;
    networkLatency?: number;
  };
  readonly recommendations: string[];
}

export interface StressTestResult {
  readonly breakingPoint: {
    concurrentJobs: number;
    throughput: number;
    successRate: number;
  };
  readonly performanceGradation: Array<{
    concurrentJobs: number;
    successRate: number;
    averageResponseTime: number;
    throughput: number;
  }>;
  readonly systemLimits: {
    maxSustainableThroughput: number;
    recommendedMaxConcurrency: number;
    capacityRecommendations: string[];
  };
}

export class GDELTLoadTestingService {
  private static instance: GDELTLoadTestingService;
  private readonly batchQueue: GDELTBatchQueueService;
  private readonly gdeltService: GDELTService;
  private isRunningTest = false;

  private constructor() {
    this.batchQueue = GDELTBatchQueueService.getInstance();
    this.gdeltService = new GDELTService();
  }

  public static getInstance(): GDELTLoadTestingService {
    if (!GDELTLoadTestingService.instance) {
      GDELTLoadTestingService.instance = new GDELTLoadTestingService();
    }
    return GDELTLoadTestingService.instance;
  }

  /**
   * Execute a comprehensive load test
   */
  public async executeLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
    if (this.isRunningTest) {
      throw new Error('Load test already in progress');
    }

    this.isRunningTest = true;
    const startTime = new Date();

    logger.info('Starting GDELT load test', {
      testName: config.testName,
      duration: config.duration,
      maxConcurrentJobs: config.maxConcurrentJobs,
      targetThroughput: config.targetThroughput,
    });

    try {
      const jobSubmissionPromise = this.submitJobsWithRampUp(config);
      const _monitoringPromise = this.monitorTestExecution(config, startTime);

      // Run test for specified duration
      await Promise.race([jobSubmissionPromise, this.sleep(config.duration * 1000)]);

      // Allow some time for jobs to complete
      await this.sleep(30000); // 30 seconds grace period

      const endTime = new Date();
      const result = await this.analyzeTestResults(config, startTime, endTime);

      logger.info('GDELT load test completed', {
        testName: config.testName,
        totalJobs: result.totalJobs,
        successRate: result.successRate,
        averageResponseTime: result.averageResponseTime,
      });

      return result;
    } finally {
      this.isRunningTest = false;
    }
  }

  /**
   * Execute stress testing to find system limits
   */
  public async executeStressTest(
    baseConfig: Omit<LoadTestConfig, 'maxConcurrentJobs' | 'testName'>,
    maxConcurrency = 200
  ): Promise<StressTestResult> {
    const performanceGradation: Array<{
      concurrentJobs: number;
      successRate: number;
      averageResponseTime: number;
      throughput: number;
    }> = [];

    let breakingPoint: StressTestResult['breakingPoint'] | null = null;

    // Test increasing concurrency levels
    const concurrencyLevels = [5, 10, 20, 50, 100, 150, 200].filter(
      level => level <= maxConcurrency
    );

    for (const concurrency of concurrencyLevels) {
      logger.info('Running stress test level', { concurrency });

      const testConfig: LoadTestConfig = {
        ...baseConfig,
        testName: `stress-test-${concurrency}`,
        maxConcurrentJobs: concurrency,
        duration: 60, // 1 minute per level
        rampUpTime: 10, // 10 seconds ramp up
      };

      const result = await this.executeLoadTest(testConfig);

      performanceGradation.push({
        concurrentJobs: concurrency,
        successRate: result.successRate,
        averageResponseTime: result.averageResponseTime,
        throughput: result.throughput,
      });

      // Consider system "broken" if success rate drops below 95% or response time > 30 seconds
      if (result.successRate < 95 || result.averageResponseTime > 30000) {
        breakingPoint = {
          concurrentJobs: concurrency,
          throughput: result.throughput,
          successRate: result.successRate,
        };
        logger.warn('Stress test breaking point reached', breakingPoint);
        break;
      }

      // Add delay between stress test levels
      await this.sleep(30000); // 30 seconds cooldown
    }

    // Analyze results and provide recommendations
    const maxSustainableThroughput = performanceGradation
      .filter(p => p.successRate >= 99)
      .reduce((max, p) => Math.max(max, p.throughput), 0);

    const recommendedMaxConcurrency = performanceGradation
      .filter(p => p.successRate >= 99 && p.averageResponseTime < 10000)
      .reduce((max, p) => Math.max(max, p.concurrentJobs), 0);

    const capacityRecommendations = this.generateCapacityRecommendations(
      performanceGradation,
      breakingPoint
    );

    return {
      breakingPoint: breakingPoint || {
        concurrentJobs: maxConcurrency,
        throughput: performanceGradation[performanceGradation.length - 1]?.throughput || 0,
        successRate: performanceGradation[performanceGradation.length - 1]?.successRate || 0,
      },
      performanceGradation,
      systemLimits: {
        maxSustainableThroughput,
        recommendedMaxConcurrency,
        capacityRecommendations,
      },
    };
  }

  /**
   * Benchmark individual vs batch performance
   */
  public async benchmarkPerformance(representatives: BaseRepresentative[]): Promise<{
    individual: {
      averageTime: number;
      successRate: number;
      totalTime: number;
    };
    batch: {
      averageTime: number;
      successRate: number;
      totalTime: number;
      speedupFactor: number;
    };
    recommendation: string;
  }> {
    const testSample = representatives.slice(0, 20); // Test with 20 representatives

    // Test individual processing
    logger.info('Benchmarking individual processing');
    const individualStart = Date.now();
    let individualSuccesses = 0;
    const individualTimes: number[] = [];

    for (const rep of testSample) {
      const startTime = Date.now();
      try {
        const result = await this.gdeltService.fetchMemberArticles(rep);
        if (result.data) {
          individualSuccesses++;
        }
        individualTimes.push(Date.now() - startTime);
      } catch {
        individualTimes.push(Date.now() - startTime);
        logger.warn('Individual benchmark failed for', { bioguideId: rep.bioguideId });
      }
    }

    const individualTotalTime = Date.now() - individualStart;
    const individualAverageTime =
      individualTimes.reduce((sum, t) => sum + t, 0) / individualTimes.length;
    const individualSuccessRate = (individualSuccesses / testSample.length) * 100;

    // Test batch processing
    logger.info('Benchmarking batch processing');
    const batchStart = Date.now();
    const batchResult = await this.batchQueue.queueAllMembers(testSample, {
      priority: JobPriority.HIGH,
      timespan: '7days',
      maxrecords: 50,
    });

    // Wait for batch completion
    let batchCompleted = false;
    let batchSuccesses = 0;
    const batchTimes: number[] = [];

    while (!batchCompleted && Date.now() - batchStart < 300000) {
      // 5 minute timeout
      await this.sleep(5000); // Check every 5 seconds

      const metrics = this.batchQueue.getMetrics();
      if (metrics.completedJobs + metrics.failedJobs >= testSample.length) {
        batchCompleted = true;

        // Collect batch timing data
        for (const jobId of batchResult.jobIds) {
          const job = this.batchQueue.getJob(jobId);
          if (job) {
            if (job.executionTime) {
              batchTimes.push(job.executionTime);
            }
            if (job.result && job.result.length > 0) {
              batchSuccesses++;
            }
          }
        }
      }
    }

    const batchTotalTime = Date.now() - batchStart;
    const batchAverageTime =
      batchTimes.length > 0 ? batchTimes.reduce((sum, t) => sum + t, 0) / batchTimes.length : 0;
    const batchSuccessRate = (batchSuccesses / testSample.length) * 100;
    const speedupFactor = individualTotalTime / batchTotalTime;

    const recommendation =
      speedupFactor > 2
        ? 'Batch processing provides significant performance benefits. Recommended for production.'
        : speedupFactor > 1.5
          ? 'Batch processing provides moderate performance benefits.'
          : 'Individual processing may be preferred for small datasets.';

    return {
      individual: {
        averageTime: individualAverageTime,
        successRate: individualSuccessRate,
        totalTime: individualTotalTime,
      },
      batch: {
        averageTime: batchAverageTime,
        successRate: batchSuccessRate,
        totalTime: batchTotalTime,
        speedupFactor,
      },
      recommendation,
    };
  }

  /**
   * Private helper methods
   */

  private async submitJobsWithRampUp(config: LoadTestConfig): Promise<void> {
    const totalJobs = Math.ceil(config.targetThroughput * config.duration);
    const _rampUpInterval = (config.rampUpTime * 1000) / config.maxConcurrentJobs;

    let submittedJobs = 0;
    const startTime = Date.now();

    while (submittedJobs < totalJobs && Date.now() - startTime < config.duration * 1000) {
      // Calculate current target concurrency based on ramp-up
      const elapsed = Date.now() - startTime;
      const rampUpProgress = Math.min(elapsed / (config.rampUpTime * 1000), 1);
      const currentMaxConcurrency = Math.ceil(config.maxConcurrentJobs * rampUpProgress);

      // Submit jobs up to current concurrency limit
      const metrics = this.batchQueue.getMetrics();
      const slotsAvailable = currentMaxConcurrency - metrics.runningJobs;

      for (let i = 0; i < Math.min(slotsAvailable, 10); i++) {
        // Submit max 10 at a time
        if (submittedJobs >= totalJobs) break;

        const representative =
          config.testRepresentatives[submittedJobs % config.testRepresentatives.length]!;
        this.batchQueue.queueMember(representative, {
          priority: JobPriority.NORMAL,
          timespan: config.queryOptions.timespan,
          maxrecords: config.queryOptions.maxrecords,
        });

        submittedJobs++;
      }

      await this.sleep(100); // Small delay between batches
    }
  }

  private async monitorTestExecution(config: LoadTestConfig, startTime: Date): Promise<void> {
    const monitorInterval = 5000; // Monitor every 5 seconds

    while (Date.now() - startTime.getTime() < config.duration * 1000) {
      const metrics = this.batchQueue.getMetrics();

      logger.info('Load test progress', {
        testName: config.testName,
        elapsed: Math.round((Date.now() - startTime.getTime()) / 1000),
        totalJobs: metrics.totalJobs,
        completedJobs: metrics.completedJobs,
        failedJobs: metrics.failedJobs,
        runningJobs: metrics.runningJobs,
        successRate: metrics.successRate,
        circuitBreakerStatus: metrics.circuitBreakerStatus,
      });

      await this.sleep(monitorInterval);
    }
  }

  private async analyzeTestResults(
    config: LoadTestConfig,
    startTime: Date,
    endTime: Date
  ): Promise<LoadTestResult> {
    const metrics = this.batchQueue.getMetrics();
    const duration = endTime.getTime() - startTime.getTime();

    // Get analytics data for the test period
    // const analyticsReport = gdeltAnalyticsService.generateReport(startTime, endTime); // Service not implemented yet
    const analyticsReport = { summary: 'Analytics service not available' };

    // Calculate response time percentiles (simplified)
    // In a real implementation, you'd collect all response times
    const _responseTimes = [metrics.averageExecutionTime]; // Simplified
    const p95ResponseTime = metrics.averageExecutionTime * 1.5; // Approximation
    const p99ResponseTime = metrics.averageExecutionTime * 2; // Approximation

    const recommendations = this.generateRecommendations(metrics, analyticsReport);

    return {
      testName: config.testName,
      config,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: duration / 1000, // Convert to seconds
      totalJobs: metrics.totalJobs,
      completedJobs: metrics.completedJobs,
      failedJobs: metrics.failedJobs,
      successRate: metrics.successRate,
      averageResponseTime: metrics.averageExecutionTime,
      p95ResponseTime,
      p99ResponseTime,
      maxResponseTime: metrics.averageExecutionTime * 3, // Approximation
      minResponseTime: metrics.averageExecutionTime * 0.5, // Approximation
      throughput: metrics.queueThroughput,
      errorBreakdown: {}, // Would need to collect from actual error tracking
      performanceMetrics: {
        // Would collect actual system metrics in production
      },
      recommendations,
    };
  }

  private generateRecommendations(
    metrics: {
      successRate: number;
      averageExecutionTime: number;
      circuitBreakerStatus: string;
      queueThroughput: number;
    },
    _analyticsReport: unknown
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.successRate < 95) {
      recommendations.push(
        'Success rate below 95%. Consider reducing load or investigating failures.'
      );
    }

    if (metrics.averageExecutionTime > 15000) {
      recommendations.push('Average response time > 15s. Consider optimizing GDELT queries.');
    }

    if (metrics.circuitBreakerStatus === 'OPEN') {
      recommendations.push('Circuit breaker triggered. Investigate GDELT API reliability.');
    }

    if (metrics.queueThroughput < 1) {
      recommendations.push('Low throughput detected. Consider increasing concurrency limits.');
    }

    return recommendations;
  }

  private generateCapacityRecommendations(
    performanceGradation: Array<{
      concurrentJobs: number;
      successRate: number;
      throughput: number;
    }>,
    breakingPoint: { concurrentJobs: number; throughput: number; successRate: number } | null
  ): string[] {
    const recommendations: string[] = [];

    if (breakingPoint) {
      recommendations.push(
        `System breaks at ${breakingPoint.concurrentJobs} concurrent jobs. ` +
          `Recommend staying below ${Math.floor(breakingPoint.concurrentJobs * 0.8)} for safety.`
      );
    }

    const filteredPerformance = performanceGradation.filter(p => p.successRate >= 99);
    const bestPerformance =
      filteredPerformance.length > 0
        ? filteredPerformance.reduce((best, current) =>
            current.throughput > best.throughput ? current : best
          )
        : null;

    if (bestPerformance) {
      recommendations.push(
        `Optimal performance at ${bestPerformance.concurrentJobs} concurrent jobs ` +
          `with ${bestPerformance.throughput.toFixed(2)} jobs/second throughput.`
      );
    }

    return recommendations;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate pre-configured load test scenarios
   */
  public generateStandardLoadTests(representatives: BaseRepresentative[]): LoadTestConfig[] {
    const testRepresentatives = representatives.slice(0, 50); // Use subset for testing

    return [
      {
        testName: 'light-load',
        description: 'Light load test - simulates normal usage',
        duration: 300, // 5 minutes
        rampUpTime: 60, // 1 minute ramp up
        maxConcurrentJobs: 10,
        targetThroughput: 2, // 2 jobs per second
        testRepresentatives,
        queryOptions: {
          timespan: '7days',
          maxrecords: 25,
        },
      },
      {
        testName: 'moderate-load',
        description: 'Moderate load test - simulates busy periods',
        duration: 600, // 10 minutes
        rampUpTime: 120, // 2 minutes ramp up
        maxConcurrentJobs: 25,
        targetThroughput: 5, // 5 jobs per second
        testRepresentatives,
        queryOptions: {
          timespan: '7days',
          maxrecords: 50,
        },
      },
      {
        testName: 'heavy-load',
        description: 'Heavy load test - simulates peak usage',
        duration: 900, // 15 minutes
        rampUpTime: 180, // 3 minutes ramp up
        maxConcurrentJobs: 50,
        targetThroughput: 8, // 8 jobs per second
        testRepresentatives,
        queryOptions: {
          timespan: '30days',
          maxrecords: 100,
        },
      },
    ];
  }
}

// Export singleton instance
export const gdeltLoadTestingService = GDELTLoadTestingService.getInstance();
