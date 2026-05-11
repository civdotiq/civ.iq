/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * SearchVariants chassis (PR 21) — five listing routes redesigned behind
 * `?v=new`. See PLAN-redesign-implementation-2026-05.md (PR 21) for the
 * scope decision and per-row cuts.
 */

export { DistrictListingPage } from './DistrictListingPage';
export { StateListingPage } from './StateListingPage';
export { SectorListingPage } from './SectorListingPage';
export { RegulationListingPage } from './RegulationListingPage';
export { TopicListingPage } from './TopicListingPage';

export { VariantHeader } from './VariantHeader';
export { VariantSidebar } from './VariantSidebar';
export { VariantFacetCard } from './VariantFacetCard';
export { VariantPagination } from './VariantPagination';
export { VariantEmptyState } from './VariantEmptyState';
export { MapOutlinePlaceholder } from './MapOutlinePlaceholder';
export { HouseSplitBar } from './HouseSplitBar';

export { DistrictResultRow } from './DistrictResultRow';
export { StateResultRow } from './StateResultRow';
export { SectorResultRow } from './SectorResultRow';
export { RegulationResultRow } from './RegulationResultRow';
export { TopicResultRow } from './TopicResultRow';

export type {
  DistrictRow,
  StateRow,
  SectorRow,
  RegulationRow,
  TopicRow,
  VariantKind,
  VariantHeaderProps,
  VariantSidebarItem,
  VariantFacetGroup,
  VariantFacetOption,
  VariantPaginationProps,
} from './types';
