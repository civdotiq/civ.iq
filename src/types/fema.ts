/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * FEMA OpenAPI Types
 *
 * Types for FEMA disaster declarations and assistance data.
 *
 * APIs:
 * - Declarations: https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries
 * - Assistance: https://www.fema.gov/api/open/v1/FemaWebDisasterSummaries
 */

/** FEMA disaster declaration from DisasterDeclarationsSummaries (v2) */
export interface FemaDisasterDeclaration {
  femaDeclarationString: string;
  disasterNumber: number;
  state: string;
  declarationType: 'DR' | 'EM' | 'FM';
  declarationDate: string;
  fyDeclared: number;
  incidentType: string;
  declarationTitle: string;
  ihProgramDeclared: boolean;
  iaProgramDeclared: boolean;
  paProgramDeclared: boolean;
  hmProgramDeclared: boolean;
  incidentBeginDate: string | null;
  incidentEndDate: string | null;
  disasterCloseoutDate: string | null;
  fipsStateCode: string;
  fipsCountyCode: string;
  designatedArea: string;
  region: number;
}

/** FEMA disaster assistance summary from FemaWebDisasterSummaries (v1) */
export interface FemaAssistance {
  disasterNumber: number;
  totalNumberIaApproved: number | null;
  totalAmountIhpApproved: number | null;
  totalAmountHaApproved: number | null;
  totalAmountOnaApproved: number | null;
  totalObligatedAmountPa: number | null;
  totalObligatedAmountCatAb: number | null;
  totalObligatedAmountCatC2g: number | null;
  totalObligatedAmountHmgp: number | null;
  paLoadDate: string | null;
  iaLoadDate: string | null;
}

// ── Raw API response envelopes ──────────────────────────────────

/** FEMA OpenAPI v2 response envelope */
export interface FemaV2Response<T> {
  metadata: {
    skip: number;
    top: number;
    count: number;
    filter: string;
    format: string;
    orderby: string;
    entityname: string;
    version: string;
    url: string;
  };
  [entityName: string]: T[] | FemaV2Response<T>['metadata'];
}

/** Raw disaster declaration from FEMA API */
export interface FemaRawDeclaration {
  femaDeclarationString: string;
  disasterNumber: number;
  state: string;
  declarationType: string;
  declarationDate: string;
  fyDeclared: number;
  incidentType: string;
  declarationTitle: string;
  ihProgramDeclared: boolean;
  iaProgramDeclared: boolean;
  paProgramDeclared: boolean;
  hmProgramDeclared: boolean;
  incidentBeginDate: string | null;
  incidentEndDate: string | null;
  disasterCloseoutDate: string | null;
  fipsStateCode: string;
  fipsCountyCode: string;
  designatedArea: string;
  region: number;
}

/** Raw assistance summary from FEMA v1 API */
export interface FemaRawAssistance {
  disasterNumber: number;
  totalNumberIaApproved: number | null;
  totalAmountIhpApproved: number | null;
  totalAmountHaApproved: number | null;
  totalAmountOnaApproved: number | null;
  totalObligatedAmountPa: number | null;
  totalObligatedAmountCatAb: number | null;
  totalObligatedAmountCatC2g: number | null;
  totalObligatedAmountHmgp: number | null;
  paLoadDate: string | null;
  iaLoadDate: string | null;
}
