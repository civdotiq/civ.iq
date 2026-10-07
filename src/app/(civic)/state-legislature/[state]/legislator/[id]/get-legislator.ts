/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { cache } from 'react';
import { StateLegislatureCoreService } from '@/services/core/state-legislature-core.service';
import {
  getPersonById,
  getPersonByIdSuffix,
} from '@/lib/data-sources/openstates-people/load-people';
import { parseStateLegislatorParam } from '@/lib/helpers/url-builders';
import type { EnhancedStateLegislator } from '@/types/state-legislature';

/**
 * URL segment → sitting member, or null. Accepts the readable slug, the legacy
 * base64 id and the raw id; the page 308s the latter two to the slug.
 * Corpus only, never a live OpenStates call. Memoized per request because
 * metadata and the page both need it; the share image uses it too.
 */
export const getLegislator = cache(
  async (segment: string): Promise<EnhancedStateLegislator | null> => {
    const parsed = parseStateLegislatorParam(segment);
    if (!parsed) return null;

    const person =
      parsed.kind === 'suffix'
        ? await getPersonByIdSuffix(parsed.suffix)
        : await getPersonById(parsed.id);
    if (!person) return null;

    return StateLegislatureCoreService.getStateLegislatorById(person.jurisdiction, person.id);
  }
);
