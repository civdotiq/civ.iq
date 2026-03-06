/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Logger interface for the entity-resolution package.
 * Consumers provide their own logger via setLogger() or configure().
 * Default is a no-op logger.
 */
export interface Logger {
  debug: (message: unknown, ...args: unknown[]) => void;
  info: (message: unknown, ...args: unknown[]) => void;
  warn: (message: unknown, ...args: unknown[]) => void;
  error: (message: unknown, ...args: unknown[]) => void;
}

const noopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

let currentLogger: Logger = noopLogger;

/** Set the logger implementation for this package. */
export function setLogger(logger: Logger): void {
  currentLogger = logger;
}

/** Get the current logger. */
export function getLogger(): Logger {
  return currentLogger;
}
