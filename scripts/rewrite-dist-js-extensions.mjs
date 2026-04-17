#!/usr/bin/env node
// Add `.js` extensions to relative imports in compiled dist/*.js.
//
// TypeScript with `moduleResolution: "bundler"` emits imports verbatim
// from source — so source `from './foo'` stays `from './foo'` in the
// output. That works for Vite/Webpack but fails under native Node ESM,
// which requires explicit extensions. We keep source extensionless (so
// Next.js/Turbopack in this monorepo can resolve `.ts` files directly)
// and rewrite only the compiled output for npm publication.
//
// Usage: node scripts/rewrite-dist-js-extensions.mjs <dist-dir>

import fs from 'node:fs';
import path from 'node:path';

const distDir = process.argv[2];
if (!distDir) {
  console.error('Usage: rewrite-dist-js-extensions.mjs <dist-dir>');
  process.exit(1);
}

// Match `from '...'` / `from "..."` and `import('...')` where `...` is
// a relative path (./ or ../) with no extension.
const importRe = /(from\s+|import\s*\(\s*)(['"])(\.\.?\/[^'"\s]+?)\2/g;

function shouldSkip(modulePath) {
  // Leave alone if already has a known extension.
  return /\.(js|mjs|cjs|json|wasm)$/.test(modulePath);
}

function rewriteFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  const rewritten = original.replace(importRe, (match, keyword, quote, modPath) => {
    if (shouldSkip(modPath)) return match;
    return `${keyword}${quote}${modPath}.js${quote}`;
  });
  if (rewritten !== original) {
    fs.writeFileSync(filePath, rewritten);
    return true;
  }
  return false;
}

function walk(dir) {
  const touched = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) touched.push(...walk(p));
    else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.mjs'))) {
      if (rewriteFile(p)) touched.push(p);
    }
  }
  return touched;
}

const touched = walk(distDir);
console.log(`[rewrite-dist-js-extensions] rewrote ${touched.length} file(s) under ${distDir}`);
