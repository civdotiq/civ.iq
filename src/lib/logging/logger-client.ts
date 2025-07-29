/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Client-side compatible logger
 * Uses only browser-safe console methods
 * Provides same interface as server logger for consistency
 */

// Log levels
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

// Interface for structured log metadata
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

class ClientLogger {
  private logLevel: LogLevel;
  private isDevelopment: boolean;

  constructor(level?: LogLevel) {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.logLevel = level ?? (this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN);
  }

  private formatMessage(level: string, message: string, metadata?: LogMetadata): string {
    if (this.isDevelopment) {
      // Development: Human-readable format
      const timestamp = new Date().toISOString();
      const metaStr = metadata ? ` | ${JSON.stringify(metadata)}` : '';
      return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
    } else {
      // Production: Structured format for monitoring
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        environment: 'browser',
        ...metadata,
      };
      return JSON.stringify(logEntry);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return this.logLevel >= level;
  }

  error(message: string, error?: Error | unknown, metadata?: LogMetadata): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const errorMeta: LogMetadata = { ...metadata };

    if (error instanceof Error) {
      errorMeta.error = error.message;
      errorMeta.stack = error.stack;
    } else if (error) {
      errorMeta.error = String(error);
    }

    const formattedMessage = this.formatMessage('error', message, errorMeta);

    if (this.isDevelopment) {
      // eslint-disable-next-line no-console
      console.error(formattedMessage);
      if (error instanceof Error && error.stack) {
        // eslint-disable-next-line no-console
        console.error('Stack trace:', error.stack);
      }
    } else {
      // eslint-disable-next-line no-console
      console.error(formattedMessage);
    }
  }

  warn(message: string, metadata?: LogMetadata): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    // eslint-disable-next-line no-console
    console.warn(this.formatMessage('warn', message, metadata));
  }

  info(message: string, metadata?: LogMetadata): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    // eslint-disable-next-line no-console
    console.info(this.formatMessage('info', message, metadata));
  }

  debug(message: string, metadata?: LogMetadata): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    if (this.isDevelopment) {
      // eslint-disable-next-line no-console
      console.debug(this.formatMessage('debug', message, metadata));
    } else {
      // In production, debug logs are silenced
      return;
    }
  }

  // Helper method for HTTP/API calls
  http(message: string, metadata?: LogMetadata): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    // eslint-disable-next-line no-console
    console.log(this.formatMessage('http', message, metadata));
  }

  // Performance logging helper
  time(label: string): void {
    if (this.isDevelopment) {
      // eslint-disable-next-line no-console
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (this.isDevelopment) {
      // eslint-disable-next-line no-console
      console.timeEnd(label);
    }
  }

  // Group logging for better organization in dev tools
  group(label: string): void {
    if (this.isDevelopment) {
      // eslint-disable-next-line no-console
      console.group(label);
    }
  }

  groupEnd(): void {
    if (this.isDevelopment) {
      // eslint-disable-next-line no-console
      console.groupEnd();
    }
  }
}

// Create singleton instance
const clientLogger = new ClientLogger();

// Export as structuredLogger for drop-in replacement
export const structuredLogger = clientLogger;

// Export individual methods for convenience
export const logger = {
  error: clientLogger.error.bind(clientLogger),
  warn: clientLogger.warn.bind(clientLogger),
  info: clientLogger.info.bind(clientLogger),
  debug: clientLogger.debug.bind(clientLogger),
  http: clientLogger.http.bind(clientLogger),
  time: clientLogger.time.bind(clientLogger),
  timeEnd: clientLogger.timeEnd.bind(clientLogger),
  group: clientLogger.group.bind(clientLogger),
  groupEnd: clientLogger.groupEnd.bind(clientLogger),
};

// Performance timing utility
export function createTimer() {
  const start = performance.now();

  return {
    end: () => Math.round(performance.now() - start),
    endMs: () => performance.now() - start,
  };
}

// Component-specific logger factory
export function createComponentLogger(componentName: string) {
  return {
    error: (message: string, error?: Error | unknown, metadata?: LogMetadata) =>
      clientLogger.error(message, error, { component: componentName, ...metadata }),

    warn: (message: string, metadata?: LogMetadata) =>
      clientLogger.warn(message, { component: componentName, ...metadata }),

    info: (message: string, metadata?: LogMetadata) =>
      clientLogger.info(message, { component: componentName, ...metadata }),

    debug: (message: string, metadata?: LogMetadata) =>
      clientLogger.debug(message, { component: componentName, ...metadata }),
  };
}

// Export default
export default clientLogger;
