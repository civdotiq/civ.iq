/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

export type InputType = 'zip' | 'zip_plus_4' | 'address' | 'ambiguous';

export interface ClassificationResult {
  type: InputType;
  confidence: number;
  normalizedInput: string;
  components?: {
    zip?: string;
    zipPlus4?: string;
    street?: string;
    city?: string;
    state?: string;
  };
}

// Common street suffixes
const STREET_INDICATORS = [
  'street', 'st', 'avenue', 'ave', 'road', 'rd', 'boulevard', 'blvd',
  'lane', 'ln', 'drive', 'dr', 'court', 'ct', 'place', 'pl',
  'square', 'sq', 'plaza', 'parkway', 'pkwy', 'highway', 'hwy',
  'way', 'circle', 'cir', 'loop', 'trail', 'terrace', 'ter'
];

// Common apartment/unit indicators
const UNIT_INDICATORS = [
  'apt', 'apartment', 'suite', 'ste', 'unit', 'room', 'rm',
  'floor', 'fl', '#'
];

// US state abbreviations
const STATE_ABBREVIATIONS = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'PR', 'VI', 'GU', 'AS'
];

/**
 * Classify user input to determine search type
 */
export function classifyInput(input: string): ClassificationResult {
  const normalizedInput = normalizeInput(input);
  
  // Check for ZIP code patterns first (most specific)
  const zipResult = checkZipPattern(normalizedInput);
  if (zipResult.isZip) {
    return {
      type: zipResult.isPlus4 ? 'zip_plus_4' : 'zip',
      confidence: 1.0,
      normalizedInput,
      components: {
        zip: zipResult.zip,
        zipPlus4: zipResult.plus4
      }
    };
  }
  
  // Check for address indicators
  const addressScore = calculateAddressScore(normalizedInput);
  if (addressScore > 0.7) {
    const components = extractAddressComponents(normalizedInput);
    return {
      type: 'address',
      confidence: addressScore,
      normalizedInput,
      components
    };
  }
  
  // Check if it might be a partial address or ambiguous
  if (addressScore > 0.3) {
    return {
      type: 'ambiguous',
      confidence: addressScore,
      normalizedInput
    };
  }
  
  // Default to ambiguous
  return {
    type: 'ambiguous',
    confidence: 0.0,
    normalizedInput
  };
}

/**
 * Normalize input for processing
 */
