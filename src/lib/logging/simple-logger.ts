/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Structured logger that works on Vercel Edge Runtime.
 * Outputs JSON-structured log lines for machine parsing.
 * Same API surface as before — zero caller changes needed.
 */

function formatLogLine(level: string, message: unknown, rest: unknown[]): string {
  const entry: Record<string, unknown> = {
    level,
    timestamp: new Date().toISOString(),
    message: typeof message === 'string' ? message : String(message),
  };

  // If the second arg is a plain object, merge it as data
  if (rest.length === 1 && rest[0] && typeof rest[0] === 'object' && !(rest[0] instanceof Error)) {
    entry.data = rest[0];
  } else if (rest.length > 0) {
    // Handle Error objects and mixed args
    const data: unknown[] = [];
    for (const arg of rest) {
      if (arg instanceof Error) {
        entry.error = { name: arg.name, message: arg.message, stack: arg.stack };
      } else {
        data.push(arg);
      }
    }
    if (data.length === 1) {
      entry.data = data[0];
    } else if (data.length > 1) {
      entry.data = data;
    }
  }

  return JSON.stringify(entry);
}

const logger = {
  info: (message: unknown, ...args: unknown[]) =>
    // eslint-disable-next-line no-console
    console.log(formatLogLine('info', message, args)),
  error: (message: unknown, ...args: unknown[]) =>
    // eslint-disable-next-line no-console
    console.error(formatLogLine('error', message, args)),
  warn: (message: unknown, ...args: unknown[]) =>
    // eslint-disable-next-line no-console
    console.warn(formatLogLine('warn', message, args)),
  debug: (message: unknown, ...args: unknown[]) =>
    // eslint-disable-next-line no-console
    console.log(formatLogLine('debug', message, args)),
  metric: (name: string, data: Record<string, unknown>) =>
    // eslint-disable-next-line no-console
    console.log(formatLogLine('metric', name, [data])),
};

export default logger;
