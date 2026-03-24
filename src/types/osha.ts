/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * OSHA Inspection and Violation Types
 *
 * Types for the Department of Labor OSHA enforcement data.
 * API: https://apiprod.dol.gov/v4/osha/
 */

/** OSHA workplace inspection record */
export interface OshaInspection {
  activityNumber: string;
  establishmentName: string;
  siteAddress: string;
  siteCity: string;
  siteState: string;
  siteZip: string;
  sicCode: string;
  naicsCode: string;
  inspectionType: string;
  openDate: string;
  closeDate: string | null;
  totalCurrentPenalty: number;
  violationCount: number;
  seriousViolationCount: number;
}

/** OSHA violation detail */
export interface OshaViolation {
  activityNumber: string;
  citationId: string;
  violationType: 'S' | 'W' | 'R' | 'O';
  currentPenalty: number;
  initialPenalty: number;
  standard: string;
  abatementDate: string | null;
}

/** Summary statistics for OSHA inspections by SIC code */
export interface OshaInspectionSummary {
  sicCode: string;
  state: string | null;
  totalInspections: number;
  totalPenalties: number;
  avgPenalty: number;
  seriousViolationRate: number;
  periodStart: string;
  periodEnd: string;
}

/** Raw OSHA inspection record from DOL API */
export interface OshaRawInspection {
  activity_nr: number;
  estab_name: string;
  site_address: string;
  site_city: string;
  site_state: string;
  site_zip: string;
  sic_code: string;
  naics_code: string;
  insp_type: string;
  open_date: string;
  close_case_date: string | null;
  total_current_penalty: number;
  nr_in_state_flag: string;
}

/** Raw OSHA violation record from DOL API */
export interface OshaRawViolation {
  activity_nr: number;
  citation_id: string;
  viol_type: string;
  current_penalty: number;
  initial_penalty: number;
  issuance_date: string;
  abate_date: string | null;
  standard: string;
}
