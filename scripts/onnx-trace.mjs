#!/usr/bin/env node

/**
 * Ship onnxruntime-node's shared library with every function that loads it.
 *
 * `onnxruntime_binding.node` dynamically links `libonnxruntime.so.1`. Next's
 * tracer ships the `.node` file but not the `.so` beside it, so on Vercel
 * `import('@huggingface/transformers')` threw at dlopen and every ML pipeline
 * (embeddings, zero-shot, NER) silently fell back to keywords.
 *
 * `outputFileTracingIncludes` cannot fix this for every route: it is skipped
 * for SSG pages such as /ask/[slug]/[entityId], which runs the analyzers. So
 * this script edits the `.nft.json` trace files directly — the same files
 * Next's own includes rewrite and Vercel reads to assemble each function.
 *
 *   node scripts/onnx-trace.mjs --fix   # postbuild: add the .so where needed
 *   node scripts/onnx-trace.mjs         # validate:all: fail if any are missing
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SERVER_DIR = path.join(ROOT, '.next', 'server');
const BINDING = 'onnxruntime_binding.node';
// Vercel builds and runs on linux/x64.
const SHARED_LIB = 'node_modules/onnxruntime-node/bin/napi-v6/linux/x64/libonnxruntime.so.1';
const fix = process.argv.includes('--fix');

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
if (!fs.existsSync(path.join(ROOT, SHARED_LIB))) {
  console.error(`${SHARED_LIB} not found — is onnxruntime-node installed?`);
  process.exit(1);
}

let withBinding = 0;
const missing = [];
for (const traceFile of findTraceFiles(SERVER_DIR)) {
  const trace = JSON.parse(fs.readFileSync(traceFile, 'utf8'));
  if (!trace.files.some(f => f.endsWith(BINDING))) continue;
  withBinding++;
  if (trace.files.some(f => f.endsWith(SHARED_LIB))) continue;

  if (fix) {
    trace.files.push(path.relative(path.dirname(traceFile), path.join(ROOT, SHARED_LIB)));
    fs.writeFileSync(traceFile, JSON.stringify(trace));
  }
  missing.push(path.relative(SERVER_DIR, traceFile));
}

if (fix) {
  console.log(`[onnx-trace] added ${SHARED_LIB} to ${missing.length} of ${withBinding} traces`);
  process.exit(0);
}

if (missing.length > 0) {
  console.error(`${missing.length} of ${withBinding} functions load onnxruntime-node without ${SHARED_LIB}:`);
  for (const m of missing) console.error(`  - ${m}`);
  console.error('The postbuild step (`node scripts/onnx-trace.mjs --fix`) did not run.');
  process.exit(1);
}

console.log(`OK: all ${withBinding} functions that load onnxruntime-node ship ${SHARED_LIB}.`);
