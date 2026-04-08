/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { cache } from 'react';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';

/**
 * React cache()-wrapped representative fetcher.
 *
 * Deduplicates getEnhancedRepresentative calls within a single
 * server render — layout.tsx and page.tsx share the same result
 * without extra HTTP or service overhead.
 */
export const getCachedRepresentative = cache((bioguideId: string) =>
  getEnhancedRepresentative(bioguideId.toUpperCase())
);