function normalizeInput(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/['''`]/g, "'") // Normalize quotes
    .replace(/[""]/g, '"') // Normalize double quotes
    .toLowerCase();
}

/**
 * Check if input matches ZIP code pattern
 */
function checkZipPattern(input: string): {
  isZip: boolean;
  isPlus4: boolean;
  zip?: string;
  plus4?: string;
} {
  // Remove all non-digit characters for ZIP checking
  const digitsOnly = input.replace(/\D/g, '');
  
  // Check for 5-digit ZIP
  if (/^\d{5}$/.test(digitsOnly)) {
    return {
      isZip: true,
      isPlus4: false,
      zip: digitsOnly
    };
  }
  
  // Check for ZIP+4 (9 digits total)
  if (/^\d{9}$/.test(digitsOnly)) {
    return {
      isZip: true,
      isPlus4: true,
      zip: digitsOnly.substring(0, 5),
      plus4: digitsOnly.substring(5)
    };
  }
  
  // Check for formatted ZIP+4 patterns
  const zipPlus4Match = input.match(/(\d{5})[\s-]?(\d{4})/);
  if (zipPlus4Match) {
    return {
      isZip: true,
      isPlus4: true,
      zip: zipPlus4Match[1],
      plus4: zipPlus4Match[2]
    };
  }
  
  return { isZip: false, isPlus4: false };
}

/**
 * Calculate score indicating likelihood of address
 */
function calculateAddressScore(input: string): number {
  let score = 0;
  const words = input.split(' ');
  
  // Check for street number at beginning
  if (/^\d+/.test(input)) {
    score += 0.3;
  }
  
  // Check for street indicators
  const hasStreetIndicator = STREET_INDICATORS.some(indicator =>
    words.some(word => word === indicator || word === indicator + '.')
  );
  if (hasStreetIndicator) {
    score += 0.3;
  }
  
  // Check for state abbreviation
  const hasState = STATE_ABBREVIATIONS.some(state =>
    words.some(word => word.toUpperCase() === state)
  );
  if (hasState) {
    score += 0.2;
  }
  
  // Check for comma (typical address separator)
  if (input.includes(',')) {
    score += 0.1;
  }
  
  // Check for unit/apartment indicators
  const hasUnit = UNIT_INDICATORS.some(indicator =>
    words.some(word => word === indicator || word === indicator + '.')
  );
  if (hasUnit) {
    score += 0.1;
  }
  
  // Bonus for having multiple indicators
  if (score >= 0.5 && words.length >= 3) {
    score += 0.1;
  }
  
  return Math.min(score, 1.0);
}

/**
 * Extract address components from input
 */
function extractAddressComponents(input: string): ClassificationResult['components'] {
  const components: ClassificationResult['components'] = {};
  
  // Extract ZIP if present
  const zipMatch = input.match(/\b(\d{5})(-\d{4})?\b/);
  if (zipMatch) {
    components.zip = zipMatch[1];
    if (zipMatch[2]) {
      components.zipPlus4 = zipMatch[2].substring(1);
    }
  }
  
  // Extract state
  const words = input.split(/[\s,]+/);
  const stateIndex = words.findIndex(word => 
    STATE_ABBREVIATIONS.includes(word.toUpperCase())
  );
  if (stateIndex !== -1) {
    components.state = words[stateIndex].toUpperCase();
  }
  
  // Try to identify city (word before state)
  if (stateIndex > 0) {
    components.city = words[stateIndex - 1];
  }
  
  // Rest is likely street address
  let streetEnd = stateIndex > 0 ? stateIndex - 1 : words.length;
  if (components.zip) {
    const zipIndex = words.findIndex(w => w.includes(components.zip!));
    if (zipIndex !== -1 && zipIndex < streetEnd) {
      streetEnd = zipIndex;
    }
  }
  
  if (streetEnd > 0) {
    components.street = words.slice(0, streetEnd).join(' ');
  }
  
  return components;
}

/**
 * Suggest corrections for common input errors
 */
export function suggestCorrections(input: string, classification: ClassificationResult): string[] {
  const suggestions: string[] = [];
  
  if (classification.type === 'ambiguous') {
    // Check if it looks like a partial ZIP
    const digits = input.replace(/\D/g, '');
    if (digits.length === 4) {
      suggestions.push(`Did you mean to enter a 5-digit ZIP code?`);
    } else if (digits.length === 3) {
      suggestions.push(`ZIP codes are 5 digits. Try entering more digits.`);
    }
    
    // Check if missing state
    if (input.includes(',') && !classification.components?.state) {
      suggestions.push(`Try adding the state abbreviation (e.g., MI, CA, NY)`);
    }
    
    // Check if missing comma
    if (!input.includes(',') && input.split(' ').length > 3) {
      suggestions.push(`Try adding a comma between street and city`);
    }
  }
  
  return suggestions;
}

/**
 * Format input based on classification
 */
export function formatInput(input: string, classification: ClassificationResult): string {
  switch (classification.type) {
    case 'zip':
      return classification.components?.zip || input;
      
    case 'zip_plus_4':
      const { zip, zipPlus4 } = classification.components || {};
      return zip && zipPlus4 ? `${zip}-${zipPlus4}` : input;
      
    case 'address':
      // Capitalize appropriately
      const parts = input.split(',').map(part => {
        const trimmed = part.trim();
        // Capitalize state if it's 2 letters
        if (trimmed.length === 2 && STATE_ABBREVIATIONS.includes(trimmed.toUpperCase())) {
          return trimmed.toUpperCase();
        }
        // Title case for other parts
        return trimmed.split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      });
      return parts.join(', ');
      
    default:
      return input;
  }
}