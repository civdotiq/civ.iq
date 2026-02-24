/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * WebSocket polyfill for Node.js
 * nostr-tools expects browser WebSocket API — this provides it in serverless
 */

import WebSocket from 'ws';

if (typeof globalThis !== 'undefined' && !globalThis.WebSocket) {
  (globalThis as Record<string, unknown>).WebSocket = WebSocket;
}

export default WebSocket;
