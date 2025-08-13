/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

// Polyfill for 'self' in Node.js environment during SSR
if (typeof self === 'undefined') {
  if (typeof global !== 'undefined') {
    // @ts-expect-error - Polyfilling self for SSR
    global.self = global;
  }
}

export {};
