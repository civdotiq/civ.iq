/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * The site-wide share card, rendered by src/app/opengraph-image.tsx.
 *
 * Next merges metadata shallowly: a segment that sets `openGraph` replaces
 * its parent's whole object, image included, so the link preview goes blank.
 * Every segment that sets `openGraph` therefore lists `images: SITE_OG_IMAGES`,
 * unless its folder has its own `opengraph-image` file — then it must leave
 * `images` out, or that file is ignored. `twitter.images` follows
 * `openGraph.images` when unset. Guarded by
 * src/__tests__/app/og-image-inheritance.test.ts.
 */
export const SITE_OG_IMAGES = [
  {
    url: '/opengraph-image',
    width: 1200,
    height: 630,
    alt: 'CIV.IQ: find and follow your representatives with real government data',
  },
];
