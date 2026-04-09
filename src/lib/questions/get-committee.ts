/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Cached committee getter — deduplicates getCommitteeDataService calls
 * across layout.tsx and page.tsx within a single React render.
 */

import { cache } from 'react';
import { getCommitteeDataService } from '@/lib/services/committee.service';

export const getCachedCommittee = cache((committeeId: string) =>
  getCommitteeDataService(committeeId.toUpperCase())
);
