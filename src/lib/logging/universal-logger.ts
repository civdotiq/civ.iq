/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Universal logger that automatically selects the appropriate logger
 * based on the runtime environment (server, edge, or client)
 */

// Type definitions for consistency across all loggers
export interface LogMetadata {
  requestId?: string;
  userId?: string;
  bioguideId?: string;
  endpoint?: string;
  duration?: number;
  error?: string;
  component?: string;
  action?: string;
  [key: string]: unknown;
}

export interface Logger {
  error(message: string, error?: Error | unknown, metadata?: LogMetadata): void;
  warn(message: string, metadata?: LogMetadata): void;
  info(message: string, metadata?: LogMetadata): void;
  debug(message: string, metadata?: LogMetadata): void;
  http?(message: string, metadata?: LogMetadata): void;
}

// Environment detection
function getEnvironment(): 'server' | 'edge' | 'client' {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    return 'client';
  }

  // Check if we're in Edge Runtime
  // EdgeRuntime is a global in Vercel Edge Runtime
  if (
    (typeof globalThis !== 'undefined' && 'EdgeRuntime' in globalThis) ||
    process.env.NEXT_RUNTIME === 'edge'
  ) {
    return 'edge';
  }

  // Default to server
  return 'server';
}

// Lazy loading of loggers to avoid importing unnecessary code
let cachedLogger: Logger | null = null;

async function getLogger(): Promise<Logger> {
  if (cachedLogger) {
    return cachedLogger;
  }

  const env = getEnvironment();

  switch (env) {
    case 'client': {
      const { structuredLogger } = await import('./logger-client');
      cachedLogger = structuredLogger;
      return structuredLogger;
    }

    case 'edge': {
      const { structuredLogger } = await import('./logger-edge');
      cachedLogger = structuredLogger;
      return structuredLogger;
    }

    case 'server':
    default: {
      const { structuredLogger } = await import('./logger');
      cachedLogger = structuredLogger;
      return structuredLogger;
    }
  }
}

// Synchronous fallback logger for immediate use
const fallbackLogger: Logger = {
  error: (message: string, error?: Error | unknown, metadata?: LogMetadata) => {
    // eslint-disable-next-line no-console
    console.error(`[FALLBACK] ${message}`, error, metadata);
  },
  warn: (message: string, metadata?: LogMetadata) => {
    // eslint-disable-next-line no-console
    console.warn(`[FALLBACK] ${message}`, metadata);
  },
  info: (message: string, metadata?: LogMetadata) => {
    // eslint-disable-next-line no-console
    console.info(`[FALLBACK] ${message}`, metadata);
  },
  debug: (message: string, metadata?: LogMetadata) => {
    // eslint-disable-next-line no-console
    console.debug(`[FALLBACK] ${message}`, metadata);
  },
  http: (message: string, metadata?: LogMetadata) => {
    // eslint-disable-next-line no-console
    console.log(`[FALLBACK] ${message}`, metadata);
  },
};

// Create a proxy logger that delegates to the appropriate implementation
class UniversalLogger implements Logger {
  private loggerPromise: Promise<Logger>;
  private resolvedLogger: Logger | null = null;

  constructor() {
    this.loggerPromise = getLogger().then(logger => {
      this.resolvedLogger = logger;
      return logger;
    });
  }

  private async log(method: keyof Logger, args: unknown[]): Promise<void> {
    if (this.resolvedLogger) {
      const fn = this.resolvedLogger[method] as (...args: unknown[]) => void;
      fn(...args);
    } else {
      // Use fallback logger while loading
      const fallbackFn = fallbackLogger[method] as (...args: unknown[]) => void;
      fallbackFn(...args);

      // Also queue the log for the real logger
      this.loggerPromise.then(logger => {
        const loggerFn = logger[method] as (...args: unknown[]) => void;
        loggerFn(...args);
      });
    }
  }

  error(message: string, error?: Error | unknown, metadata?: LogMetadata): void {
    this.log('error', [message, error, metadata]);
  }

  warn(message: string, metadata?: LogMetadata): void {
    this.log('warn', [message, metadata]);
  }

  info(message: string, metadata?: LogMetadata): void {
    this.log('info', [message, metadata]);
  }

  debug(message: string, metadata?: LogMetadata): void {
    this.log('debug', [message, metadata]);
  }

  http(message: string, metadata?: LogMetadata): void {
    if (this.resolvedLogger && 'http' in this.resolvedLogger) {
      this.log('http', [message, metadata]);
    } else {
      this.log('info', [message, metadata]);
    }
  }
}

// Export singleton instance
export const structuredLogger = new UniversalLogger();

// Export convenience methods
export const logger = {
  error: structuredLogger.error.bind(structuredLogger),
  warn: structuredLogger.warn.bind(structuredLogger),
  info: structuredLogger.info.bind(structuredLogger),
  debug: structuredLogger.debug.bind(structuredLogger),
  http: structuredLogger.http.bind(structuredLogger),
};

// Re-export useful utilities based on environment
export { createTimer } from './logger-client';

// Export for direct import if needed
export default structuredLogger;
