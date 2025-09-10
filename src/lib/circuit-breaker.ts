/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by failing fast when external services are down
 */

import logger from '@/lib/logging/simple-logger';

export enum CircuitBreakerState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing fast
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

export interface CircuitBreakerOptions {
  failureThreshold: number; // Number of failures before opening
  recoveryTimeout: number; // Time to wait before trying again (ms)
  monitoringWindow: number; // Time window for tracking failures (ms)
  successThreshold: number; // Successes needed to close from half-open
  name: string; // Circuit breaker identifier
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private failures: number[] = []; // Timestamps of failures for window tracking

  constructor(private options: CircuitBreakerOptions) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if we should fail fast
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.successCount = 0;
        logger.info(`Circuit breaker ${this.options.name} moving to HALF_OPEN state`);
      } else {
        throw new Error(`Circuit breaker ${this.options.name} is OPEN - failing fast`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.options.successThreshold) {
        this.state = CircuitBreakerState.CLOSED;
        this.successCount = 0;
        this.failures = [];
        logger.info(`Circuit breaker ${this.options.name} recovered - moving to CLOSED state`);
      }
    }
  }

  private onFailure(): void {
    const now = Date.now();
    this.failureCount++;
    this.lastFailureTime = now;
    this.failures.push(now);

    // Clean old failures outside the monitoring window
    this.failures = this.failures.filter(
      timestamp => now - timestamp < this.options.monitoringWindow
    );

    // Check if we should open the circuit
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.OPEN;
      logger.warn(
        `Circuit breaker ${this.options.name} failed in HALF_OPEN - moving to OPEN state`
      );
    } else if (this.failures.length >= this.options.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
      logger.warn(
        `Circuit breaker ${this.options.name} opened due to ${this.failures.length} failures in monitoring window`
      );
    }
  }

  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.options.recoveryTimeout;
  }

  // Public methods for monitoring
  getState(): CircuitBreakerState {
    return this.state;
  }

  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      recentFailures: this.failures.length,
      lastFailureTime: this.lastFailureTime,
      name: this.options.name,
    };
  }

  // Force state changes for testing or manual intervention
  forceOpen(): void {
    this.state = CircuitBreakerState.OPEN;
    logger.warn(`Circuit breaker ${this.options.name} manually opened`);
  }

  forceClose(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.failures = [];
    logger.info(`Circuit breaker ${this.options.name} manually closed`);
  }
}

// Pre-configured circuit breakers for common external services
export const circuitBreakers = {
  congress: new CircuitBreaker({
    name: 'Congress.gov API',
    failureThreshold: 5,
    recoveryTimeout: 30000, // 30 seconds
    monitoringWindow: 120000, // 2 minutes
    successThreshold: 3,
  }),

  fec: new CircuitBreaker({
    name: 'FEC API',
    failureThreshold: 3,
    recoveryTimeout: 60000, // 1 minute
    monitoringWindow: 180000, // 3 minutes
    successThreshold: 2,
  }),

  senate: new CircuitBreaker({
    name: 'Senate XML Feed',
    failureThreshold: 3,
    recoveryTimeout: 45000, // 45 seconds
    monitoringWindow: 300000, // 5 minutes
    successThreshold: 2,
  }),

  census: new CircuitBreaker({
    name: 'Census API',
    failureThreshold: 4,
    recoveryTimeout: 30000, // 30 seconds
    monitoringWindow: 180000, // 3 minutes
    successThreshold: 2,
  }),

  gdelt: new CircuitBreaker({
    name: 'GDELT News API',
    failureThreshold: 5,
    recoveryTimeout: 60000, // 1 minute
    monitoringWindow: 300000, // 5 minutes
    successThreshold: 3,
  }),
};

// Utility function to get all circuit breaker stats
export function getAllCircuitBreakerStats() {
  return Object.values(circuitBreakers).map(cb => cb.getStats());
}
