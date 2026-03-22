/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * FDIC BankFind Types
 *
 * Types for bank institution data and bank failures.
 *
 * API: https://banks.data.fdic.gov/api/
 * No API key required.
 */

/** FDIC-insured institution */
export interface FdicInstitution {
  certNumber: number;
  institutionName: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  institutionClass: string;
  charterClass: string;
  totalAssets: number | null;
  totalDeposits: number | null;
  numberOfOffices: number | null;
  established: string | null;
  activeFlag: boolean;
  regulatorName: string;
  fdicInsured: boolean;
}

/** FDIC bank failure record */
export interface FdicBankFailure {
  certNumber: number;
  institutionName: string;
  city: string;
  state: string;
  failDate: string;
  cost: number | null;
  acquiringInstitution: string | null;
  totalDeposits: number | null;
  totalAssets: number | null;
}

// ── Raw API response types ──────────────────────────────────────

/** FDIC BankFind API response envelope */
export interface FdicApiResponse<T> {
  data: T[];
  totals: { count: number };
  meta: {
    total: number;
    parameters: Record<string, string>;
  };
}

/** Raw institution from FDIC API */
export interface RawFdicInstitution {
  data: {
    CERT: number;
    INSTNAME: string;
    CITY: string;
    STALP: string;
    ZIP: string;
    COUNTY: string;
    INSTCAT: string;
    CHRTAGNT: string;
    ASSET: number | null;
    DEP: number | null;
    OFFDOM: number | null;
    ESTYMD: string | null;
    ACTIVE: number;
    REGAGENT: string;
    FDICREGN: string;
  };
}

/** Raw bank failure from FDIC API */
export interface RawFdicFailure {
  data: {
    CERT: number;
    NAME: string;
    CITY: string;
    STATE: string;
    FAILDATE: string;
    COST: number | null;
    PSTALP: string;
    QBFASSET: number | null;
    QBFDEP: number | null;
    ACQUIRER: string | null;
  };
}
