/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Atom Feed Builder
 *
 * Re-exports from the existing feeds/atom-generator module.
 * This module provides a convenient import path for feed routes.
 */

export {
  generateAtomFeed,
  createRepresentativeFeedConfig,
  createBillsFeedConfig,
} from '@/lib/feeds/atom-generator';

export type { AtomFeedConfig, AtomEntry } from '@/lib/feeds/atom-generator';
