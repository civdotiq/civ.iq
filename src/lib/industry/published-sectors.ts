/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * The industry sectors that have a page at /industry/{slug}: the index page
 * lists them, the sitemap emits them, and any other slug is a 404 (it used to
 * render "Not A Sector — Industry sector" with a 200).
 */
export const PUBLISHED_SECTORS = [
  { name: 'Agribusiness', slug: 'agribusiness' },
  { name: 'Communications/Electronics', slug: 'communications-electronics' },
  { name: 'Construction', slug: 'construction' },
  { name: 'Defense', slug: 'defense' },
  { name: 'Energy/Natural Resources', slug: 'energy-natural-resources' },
  { name: 'Finance/Insurance/Real Estate', slug: 'finance-insurance-real-estate' },
  { name: 'Health', slug: 'health' },
  { name: 'Transportation', slug: 'transportation' },
  { name: 'Misc Business', slug: 'misc-business' },
  { name: 'Labor', slug: 'labor' },
] as const;

export function isPublishedSectorSlug(slug: string): boolean {
  return PUBLISHED_SECTORS.some(s => s.slug === slug);
}
