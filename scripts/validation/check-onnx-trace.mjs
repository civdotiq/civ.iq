#!/usr/bin/env node

/**
 * Post-build guard: every function that ships onnxruntime-node's native binding
 * must also ship the shared library it dynamically links.
 *
 * Next's tracer includes `onnxruntime_binding.node` but not
 * `libonnxruntime.so.1`, so on Vercel `import('@huggingface/transformers')`
 * failed at dlopen and every ML pipeline silently fell back to keywords. The
 * fix is the ONNX_NODE_SHARED_LIB include in next.config.mjs; this check
 * catches a new route that loads the analyzers without a matching include key.
 *
 * It reads the same `.nft.json` traces Vercel's build adapter reads during
 * `next build`, so it must never be paired with a script that edits them
 * afterwards — such edits pass here but never reach a Vercel deployment.
 *
 * Usage: npm run build && npm run check:onnx-trace
 */

import fs from 'node:fs';
import path from 'node:path';

const SERVER_DIR = path.join(process.cwd(), '.next', 'server');
const BINDING = 'onnxruntime_binding.node';
const SHARED_LIB = 'onnxruntime-node/bin/napi-v6/linux/x64/libonnxruntime.so.1';

function findTraceFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findTraceFiles(full));
    else if (entry.name.endsWith('.nft.json')) out.push(full);
  }
  return out;
}

if (!fs.existsSync(SERVER_DIR)) {
  console.error(`No build output at ${SERVER_DIR} — run \`npm run build\` first.`);
  process.exit(1);
}

let withBinding = 0;
const missing = [];
for (const traceFile of findTraceFiles(SERVER_DIR)) {
  const { files } = JSON.parse(fs.readFileSync(traceFile, 'utf8'));
  if (!files.some(f => f.endsWith(BINDING))) continue;
  withBinding++;
  if (!files.some(f => f.endsWith(SHARED_LIB))) {
    missing.push(path.relative(SERVER_DIR, traceFile));
  }
}

if (missing.length > 0) {
  console.error(`${missing.length} of ${withBinding} functions load onnxruntime-node without ${SHARED_LIB}:`);
  for (const m of missing) console.error(`  - ${m}`);
  console.error('Add an outputFileTracingIncludes key with ONNX_NODE_SHARED_LIB in next.config.mjs.');
  process.exit(1);
}

console.log(`OK: all ${withBinding} functions that load onnxruntime-node ship ${SHARED_LIB}.`);
