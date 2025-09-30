/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

// Simple logger that works on Vercel Edge Runtime
const logger = {
  info: (...args: unknown[]) =>
    // eslint-disable-next-line no-console
    console.log('[INFO]', ...args),
  error: (...args: unknown[]) =>
    // eslint-disable-next-line no-console
    console.error('[ERROR]', ...args),
  warn: (...args: unknown[]) =>
    // eslint-disable-next-line no-console
    console.warn('[WARN]', ...args),
  debug: (...args: unknown[]) =>
    // eslint-disable-next-line no-console
    console.log('[DEBUG]', ...args),
  metric: (name: string, data: Record<string, unknown>) =>
    // eslint-disable-next-line no-console
    console.log('[METRIC]', name, JSON.stringify(data)),
};

export default logger;
