/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * College Scorecard Types
 *
 * Types for higher education institution data from the
 * Department of Education College Scorecard API.
 *
 * API: https://api.data.gov/ed/collegescorecard/v1/
 * Uses DATA_GOV_API_KEY.
 */

/** College/university institution record */
export interface CollegeScorecardInstitution {
  unitId: number;
  name: string;
  city: string;
  state: string;
  zip: string;
  url: string | null;
  ownership: string;
  locale: string | null;
  size: number | null;
  admissionRate: number | null;
  satAverage: number | null;
  completionRate: number | null;
  averageNetPrice: number | null;
  medianEarnings: number | null;
  medianDebt: number | null;
  predominantDegree: string | null;
  highestDegree: string | null;
  underInvestigation: boolean;
}

/** Detailed institution data with additional financial metrics */
export interface CollegeScorecardDetails extends CollegeScorecardInstitution {
  federalLoanRate: number | null;
  pellGrantRate: number | null;
  retentionRate: number | null;
  facultyAverageSalary: number | null;
  instructionalExpenditurePerStudent: number | null;
  studentToFacultyRatio: number | null;
  endowmentPerStudent: number | null;
  programPercentages: Record<string, number>;
}

// ── Raw API response types ──────────────────────────────────────

/** College Scorecard API response envelope */
export interface CollegeScorecardApiResponse {
  metadata: {
    total: number;
    page: number;
    per_page: number;
  };
  results: RawScorecardResult[];
}

/** Raw result from Scorecard API */
export interface RawScorecardResult {
  id: number;
  'school.name': string;
  'school.city': string;
  'school.state': string;
  'school.zip': string;
  'school.school_url': string | null;
  'school.ownership': number;
  'school.locale': number | null;
  'latest.student.size': number | null;
  'latest.admissions.admission_rate.overall': number | null;
  'latest.admissions.sat_scores.average.overall': number | null;
  'latest.completion.rate_suppressed.overall': number | null;
  'latest.cost.avg_net_price.overall': number | null;
  'latest.earnings.10_yrs_after_entry.median': number | null;
  'latest.aid.median_debt_suppressed.overall': number | null;
  'school.degrees_awarded.predominant': number | null;
  'school.degrees_awarded.highest': number | null;
  'school.under_investigation': number;
  'latest.aid.federal_loan_rate': number | null;
  'latest.aid.pell_grant_rate': number | null;
  'latest.student.retention_rate.overall.full_time': number | null;
  'latest.cost.faculty_salary': number | null;
  'latest.academics.program_percentage.education': number;
  'latest.academics.program_percentage.health': number;
  'latest.academics.program_percentage.computer': number;
  'latest.academics.program_percentage.engineering': number;
  'latest.academics.program_percentage.business_marketing': number;
  [key: string]: string | number | null | undefined;
}
