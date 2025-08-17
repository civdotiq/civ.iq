/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Data consistency validation for API responses
 * Ensures data integrity and consistency across different API endpoints
 */

import logger from '@/lib/logging/simple-logger';

// Type definitions for validation data structures
interface RepresentativeData {
  bioguideId: string;
  name: string;
  state: string;
  party: string;
  chamber: string;
  district?: string | null;
  contactInfo?: {
    phone: string;
    website: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface BillData {
  id: string;
  billNumber: string;
  title: string;
  chamber: string;
  status: string;
  sponsor?: {
    name: string;
    party: string;
    [key: string]: unknown;
  };
  introducedDate?: string;
  lastActionDate?: string;
  [key: string]: unknown;
}

interface LegislatorData {
  id: string;
  name: string;
  party: string;
  chamber: string;
  district: string;
  email?: string;
  phone?: string;
  [key: string]: unknown;
}

export interface ConsistencyRule<T = unknown> {
  name: string;
  check: (data: T) => boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ConsistencyResult {
  isValid: boolean;
  violations: Array<{
    rule: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
    data?: unknown;
  }>;
  warnings: number;
  errors: number;
}

export class DataConsistencyValidator {
  private rules: ConsistencyRule<unknown>[] = [];

  addRule<T>(rule: ConsistencyRule<T>): void {
    this.rules.push(rule as ConsistencyRule<unknown>);
  }

  addRules<T>(rules: ConsistencyRule<T>[]): void {
    this.rules.push(...(rules as ConsistencyRule<unknown>[]));
  }

  validate<T>(data: T, context?: string): ConsistencyResult {
    const violations: ConsistencyResult['violations'] = [];
    let warnings = 0;
    let errors = 0;

    for (const rule of this.rules) {
      try {
        const isValid = rule.check(data);

        if (!isValid) {
          violations.push({
            rule: rule.name,
            message: rule.message,
            severity: rule.severity,
            data: context ? { context } : undefined,
          });

          if (rule.severity === 'error') {
            errors++;
          } else if (rule.severity === 'warning') {
            warnings++;
          }
        }
      } catch (error) {
        logger.error('Data consistency rule evaluation failed', error as Error, {
          rule: rule.name,
          context,
        });

        violations.push({
          rule: rule.name,
          message: `Rule evaluation failed: ${(error as Error).message}`,
          severity: 'error',
        });
        errors++;
      }
    }

    const result: ConsistencyResult = {
      isValid: errors === 0,
      violations,
      warnings,
      errors,
    };

    // Log consistency check results
    if (violations.length > 0) {
      logger.warn('Data consistency violations detected', {
        context,
        violations: violations.length,
        errors,
        warnings,
        rules: violations.map(v => v.rule),
      });
    }

    return result;
  }

  clear(): void {
    this.rules = [];
  }
}

// Pre-defined consistency rules for common data types

export const RepresentativeConsistencyRules: ConsistencyRule[] = [
  {
    name: 'bioguide_id_format',
    check: (rep: unknown) => {
      if (!rep || typeof rep !== 'object') return false;
      const typedRep = rep as RepresentativeData;
      return typeof typedRep.bioguideId === 'string' && /^[A-Z]\d{6}$/.test(typedRep.bioguideId);
    },
    message: 'Bioguide ID must be in format: 1 letter followed by 6 digits',
    severity: 'error',
  },
  {
    name: 'required_fields',
    check: (rep: unknown) => {
      if (!rep || typeof rep !== 'object') return false;
      const typedRep = rep as RepresentativeData;
      const required = ['bioguideId', 'name', 'state', 'party', 'chamber'];
      return required.every(
        field => typedRep[field] !== undefined && typedRep[field] !== null && typedRep[field] !== ''
      );
    },
    message:
      'Representative must have all required fields: bioguideId, name, state, party, chamber',
    severity: 'error',
  },
  {
    name: 'chamber_values',
    check: (rep: unknown) => {
      if (!rep || typeof rep !== 'object') return false;
      const typedRep = rep as RepresentativeData;
      return ['House', 'Senate'].includes(typedRep.chamber);
    },
    message: 'Chamber must be either "House" or "Senate"',
    severity: 'error',
  },
  {
    name: 'state_abbreviation',
    check: (rep: unknown) => {
      const validStates = [
        'AL',
        'AK',
        'AZ',
        'AR',
        'CA',
        'CO',
        'CT',
        'DE',
        'FL',
        'GA',
        'HI',
        'ID',
        'IL',
        'IN',
        'IA',
        'KS',
        'KY',
        'LA',
        'ME',
        'MD',
        'MA',
        'MI',
        'MN',
        'MS',
        'MO',
        'MT',
        'NE',
        'NV',
        'NH',
        'NJ',
        'NM',
        'NY',
        'NC',
        'ND',
        'OH',
        'OK',
        'OR',
        'PA',
        'RI',
        'SC',
        'SD',
        'TN',
        'TX',
        'UT',
        'VT',
        'VA',
        'WA',
        'WV',
        'WI',
        'WY',
        'DC',
      ];
      if (!rep || typeof rep !== 'object') return false;
      const typedRep = rep as RepresentativeData;
      return validStates.includes(typedRep.state);
    },
    message: 'State must be a valid two-letter abbreviation',
    severity: 'error',
  },
  {
    name: 'district_consistency',
    check: (rep: unknown) => {
      if (!rep || typeof rep !== 'object') return false;
      const typedRep = rep as RepresentativeData;
      // Senate members should have null district, House members should have a district
      if (typedRep.chamber === 'Senate') {
        return typedRep.district === null || typedRep.district === undefined;
      } else if (typedRep.chamber === 'House') {
        return (
          typedRep.district !== null && typedRep.district !== undefined && typedRep.district !== ''
        );
      }
      return true;
    },
    message: 'District field should be null for Senate and non-null for House members',
    severity: 'warning',
  },
  {
    name: 'party_values',
    check: (rep: unknown) => {
      if (!rep || typeof rep !== 'object') return false;
      const typedRep = rep as RepresentativeData;
      return typeof typedRep.party === 'string' && typedRep.party.length > 0;
    },
    message: 'Party should be a non-empty string',
    severity: 'warning',
  },
  {
    name: 'contact_info_structure',
    check: (rep: unknown) => {
      if (!rep || typeof rep !== 'object') return false;
      const typedRep = rep as RepresentativeData;
      if (!typedRep.contactInfo) return false;
      return (
        typeof typedRep.contactInfo === 'object' &&
        'phone' in typedRep.contactInfo &&
        'website' in typedRep.contactInfo
      );
    },
    message: 'Contact info should include phone and website fields',
    severity: 'warning',
  },
];

export const BillConsistencyRules: ConsistencyRule[] = [
  {
    name: 'bill_identifier_format',
    check: (bill: unknown) => {
      if (!bill || typeof bill !== 'object') return false;
      const typedBill = bill as BillData;
      return (
        typeof typedBill.billNumber === 'string' &&
        /^(HR|H\.R\.|S|S\.|HB|SB)\s*\d+$/.test(typedBill.billNumber.replace(/\s+/g, ' '))
      );
    },
    message: 'Bill number must follow standard format (e.g., HR 1234, S 567)',
    severity: 'error',
  },
  {
    name: 'required_bill_fields',
    check: (bill: unknown) => {
      if (!bill || typeof bill !== 'object') return false;
      const typedBill = bill as BillData;
      const required = ['id', 'billNumber', 'title', 'chamber', 'status'];
      return required.every(
        field =>
          typedBill[field] !== undefined && typedBill[field] !== null && typedBill[field] !== ''
      );
    },
    message: 'Bill must have all required fields: id, billNumber, title, chamber, status',
    severity: 'error',
  },
  {
    name: 'bill_status_values',
    check: (bill: unknown) => {
      const validStatuses = [
        'introduced',
        'committee',
        'floor',
        'passed_chamber',
        'other_chamber',
        'passed_both',
        'signed',
        'vetoed',
        'dead',
      ];
      if (!bill || typeof bill !== 'object') return false;
      const typedBill = bill as BillData;
      return validStatuses.includes(typedBill.status);
    },
    message: 'Bill status must be a valid legislative status',
    severity: 'error',
  },
  {
    name: 'sponsor_structure',
    check: (bill: unknown) => {
      if (!bill || typeof bill !== 'object') return false;
      const typedBill = bill as BillData;
      if (!typedBill.sponsor) return false;
      return Boolean(
        typeof typedBill.sponsor === 'object' &&
          'name' in typedBill.sponsor &&
          'party' in typedBill.sponsor &&
          typedBill.sponsor.name &&
          typeof typedBill.sponsor.name === 'string' &&
          typedBill.sponsor.name.length > 0
      );
    },
    message: 'Bill sponsor should include name and party',
    severity: 'warning',
  },
  {
    name: 'date_consistency',
    check: (bill: unknown) => {
      if (!bill || typeof bill !== 'object') return true;
      const typedBill = bill as BillData;
      if (!typedBill.introducedDate || !typedBill.lastActionDate) return true;

      const introduced = new Date(typedBill.introducedDate);
      const lastAction = new Date(typedBill.lastActionDate);

      return introduced <= lastAction;
    },
    message: 'Last action date should not be before introduced date',
    severity: 'warning',
  },
];

export const LegislatorConsistencyRules: ConsistencyRule[] = [
  {
    name: 'legislator_required_fields',
    check: (leg: unknown) => {
      if (!leg || typeof leg !== 'object') return false;
      const typedLeg = leg as LegislatorData;
      const required = ['id', 'name', 'party', 'chamber', 'district'];
      return required.every(field => typedLeg[field] !== undefined && typedLeg[field] !== null);
    },
    message: 'Legislator must have all required fields: id, name, party, chamber, district',
    severity: 'error',
  },
  {
    name: 'legislator_chamber_values',
    check: (leg: unknown) => {
      if (!leg || typeof leg !== 'object') return false;
      const typedLeg = leg as LegislatorData;
      return ['upper', 'lower'].includes(typedLeg.chamber);
    },
    message: 'Legislator chamber must be either "upper" or "lower"',
    severity: 'error',
  },
  {
    name: 'contact_email_format',
    check: (leg: unknown) => {
      if (!leg || typeof leg !== 'object') return true;
      const typedLeg = leg as LegislatorData;
      if (!typedLeg.email) return true; // Email is optional
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(typedLeg.email);
    },
    message: 'Email address format is invalid',
    severity: 'warning',
  },
  {
    name: 'phone_format',
    check: (leg: unknown) => {
      if (!leg || typeof leg !== 'object') return true;
      const typedLeg = leg as LegislatorData;
      if (!typedLeg.phone) return true; // Phone is optional
      // Allow various phone number formats
      const phoneRegex = /^[\+]?[\d\s\-\(\)\.]{10,}$/;
      return phoneRegex.test(typedLeg.phone);
    },
    message: 'Phone number format appears invalid',
    severity: 'info',
  },
];

// Factory function to create validators for specific data types
export function createRepresentativeValidator(): DataConsistencyValidator {
  const validator = new DataConsistencyValidator();
  validator.addRules(RepresentativeConsistencyRules);
  return validator;
}

export function createBillValidator(): DataConsistencyValidator {
  const validator = new DataConsistencyValidator();
  validator.addRules(BillConsistencyRules);
  return validator;
}

export function createLegislatorValidator(): DataConsistencyValidator {
  const validator = new DataConsistencyValidator();
  validator.addRules(LegislatorConsistencyRules);
  return validator;
}

// Utility function to validate arrays of data
export function validateDataArray<T>(
  data: T[],
  validator: DataConsistencyValidator,
  context?: string
): ConsistencyResult {
  const allViolations: ConsistencyResult['violations'] = [];
  let totalWarnings = 0;
  let totalErrors = 0;

  data.forEach((item, index) => {
    const result = validator.validate(item, `${context || 'item'} ${index}`);
    allViolations.push(...result.violations);
    totalWarnings += result.warnings;
    totalErrors += result.errors;
  });

  return {
    isValid: totalErrors === 0,
    violations: allViolations,
    warnings: totalWarnings,
    errors: totalErrors,
  };
}

// Export default validators
export const defaultRepresentativeValidator = createRepresentativeValidator();
export const defaultBillValidator = createBillValidator();
export const defaultLegislatorValidator = createLegislatorValidator();
