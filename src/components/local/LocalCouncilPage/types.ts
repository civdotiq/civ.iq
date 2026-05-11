/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * LocalCouncilPage types — thin wrappers over the existing Legistar
 * response shapes in `@/types/legistar`.
 */

import type { CityCouncilResponse, CityLegislationResponse } from '@/types/legistar';

export type LocalCouncilPayload = CityCouncilResponse;
export type LocalLegislationPayload = CityLegislationResponse;

export interface FetchResult<T> {
  data: T | null;
  unavailable: boolean;
}
