/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * FDA openFDA API Types
 *
 * Types for drug/food/device recalls, adverse events, and enforcement actions.
 *
 * API: https://api.fda.gov/
 * Docs: https://open.fda.gov/apis/
 */

/** FDA recall (from enforcement endpoint) */
export interface FdaRecall {
  recallNumber: string;
  reportDate: string;
  recallInitiationDate: string;
  centerClassificationDate: string | null;
  terminationDate: string | null;
  classification: 'Class I' | 'Class II' | 'Class III';
  status: string;
  voluntaryMandated: string;
  productDescription: string;
  reasonForRecall: string;
  codeInfo: string;
  productQuantity: string;
  distributionPattern: string;
  recallingFirm: string;
  city: string;
  state: string;
  country: string;
  productType: string;
}

/** FDA adverse event report */
export interface FdaAdverseEvent {
  safetyReportId: string;
  receiveDate: string;
  receiptDate: string | null;
  serious: boolean;
  seriousnessHospitalization: boolean;
  seriousnessDeath: boolean;
  seriousnessLifeThreatening: boolean;
  seriousnessDisabling: boolean;
  patientOnsetAge: number | null;
  patientOnsetAgeUnit: string | null;
  patientSex: string | null;
  drugs: Array<{
    medicinalProduct: string;
    drugIndication: string | null;
    drugCharacterization: string;
  }>;
  reactions: Array<{
    reactionMedDrapt: string;
    reactionOutcome: string | null;
  }>;
}

/** FDA enforcement action */
export interface FdaEnforcementAction {
  eventId: string;
  recallNumber: string;
  reportDate: string;
  classification: string;
  status: string;
  recallingFirm: string;
  productDescription: string;
  reasonForRecall: string;
  productType: string;
  city: string;
  state: string;
}

// ── Raw API response types ──────────────────────────────────────

/** openFDA response envelope */
export interface OpenFdaResponse<T> {
  meta: {
    disclaimer: string;
    terms: string;
    license: string;
    last_updated: string;
    results: {
      skip: number;
      limit: number;
      total: number;
    };
  };
  results: T[];
}

/** Raw enforcement result from openFDA */
export interface RawEnforcementResult {
  recall_number: string;
  report_date: string;
  recall_initiation_date: string;
  center_classification_date: string | null;
  termination_date: string | null;
  classification: string;
  status: string;
  voluntary_mandated: string;
  product_description: string;
  reason_for_recall: string;
  code_info: string;
  product_quantity: string;
  distribution_pattern: string;
  recalling_firm: string;
  city: string;
  state: string;
  country: string;
  product_type: string;
  openfda: Record<string, string[]>;
}

/** Raw drug adverse event result from openFDA */
export interface RawDrugEventResult {
  safetyreportid: string;
  receivedate: string;
  receiptdate: string | null;
  serious: string;
  seriousnesshospitalization: string | null;
  seriousnessdeath: string | null;
  seriousnesslifethreatening: string | null;
  seriousnessdisabling: string | null;
  patient: {
    patientonsetage: string | null;
    patientonsetageunit: string | null;
    patientsex: string | null;
    drug: Array<{
      medicinalproduct: string;
      drugindication: string | null;
      drugcharacterization: string;
      openfda?: Record<string, string[]>;
    }>;
    reaction: Array<{
      reactionmeddrapt: string;
      reactionoutcome: string | null;
    }>;
  };
}
