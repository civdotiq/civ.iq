/**
 * Shared filter types for representatives and other filterable lists.
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Filter state for representatives list filtering.
 * Used by RepresentativesClient and FilterSidebar components.
 */
export interface FilterState {
  chamber: string;
  party: string;
  state: string;
  committee: string;
}

/**
 * Default filter state with all filters set to 'all'.
 */
export const DEFAULT_FILTER_STATE: FilterState = {
  chamber: 'all',
  party: 'all',
  state: 'all',
  committee: 'all',
};
