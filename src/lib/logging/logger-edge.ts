/* eslint-disable no-console -- This is a logging utility that intentionally uses console */
/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Edge Runtime compatible logger
 * Uses console methods only - no file system operations
 */

import { NextRequest } from 'next/server';

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
  [key: string]: unknown;
}

class EdgeLogger {
  private logLevel: LogLevel;

  constructor(level: LogLevel = LogLevel.INFO) {
    this.logLevel = level;
  }

  private formatMessage(level: string, message: string, metadata?: LogMetadata): string {
    const timestamp = new Date().toISOString();
    const service = 'civic-intel-hub';
    const environment = process.env.NODE_ENV || 'development';

    const logEntry = {
      timestamp,
      level,
      service,
      environment,
      message,
      ...metadata,
    };

    return JSON.stringify(logEntry);
  }

  error(message: string, error?: Error, metadata?: LogMetadata): void {
    if (this.logLevel >= LogLevel.ERROR) {
      const errorMeta = error
        ? {
            error: error.message,
            stack: error.stack,
            ...metadata,
          }
        : metadata;

      console.error(this.formatMessage('error', message, errorMeta));
    }
  }

  warn(message: string, metadata?: LogMetadata): void {
    if (this.logLevel >= LogLevel.WARN) {
      console.warn(this.formatMessage('warn', message, metadata));
    }
  }

  info(message: string, metadata?: LogMetadata): void {
    if (this.logLevel >= LogLevel.INFO) {
      console.info(this.formatMessage('info', message, metadata));
    }
  }

  debug(message: string, metadata?: LogMetadata): void {
    if (this.logLevel >= LogLevel.DEBUG) {
      console.debug(this.formatMessage('debug', message, metadata));
    }
  }

  // Helper method for HTTP requests
  http(message: string, metadata?: LogMetadata): void {
    if (this.logLevel >= LogLevel.INFO) {
      console.log(this.formatMessage('http', message, metadata));
    }
  }
}

// Global logger instance
const edgeLogger = new EdgeLogger(
  process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO
);

// Export the logger instance as structuredLogger for compatibility
export const structuredLogger = edgeLogger;

// Request logger factory function
export function createRequestLogger(request: NextRequest, endpoint: string) {
  const requestId =
    request.headers.get('x-request-id') || Math.random().toString(36).substring(2, 15);

  return {
    info: (message: string, metadata?: LogMetadata) =>
      edgeLogger.info(message, { requestId, endpoint, ...metadata }),

    warn: (message: string, metadata?: LogMetadata) =>
      edgeLogger.warn(message, { requestId, endpoint, ...metadata }),

    error: (message: string, error?: Error, metadata?: LogMetadata) =>
      edgeLogger.error(message, error, { requestId, endpoint, ...metadata }),

    debug: (message: string, metadata?: LogMetadata) =>
      edgeLogger.debug(message, { requestId, endpoint, ...metadata }),
  };
}

// Performance timing utility
export function createTimer() {
  const start = Date.now();

  return {
    end: () => Date.now() - start,
  };
}

// Export individual log methods for convenience
export const logger = {
  error: edgeLogger.error.bind(edgeLogger),
  warn: edgeLogger.warn.bind(edgeLogger),
  info: edgeLogger.info.bind(edgeLogger),
  debug: edgeLogger.debug.bind(edgeLogger),
  http: edgeLogger.http.bind(edgeLogger),
};
