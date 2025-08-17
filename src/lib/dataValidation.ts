/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { EnhancedRepresentative } from '../types/representative';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  bioguideId?: string;
  repName?: string;
}

// Type definition for known representative data
interface KnownRepresentativeInfo {
  name: string;
  party: string;
  state: string;
  refusesPACs: boolean;
  expectedCommittees?: string[];
}

// Additional data validation interfaces
interface ValidationFinanceData {
  totalRaised?: number;
  pacRatio?: number;
  smallDonors?: number;
  topIndustry?: string;
  topCorporatePAC?: string;
  rawData?: unknown;
}

interface ValidationVotingData {
  partySupport?: number;
  attendance?: number;
  missed?: number;
}

interface ValidationAdditionalData {
  finance?: ValidationFinanceData;
  votes?: ValidationVotingData;
}

// Type guards for validation data
function isValidationFinanceData(data: unknown): data is ValidationFinanceData {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    (obj.totalRaised === undefined || typeof obj.totalRaised === 'number') &&
    (obj.pacRatio === undefined || typeof obj.pacRatio === 'number') &&
    (obj.smallDonors === undefined || typeof obj.smallDonors === 'number') &&
    (obj.topIndustry === undefined || typeof obj.topIndustry === 'string') &&
    (obj.topCorporatePAC === undefined || typeof obj.topCorporatePAC === 'string')
  );
}

function isValidationVotingData(data: unknown): data is ValidationVotingData {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    (obj.partySupport === undefined || typeof obj.partySupport === 'number') &&
    (obj.attendance === undefined || typeof obj.attendance === 'number') &&
    (obj.missed === undefined || typeof obj.missed === 'number')
  );
}

function isValidationAdditionalData(data: unknown): data is ValidationAdditionalData {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    (obj.finance === undefined || isValidationFinanceData(obj.finance)) &&
    (obj.votes === undefined || isValidationVotingData(obj.votes))
  );
}

// Known representatives for validation
export const KNOWN_REPRESENTATIVES: Record<string, KnownRepresentativeInfo> = {
  T000481: {
    name: 'Rashida Tlaib',
    party: 'Democrat',
    state: 'MI',
    refusesPACs: true,
    expectedCommittees: ['Oversight and Reform'],
  },
  O000172: {
    name: 'Alexandria Ocasio-Cortez',
    party: 'Democrat',
    state: 'NY',
    refusesPACs: true,
    expectedCommittees: ['Financial Services', 'Oversight and Reform'],
  },
  S000248: {
    name: 'José E. Serrano',
    party: 'Democrat',
    state: 'NY',
    refusesPACs: false,
  },
  M000087: {
    name: 'Carolyn B. Maloney',
    party: 'Democrat',
    state: 'NY',
    refusesPACs: false,
  },
};

export class DataValidator {
  private errors: ValidationError[] = [];

  /**
   * Validate representative data and return any errors found
   */
  validateRepresentativeData(
    representative: EnhancedRepresentative,
    additionalData?: unknown
  ): ValidationError[] {
    this.errors = [];

    this.validateBasicInfo(representative);
    this.validatePartyAffiliation(representative);

    // Type-safe access to additional data
    const validatedData = isValidationAdditionalData(additionalData) ? additionalData : undefined;
    this.validateFinanceData(representative, validatedData?.finance);
    this.validateVotingData(representative, validatedData?.votes);
    this.validateKnownRepresentatives(representative, validatedData);

    return this.errors;
  }

  /**
   * Validate basic representative information
   */
  private validateBasicInfo(rep: EnhancedRepresentative): void {
    if (!rep.bioguideId) {
      this.addError('bioguideId', 'Missing bioguide ID', 'error');
    }

    if (!rep.name || rep.name.trim().length === 0) {
      this.addError('name', 'Missing representative name', 'error');
    }

    if (!rep.state || rep.state.length !== 2) {
      this.addError('state', 'Invalid state code', 'error');
    }

    if (!rep.chamber || !['House', 'Senate'].includes(rep.chamber)) {
      this.addError('chamber', 'Invalid chamber', 'error');
    }
  }

  /**
   * Validate party affiliation
   */
  private validatePartyAffiliation(rep: EnhancedRepresentative): void {
    const validParties = ['Democrat', 'Republican', 'Independent'];

    if (!rep.party) {
      this.addError('party', 'Missing party affiliation', 'error', rep.bioguideId, rep.name);
      return;
    }

    if (!validParties.includes(rep.party)) {
      this.addError('party', `Invalid party: ${rep.party}`, 'warning', rep.bioguideId, rep.name);
    }

    // Check for common data issues
    if (rep.party === 'Democratic') {
      this.addError(
        'party',
        'Party should be "Democrat" not "Democratic"',
        'warning',
        rep.bioguideId,
        rep.name
      );
    }
  }

