#!/usr/bin/env node
/**
 * Patch onnxruntime-node to re-export onnxruntime-web.
 *
 * onnxruntime-node requires a native .so binary that doesn't exist on
 * Vercel's serverless environment. @huggingface/transformers lists both
 * onnxruntime-node and onnxruntime-web as dependencies, but the Node.js
 * build hard-imports onnxruntime-node first. This script replaces
 * onnxruntime-node's entry point with a shim that loads onnxruntime-web
 * instead, making the WASM backend work everywhere.
 *
 * Runs as a postinstall hook.
 */

const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'node_modules', 'onnxruntime-node', 'dist', 'index.js');

if (!fs.existsSync(target)) {
  console.log('[patch-onnxruntime] onnxruntime-node not installed, skipping');
  process.exit(0);
}

const shim = `// Patched by scripts/patch-onnxruntime.js — loads onnxruntime-web instead of native binary
module.exports = require('onnxruntime-web');
`;

fs.writeFileSync(target, shim);
console.log('[patch-onnxruntime] Replaced onnxruntime-node entry with onnxruntime-web shim');
