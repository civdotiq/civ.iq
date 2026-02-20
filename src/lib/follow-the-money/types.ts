/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * FollowTheMoney API Response Types
 *
 * Raw types matching the FollowTheMoney.org API response format.
 * http://api.followthemoney.org
 */

/**
 * Entity record returned by entity.php
 */
export interface FTMEntityRecord {
  id: string;
  imsp_candidate_id?: string;
  eid?: string;
  candidate_name?: string;
  first_name?: string;
  last_name?: string;
  party?: string;
  state?: string;
  office?: string;
  office_level?: string;
  district?: string;
  status?: string;
  year?: number;
  type?: string;
  total_$?: string;
  total_direct_$?: string;
  total_indexp_$?: string;
  num_records?: string;
}

/**
 * Contribution record from detailed API queries
 */
export interface FTMContributionRecord {
  Contributor?: string;
  Contributor_Type?: string;
  Contributor_Category?: string;
  Contributor_State?: string;
  Amount?: string;
  Date?: string;
  Filing_Type?: string;
  Employer?: string;
  Occupation?: string;
}

/**
 * Industry/sector summary from API
 */
export interface FTMIndustrySummary {
  Sector?: string;
  Sector_Long?: string;
  Total_$?: string;
  Num_Contributions?: string;
}

/**
 * Search result from candidate search
 */
export interface FTMSearchResult {
  results?: FTMEntityRecord[];
  metaInfo?: {
    totalRecords?: string;
    page?: string;
    rowsPerPage?: string;
  };
}