  /**
   * Validate finance data
   */
  private validateFinanceData(
    rep: EnhancedRepresentative,
    financeData?: ValidationFinanceData
  ): void {
    if (!financeData) {
      return; // No finance data to validate
    }

    // Check for suspicious values
    if (financeData.totalRaised && financeData.totalRaised < 0) {
      this.addError(
        'finance.totalRaised',
        'Negative total raised amount',
        'error',
        rep.bioguideId,
        rep.name
      );
    }

    if (financeData.pacRatio && (financeData.pacRatio < 0 || financeData.pacRatio > 100)) {
      this.addError(
        'finance.pacRatio',
        'PAC ratio out of valid range (0-100)',
        'error',
        rep.bioguideId,
        rep.name
      );
    }

    if (financeData.smallDonors && (financeData.smallDonors < 0 || financeData.smallDonors > 100)) {
      this.addError(
        'finance.smallDonors',
        'Small donor percentage out of valid range (0-100)',
        'error',
        rep.bioguideId,
        rep.name
      );
    }

    // Check for hardcoded values
    if (financeData.topIndustry === 'Healthcare' && !financeData.rawData) {
      this.addError(
        'finance.topIndustry',
        'Potentially hardcoded industry value',
        'warning',
        rep.bioguideId,
        rep.name
      );
    }

    if (financeData.topCorporatePAC === 'Boeing PAC' && !financeData.rawData) {
      this.addError(
        'finance.topCorporatePAC',
        'Potentially hardcoded PAC value',
        'warning',
        rep.bioguideId,
        rep.name
      );
    }
  }

  /**
   * Validate voting data
   */
  private validateVotingData(rep: EnhancedRepresentative, votingData?: ValidationVotingData): void {
    if (!votingData) {
      return; // No voting data to validate
    }

    if (votingData.partySupport && (votingData.partySupport < 0 || votingData.partySupport > 100)) {
      this.addError(
        'votes.partySupport',
        'Party support percentage out of valid range (0-100)',
        'error',
        rep.bioguideId,
        rep.name
      );
    }

    if (votingData.attendance && (votingData.attendance < 0 || votingData.attendance > 100)) {
      this.addError(
        'votes.attendance',
        'Attendance percentage out of valid range (0-100)',
        'error',
        rep.bioguideId,
        rep.name
      );
    }

    if (votingData.missed && (votingData.missed < 0 || votingData.missed > 100)) {
      this.addError(
        'votes.missed',
        'Missed votes percentage out of valid range (0-100)',
        'error',
        rep.bioguideId,
        rep.name
      );
    }
  }

  /**
   * Validate against known representatives
   */
  private validateKnownRepresentatives(
    rep: EnhancedRepresentative,
    additionalData?: ValidationAdditionalData
  ): void {
    const knownRep = KNOWN_REPRESENTATIVES[rep.bioguideId];

    if (!knownRep) {
      return; // Not a known representative
    }

    // Validate party match
    if (rep.party !== knownRep.party) {
      this.addError(
        'party',
        `Party mismatch for ${knownRep.name}: got ${rep.party}, expected ${knownRep.party}`,
        'error',
        rep.bioguideId,
        rep.name
      );
    }

    // Validate state match
    if (rep.state !== knownRep.state) {
      this.addError(
        'state',
        `State mismatch for ${knownRep.name}: got ${rep.state}, expected ${knownRep.state}`,
        'error',
        rep.bioguideId,
        rep.name
      );
    }

    // Validate PAC refusal
    if (
      knownRep.refusesPACs &&
      additionalData?.finance?.pacRatio !== undefined &&
      additionalData.finance.pacRatio > 0
    ) {
      this.addError(
        'finance.pacRatio',
        `${knownRep.name} refuses PACs but showing ${additionalData.finance.pacRatio}% PAC donations`,
        'warning',
        rep.bioguideId,
        rep.name
      );
    }

    // Validate committees (only if expectedCommittees is defined)
    if (knownRep.expectedCommittees && rep.committees) {
      const repCommitteeNames = rep.committees.map(c => c.name);
      const hasExpectedCommittee = knownRep.expectedCommittees.some((expected: string) =>
        repCommitteeNames.some(actual => actual.includes(expected))
      );

      if (!hasExpectedCommittee) {
        this.addError(
          'committees',
          `${knownRep.name} missing expected committees: ${knownRep.expectedCommittees.join(', ')}`,
          'warning',
          rep.bioguideId,
          rep.name
        );
      }
    }
  }

  /**
   * Add validation error
   */
  private addError(
    field: string,
    message: string,
    severity: 'error' | 'warning',
    bioguideId?: string,
    repName?: string
  ): void {
    this.errors.push({
      field,
      message,
      severity,
      bioguideId,
      repName,
    });
  }

  /**
   * Get validation errors grouped by severity
   */
  static getErrorsBySeverity(errors: ValidationError[]): {
    errors: ValidationError[];
    warnings: ValidationError[];
  } {
    return {
      errors: errors.filter(e => e.severity === 'error'),
      warnings: errors.filter(e => e.severity === 'warning'),
    };
  }

  /**
   * Log validation errors to console
   */
  static logValidationErrors(errors: ValidationError[], context: string = 'Data Validation'): void {
    if (errors.length === 0) {
      // eslint-disable-next-line no-console
      console.log(`✅ ${context}: No validation errors found`);
      return;
    }

    const { errors: criticalErrors, warnings } = DataValidator.getErrorsBySeverity(errors);

    if (criticalErrors.length > 0) {
      // eslint-disable-next-line no-console
      console.error(`❌ ${context}: Critical errors found:`, criticalErrors);
    }

    if (warnings.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(`⚠️ ${context}: Warnings found:`, warnings);
    }
  }
}

export default DataValidator;
