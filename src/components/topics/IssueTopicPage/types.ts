/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { PolicyAreaResults } from '@/types/joins';
import type {
  IndustryOrganizationsResponse,
  SectorLeaderboardResponse,
} from '@/components/sectors/IndustrySectorPage/types';

export interface IssueTopicPageProps {
  slug: string;
  policyArea: string;
  displayName: string;
  industrySectorSlug: string | null;
  industrySectorLabel: string | null;
}

export type PolicyAreaPayload = PolicyAreaResults;
export type LeaderboardPayload = SectorLeaderboardResponse;
export type OrgsPayload = IndustryOrganizationsResponse;

export type LeaderboardEntry = SectorLeaderboardResponse['entries'][number];
export type CommitteeRow = PolicyAreaResults['committees'][number];
export type BillRow = PolicyAreaResults['bills'][number];
export type RegulationRow = PolicyAreaResults['regulations'][number];
