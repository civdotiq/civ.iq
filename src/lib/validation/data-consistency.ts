/**
 * Data consistency validation for API responses
 * Ensures data integrity and consistency across different API endpoints
 */

import { structuredLogger } from '@/lib/logging/logger';

export interface ConsistencyRule<T = any> {
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
    data?: any;
  }>;
  warnings: number;
  errors: number;
}

export class DataConsistencyValidator {
  private rules: ConsistencyRule[] = [];

  addRule<T>(rule: ConsistencyRule<T>): void {
    this.rules.push(rule);
  }

  addRules<T>(rules: ConsistencyRule<T>[]): void {
    this.rules.push(...rules);
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
            data: context ? { context } : undefined
          });

          if (rule.severity === 'error') {
            errors++;
          } else if (rule.severity === 'warning') {
            warnings++;
          }
        }
      } catch (error) {
        structuredLogger.error('Data consistency rule evaluation failed', error as Error, {
          rule: rule.name,
          context
        });
        
        violations.push({
          rule: rule.name,
          message: `Rule evaluation failed: ${(error as Error).message}`,
          severity: 'error'
        });
        errors++;
      }
    }

    const result: ConsistencyResult = {
      isValid: errors === 0,
      violations,
      warnings,
      errors
    };

    // Log consistency check results
    if (violations.length > 0) {
      structuredLogger.warn('Data consistency violations detected', {
        context,
        violations: violations.length,
        errors,
        warnings,
        rules: violations.map(v => v.rule)
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
    check: (rep: any) => {
      return typeof rep.bioguideId === 'string' && /^[A-Z]\d{6}$/.test(rep.bioguideId);
    },
    message: 'Bioguide ID must be in format: 1 letter followed by 6 digits',
    severity: 'error'
  },
  {
    name: 'required_fields',
    check: (rep: any) => {
      const required = ['bioguideId', 'name', 'state', 'party', 'chamber'];
      return required.every(field => rep[field] !== undefined && rep[field] !== null && rep[field] !== '');
    },
    message: 'Representative must have all required fields: bioguideId, name, state, party, chamber',
    severity: 'error'
  },
  {
    name: 'chamber_values',
    check: (rep: any) => {
      return ['House', 'Senate'].includes(rep.chamber);
    },
    message: 'Chamber must be either "House" or "Senate"',
    severity: 'error'
  },
  {
    name: 'state_abbreviation',
    check: (rep: any) => {
      const validStates = [
        'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
        'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
        'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
        'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
        'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
      ];
      return validStates.includes(rep.state);
    },
    message: 'State must be a valid two-letter abbreviation',
    severity: 'error'
  },
  {
    name: 'district_consistency',
    check: (rep: any) => {
      // Senate members should have null district, House members should have a district
      if (rep.chamber === 'Senate') {
        return rep.district === null || rep.district === undefined;
      } else if (rep.chamber === 'House') {
        return rep.district !== null && rep.district !== undefined && rep.district !== '';
      }
      return true;
    },
    message: 'District field should be null for Senate and non-null for House members',
    severity: 'warning'
  },
  {
    name: 'party_values',
    check: (rep: any) => {
      const commonParties = ['Democratic', 'Republican', 'Independent', 'Democrat', 'GOP'];
      return typeof rep.party === 'string' && rep.party.length > 0;
    },
    message: 'Party should be a non-empty string',
    severity: 'warning'
  },
  {
    name: 'contact_info_structure',
    check: (rep: any) => {
      if (!rep.contactInfo) return false;
      return typeof rep.contactInfo === 'object' && 
             'phone' in rep.contactInfo && 
             'website' in rep.contactInfo;
    },
    message: 'Contact info should include phone and website fields',
    severity: 'warning'
  }
];

export const BillConsistencyRules: ConsistencyRule[] = [
  {
    name: 'bill_identifier_format',
    check: (bill: any) => {
      return typeof bill.billNumber === 'string' && 
             /^(HR|H\.R\.|S|S\.|HB|SB)\s*\d+$/.test(bill.billNumber.replace(/\s+/g, ' '));
    },
    message: 'Bill number must follow standard format (e.g., HR 1234, S 567)',
    severity: 'error'
  },
  {
    name: 'required_bill_fields',
    check: (bill: any) => {
      const required = ['id', 'billNumber', 'title', 'chamber', 'status'];
      return required.every(field => bill[field] !== undefined && bill[field] !== null && bill[field] !== '');
    },
    message: 'Bill must have all required fields: id, billNumber, title, chamber, status',
    severity: 'error'
  },
  {
    name: 'bill_status_values',
    check: (bill: any) => {
      const validStatuses = [
        'introduced', 'committee', 'floor', 'passed_chamber', 
        'other_chamber', 'passed_both', 'signed', 'vetoed', 'dead'
      ];
      return validStatuses.includes(bill.status);
    },
    message: 'Bill status must be a valid legislative status',
    severity: 'error'
  },
  {
    name: 'sponsor_structure',
    check: (bill: any) => {
      if (!bill.sponsor) return false;
      return typeof bill.sponsor === 'object' && 
             'name' in bill.sponsor && 
             'party' in bill.sponsor &&
             bill.sponsor.name && bill.sponsor.name.length > 0;
    },
    message: 'Bill sponsor should include name and party',
    severity: 'warning'
  },
  {
    name: 'date_consistency',
    check: (bill: any) => {
      if (!bill.introducedDate || !bill.lastActionDate) return true;
      
      const introduced = new Date(bill.introducedDate);
      const lastAction = new Date(bill.lastActionDate);
      
      return introduced <= lastAction;
    },
    message: 'Last action date should not be before introduced date',
    severity: 'warning'
  }
];

export const LegislatorConsistencyRules: ConsistencyRule[] = [
  {
    name: 'legislator_required_fields',
    check: (leg: any) => {
      const required = ['id', 'name', 'party', 'chamber', 'district'];
      return required.every(field => leg[field] !== undefined && leg[field] !== null);
    },
    message: 'Legislator must have all required fields: id, name, party, chamber, district',
    severity: 'error'
  },
  {
    name: 'legislator_chamber_values',
    check: (leg: any) => {
      return ['upper', 'lower'].includes(leg.chamber);
    },
    message: 'Legislator chamber must be either "upper" or "lower"',
    severity: 'error'
  },
  {
    name: 'contact_email_format',
    check: (leg: any) => {
      if (!leg.email) return true; // Email is optional
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(leg.email);
    },
    message: 'Email address format is invalid',
    severity: 'warning'
  },
  {
    name: 'phone_format',
    check: (leg: any) => {
      if (!leg.phone) return true; // Phone is optional
      // Allow various phone number formats
      const phoneRegex = /^[\+]?[\d\s\-\(\)\.]{10,}$/;
      return phoneRegex.test(leg.phone);
    },
    message: 'Phone number format appears invalid',
    severity: 'info'
  }
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
    errors: totalErrors
  };
}

// Export default validators
export const defaultRepresentativeValidator = createRepresentativeValidator();
export const defaultBillValidator = createBillValidator();
export const defaultLegislatorValidator = createLegislatorValidator();