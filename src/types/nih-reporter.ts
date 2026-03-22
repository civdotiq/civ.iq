/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * NIH RePORTER Types
 *
 * Types for NIH-funded research grants and projects.
 *
 * API: https://api.reporter.nih.gov/v2/
 * No API key required.
 */

/** NIH grant/project record */
export interface NihGrant {
  projectNumber: string;
  projectTitle: string;
  fiscalYear: number;
  organization: string;
  organizationCity: string;
  organizationState: string;
  department: string | null;
  principalInvestigator: string;
  awardAmount: number;
  fundingMechanism: string | null;
  nihInstitute: string | null;
  projectStartDate: string | null;
  projectEndDate: string | null;
  abstractText: string | null;
}

/** Detailed project information */
export interface NihProjectDetails extends NihGrant {
  spendingCategories: string[];
  publicHealthRelevance: string | null;
  terms: string[];
  totalCost: number | null;
  totalCostSubProjects: number | null;
}

// ── Raw API response types ──────────────────────────────────────

/** NIH RePORTER search response */
export interface NihReporterSearchResponse {
  meta: {
    offset: number;
    limit: number;
    total: number;
    sort_field: string;
    sort_order: string;
  };
  results: RawNihProject[];
}

/** Raw NIH project from API */
export interface RawNihProject {
  appl_id: number;
  project_num: string;
  project_title: string;
  fiscal_year: number;
  organization: {
    org_name: string;
    org_city: string;
    org_state: string;
    department?: string;
  };
  principal_investigators: Array<{
    profile_id: number;
    full_name: string;
    is_contact_pi: boolean;
  }>;
  award_amount: number;
  agency_ic_fundings: Array<{
    abbreviation: string;
    name: string;
    total_cost: number;
  }>;
  project_start_date: string | null;
  project_end_date: string | null;
  abstract_text: string | null;
  spending_categories_desc: string | null;
  phr_text: string | null;
  terms: string | null;
  activity_code: string;
  total_cost: number | null;
  total_cost_sub_projects: number | null;
}
