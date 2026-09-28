#!/usr/bin/env node

/**
 * Copy the MapLibre GL worker into public/maplibre/
 *
 * maplibre-gl v6 is ESM-only and runs its worker from a separate module
 * file. Next.js (Turbopack and --webpack alike) emits the worker without
 * its maplibre-gl-shared.mjs sibling, so the worker fails on its first
 * import and maps mount without ever drawing a layer. Upstream's fix for
 * Next.js: serve both files from public/ and point setWorkerUrl at them
 * (see src/features/districts/components/maplibre-loader.ts).
 *
 * Runs as predev/prebuild, copying from node_modules so the files always
 * match the installed version. The output is gitignored.
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const dist = path.join(
  path.dirname(createRequire(import.meta.url).resolve('maplibre-gl/package.json')),
  'dist'
);
const dest = path.join(process.cwd(), 'public', 'maplibre');

mkdirSync(dest, { recursive: true });
for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  copyFileSync(path.join(dist, file), path.join(dest, file));
}
