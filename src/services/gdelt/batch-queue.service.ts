/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * GDELT Batch Queue Service - Production-Ready Batch Processing
 *
 * Implements enterprise-scale batch processing for all 535 members with:
 * - Background job queues with priority
 * - Exponential backoff with jitter
 * - Circuit breaker pattern
 * - Comprehensive monitoring
 * - Systematic error recovery
 * - Rate limiting and throttling
 */

import { GDELTService } from '@/lib/services/gdelt/GDELTService';
import { GDELTArticle, GDELTError, GDELTErrorType } from '@/types/gdelt';
import { BaseRepresentative } from '@/types/representative';
import logger from '@/lib/logging/simple-logger';

export enum JobPriority {
  HIGH = 1,
  NORMAL = 2,
  LOW = 3,
}

export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
  CANCELLED = 'cancelled',
}

export interface BatchJob {
  readonly id: string;
  readonly bioguideId: string;
  readonly member: BaseRepresentative;
  readonly priority: JobPriority;
  readonly timespan?: string;
  readonly maxrecords?: number;
  readonly createdAt: string;
  readonly scheduledAt?: string;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: string;
  nextRetryAt?: string;
  completedAt?: string;
  error?: GDELTError;
  result?: GDELTArticle[];
  executionTime?: number;
}

export interface CircuitBreakerConfig {
  readonly failureThreshold: number;
  readonly resetTimeoutMs: number;
  readonly monitoringPeriodMs: number;
}

export interface BatchMetrics {
  readonly totalJobs: number;
  readonly pendingJobs: number;
  readonly runningJobs: number;
  readonly completedJobs: number;
  readonly failedJobs: number;
  readonly successRate: number;
  readonly averageExecutionTime: number;
  readonly queueThroughput: number; // jobs per minute
  readonly circuitBreakerStatus: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

export interface RetryConfig {
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly multiplier: number;
  readonly jitterMax: number;
}

class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        logger.info('Circuit breaker transitioning to HALF_OPEN state');
      } else {
        throw new Error('Circuit breaker is OPEN - rejecting requests');
      }
    }

    try {
      const result = await operation();

      if (this.state === 'HALF_OPEN') {
        this.reset();
        logger.info('Circuit breaker reset to CLOSED state after successful operation');
      }

      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN';
      logger.warn('Circuit breaker opened due to failure threshold', {
        failures: this.failures,
        threshold: this.config.failureThreshold,
      });
    }
  }

  private reset(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  getStatus(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    return this.state;
  }
}

export class GDELTBatchQueueService {
  private static instance: GDELTBatchQueueService;
  private readonly gdeltService: GDELTService;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly jobs = new Map<string, BatchJob>();
  private readonly pendingQueue: BatchJob[] = [];
  private readonly runningJobs = new Set<string>();
  private isProcessing = false;

  // Configuration
  private readonly maxConcurrentJobs = 5;
  private readonly batchProcessingIntervalMs = 2000;
  private readonly retryConfig: RetryConfig = {
    baseDelayMs: 1000,
    maxDelayMs: 60000,
    multiplier: 2,
    jitterMax: 1000,
  };

  // Metrics tracking
  private metricsStartTime = Date.now();
  private totalCompletedJobs = 0;
  private totalExecutionTime = 0;

