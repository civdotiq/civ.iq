/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * CourtListener API Types
 *
 * Types for the CourtListener REST API v4.
 * Provides federal and state court docket data.
 *
 * API: https://www.courtlistener.com/api/rest/v4/
 */

/** Court case docket from CourtListener */
export interface CourtCase {
  docketId: number;
  caseName: string;
  court: string;
  dateFiled: string;
  dateTerminated: string | null;
  parties: string[];
  natureOfSuit: string | null;
}

/** Judge position from CourtListener */
export interface JudgePosition {
  personId: number;
  name: string;
  court: string;
  dateStart: string;
  nominatedBy: string | null;
  appointedBy: string | null;
}

/** Raw CourtListener docket from API */
export interface CourtListenerRawDocket {
  id: number;
  case_name: string;
  court: string;
  date_filed: string;
  date_terminated: string | null;
  nature_of_suit: string | null;
  parties?: Array<{
    name: string;
    type: number;
  }>;
}

/** Raw CourtListener position from API */
export interface CourtListenerRawPosition {
  person: {
    id: number;
    name_full: string;
  };
  court: { short_name: string };
  date_start: string;
  date_nominated?: string;
  appointer?: {
    person: { name_full: string };
  };
}

/** CourtListener API list response envelope */
export interface CourtListenerListResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
