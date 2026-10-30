/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Cached committee lookup — deduplicates lookupCommittee calls across
 * layout.tsx and page.tsx within a single React render. Found, not found
 * (the page 404s) or unavailable (the source failed; noindexed).
 */

import { cache } from 'react';
import { lookupCommittee, type CommitteeLookup } from '@/lib/services/committee.service';

export const getCachedCommitteeLookup = cache((committeeId: string): Promise<CommitteeLookup> =>
  lookupCommittee(committeeId.toUpperCase()).catch((): CommitteeLookup => ({
    status: 'unavailable',
  }))
);