  private constructor() {
    this.gdeltService = new GDELTService({
      timeout: 30000,
      retryAttempts: 1, // Circuit breaker handles retries
      retryDelayMs: 1000,
    });

    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeoutMs: 60000, // 1 minute
      monitoringPeriodMs: 300000, // 5 minutes
    });

    this.startBatchProcessor();
  }

  public static getInstance(): GDELTBatchQueueService {
    if (!GDELTBatchQueueService.instance) {
      GDELTBatchQueueService.instance = new GDELTBatchQueueService();
    }
    return GDELTBatchQueueService.instance;
  }

  /**
   * Queue a single member for GDELT news processing
   */
  public queueMember(
    member: BaseRepresentative,
    options: {
      priority?: JobPriority;
      timespan?: string;
      maxrecords?: number;
      scheduledAt?: Date;
    } = {}
  ): string {
    const jobId = this.generateJobId(member.bioguideId);

    const job: BatchJob = {
      id: jobId,
      bioguideId: member.bioguideId,
      member,
      priority: options.priority ?? JobPriority.NORMAL,
      timespan: options.timespan ?? '7days',
      maxrecords: options.maxrecords ?? 50,
      createdAt: new Date().toISOString(),
      scheduledAt: options.scheduledAt?.toISOString(),
      status: JobStatus.PENDING,
      attempts: 0,
      maxAttempts: 3,
    };

    this.jobs.set(jobId, job);
    this.pendingQueue.push(job);
    this.sortPendingQueue();

    logger.info('Job queued for GDELT processing', {
      jobId,
      bioguideId: member.bioguideId,
      name: `${member.firstName} ${member.lastName}`,
      priority: job.priority,
      queueLength: this.pendingQueue.length,
    });

    return jobId;
  }

  /**
   * Queue all 535 members for batch processing
   */
  public async queueAllMembers(
    members: BaseRepresentative[],
    options: {
      priority?: JobPriority;
      timespan?: string;
      maxrecords?: number;
      batchSize?: number;
    } = {}
  ): Promise<{ jobIds: string[]; estimatedCompletion: string }> {
    const batchSize = options.batchSize ?? 50;
    const jobIds: string[] = [];

    // Process in smaller batches to avoid overwhelming the queue
    for (let i = 0; i < members.length; i += batchSize) {
      const batch = members.slice(i, i + batchSize);

      for (const member of batch) {
        const jobId = this.queueMember(member, {
          priority: options.priority ?? JobPriority.LOW, // Batch jobs get lower priority
          timespan: options.timespan,
          maxrecords: options.maxrecords,
        });
        jobIds.push(jobId);
      }

      // Small delay between batches to allow queue processing
      if (i + batchSize < members.length) {
        await this.sleep(100);
      }
    }

    // Estimate completion time based on current processing rate
    const estimatedDurationMs = this.estimateProcessingTime(jobIds.length);
    const estimatedCompletion = new Date(Date.now() + estimatedDurationMs).toISOString();

    logger.info('Batch job queued for all members', {
      totalMembers: members.length,
      jobIds: jobIds.length,
      estimatedCompletion,
      queueLength: this.pendingQueue.length,
    });

    return { jobIds, estimatedCompletion };
  }

  /**
   * Get job status and result
   */
  public getJob(jobId: string): BatchJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get batch processing metrics
   */
  public getMetrics(): BatchMetrics {
    const totalJobs = this.jobs.size;
    const pendingJobs = this.pendingQueue.length;
    const runningJobs = this.runningJobs.size;
    const completedJobs = Array.from(this.jobs.values()).filter(
      job => job.status === JobStatus.COMPLETED
    ).length;
    const failedJobs = Array.from(this.jobs.values()).filter(
      job => job.status === JobStatus.FAILED
    ).length;

    const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;
    const averageExecutionTime =
      this.totalCompletedJobs > 0 ? this.totalExecutionTime / this.totalCompletedJobs : 0;

    const elapsedMinutes = (Date.now() - this.metricsStartTime) / 60000;
    const queueThroughput = elapsedMinutes > 0 ? this.totalCompletedJobs / elapsedMinutes : 0;

    return {
      totalJobs,
      pendingJobs,
      runningJobs,
      completedJobs,
      failedJobs,
      successRate,
      averageExecutionTime,
      queueThroughput,
      circuitBreakerStatus: this.circuitBreaker.getStatus(),
    };
  }

  /**
   * Cancel a specific job
   */
  public cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED) {
      return false;
    }

    job.status = JobStatus.CANCELLED;

    // Remove from pending queue if it's there
    const queueIndex = this.pendingQueue.findIndex(j => j.id === jobId);
    if (queueIndex >= 0) {
      this.pendingQueue.splice(queueIndex, 1);
    }

    logger.info('Job cancelled', { jobId, bioguideId: job.bioguideId });
    return true;
  }

  /**
   * Start the background batch processor
   */
  private startBatchProcessor(): void {
    if (this.isProcessing) return;

    this.isProcessing = true;

    const processNextBatch = async () => {
      try {
        await this.processBatch();
      } catch (error) {
        logger.error('Batch processor error', error as Error);
      } finally {
        if (this.isProcessing) {
          setTimeout(processNextBatch, this.batchProcessingIntervalMs);
        }
      }
    };

    processNextBatch();
    logger.info('GDELT batch processor started');
  }

  /**
   * Process the next batch of jobs
   */
  private async processBatch(): Promise<void> {
    // Don't process if circuit breaker is open
    if (this.circuitBreaker.getStatus() === 'OPEN') {
      return;
    }

    // Process scheduled jobs that are ready
    const readyJobs = this.pendingQueue.filter(job => {
      if (job.scheduledAt) {
        return new Date(job.scheduledAt) <= new Date();
      }
      return true;
    });

    // Get available job slots
    const availableSlots = this.maxConcurrentJobs - this.runningJobs.size;
    if (availableSlots <= 0 || readyJobs.length === 0) {
      return;
    }

    // Take jobs up to available slots
    const jobsToProcess = readyJobs.slice(0, availableSlots);

    for (const job of jobsToProcess) {
      this.processJob(job);
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: BatchJob): Promise<void> {
    // Remove from pending queue and mark as running
    const queueIndex = this.pendingQueue.findIndex(j => j.id === job.id);
    if (queueIndex >= 0) {
      this.pendingQueue.splice(queueIndex, 1);
    }

    job.status = JobStatus.RUNNING;
    job.attempts++;
    job.lastAttemptAt = new Date().toISOString();
    this.runningJobs.add(job.id);

    const startTime = Date.now();

    try {
      logger.info('Processing GDELT job', {
        jobId: job.id,
        bioguideId: job.bioguideId,
        attempt: job.attempts,
        maxAttempts: job.maxAttempts,
      });

      // Execute with circuit breaker protection
      const result = await this.circuitBreaker.execute(async () => {
        return await this.gdeltService.fetchMemberArticles(job.member, {
          timespan: job.timespan,
          maxrecords: job.maxrecords,
        });
      });

      const executionTime = Date.now() - startTime;
      job.executionTime = executionTime;

      if (result.data) {
        // Success
        job.status = JobStatus.COMPLETED;
        job.result = result.data;
        job.completedAt = new Date().toISOString();

        this.totalCompletedJobs++;
        this.totalExecutionTime += executionTime;

        logger.info('GDELT job completed successfully', {
          jobId: job.id,
          bioguideId: job.bioguideId,
          articlesFound: result.data.length,
          executionTime,
        });
      } else {
        // GDELT API returned error
        throw new Error(result.error?.message || 'GDELT API error');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      job.error = {
        type: GDELTErrorType.NETWORK_ERROR,
        message: errorMsg,
        timestamp: new Date().toISOString(),
      };

      if (job.attempts < job.maxAttempts && !errorMsg.includes('Circuit breaker')) {
        // Schedule retry with exponential backoff
        job.status = JobStatus.RETRYING;
        const retryDelay = this.calculateRetryDelay(job.attempts);
        job.nextRetryAt = new Date(Date.now() + retryDelay).toISOString();

        // Re-queue for retry
        setTimeout(() => {
          this.pendingQueue.push(job);
          this.sortPendingQueue();
        }, retryDelay);

        logger.warn('GDELT job failed, scheduling retry', {
          jobId: job.id,
          bioguideId: job.bioguideId,
          attempt: job.attempts,
          maxAttempts: job.maxAttempts,
          retryDelay,
          error: errorMsg,
        });
      } else {
        // Max attempts reached or permanent failure
        job.status = JobStatus.FAILED;
        job.completedAt = new Date().toISOString();

        logger.error('GDELT job failed permanently', {
          jobId: job.id,
          bioguideId: job.bioguideId,
          attempts: job.attempts,
          error: errorMsg,
        });
      }
    } finally {
      this.runningJobs.delete(job.id);
    }
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateRetryDelay(attempt: number): number {
    const exponentialDelay = Math.min(
      this.retryConfig.baseDelayMs * Math.pow(this.retryConfig.multiplier, attempt - 1),
      this.retryConfig.maxDelayMs
    );

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * this.retryConfig.jitterMax;
    return exponentialDelay + jitter;
  }

  /**
   * Sort pending queue by priority and creation time
   */
  private sortPendingQueue(): void {
    this.pendingQueue.sort((a, b) => {
      // First by priority (lower number = higher priority)
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      // Then by creation time (older first)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  /**
   * Estimate processing time for a number of jobs
   */
  private estimateProcessingTime(jobCount: number): number {
    const averageJobTime =
      this.totalCompletedJobs > 0 ? this.totalExecutionTime / this.totalCompletedJobs : 5000; // Default 5 seconds per job

    const concurrentProcessingTime = (jobCount / this.maxConcurrentJobs) * averageJobTime;
    const rateLimitingDelay = (jobCount / this.maxConcurrentJobs) * this.batchProcessingIntervalMs;

    return concurrentProcessingTime + rateLimitingDelay;
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(bioguideId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `gdelt-${bioguideId}-${timestamp}-${random}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Stop the batch processor
   */
  public stop(): void {
    this.isProcessing = false;
    logger.info('GDELT batch processor stopped');
  }

  /**
   * Clean up completed and failed jobs older than specified time
   */
  public cleanup(olderThanHours = 24): number {
    const cutoffTime = Date.now() - olderThanHours * 60 * 60 * 1000;
    let cleanedCount = 0;

    for (const [jobId, job] of this.jobs.entries()) {
      if (
        (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED) &&
        job.completedAt &&
        new Date(job.completedAt).getTime() < cutoffTime
      ) {
        this.jobs.delete(jobId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Cleaned up old GDELT batch jobs', { cleanedCount, olderThanHours });
    }

    return cleanedCount;
  }
}

// Export singleton instance
export const gdeltBatchQueueService = GDELTBatchQueueService.getInstance();
