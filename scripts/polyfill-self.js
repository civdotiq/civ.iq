/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

// Polyfill for 'self' in Node.js environment during build
if (typeof global !== 'undefined' && typeof global.self === 'undefined') {
  global.self = global;
}
