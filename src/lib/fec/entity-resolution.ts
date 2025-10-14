/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * FEC Entity Resolution & Name Standardization
 *
 * Handles entity matching, name normalization, and deduplication for:
 * - Individual contributors with name variants (JOHN SMITH vs John Smith vs J. Smith)
 * - Organizations/employers with variations (GOOGLE INC. vs Google Inc vs Google)
 * - Recipients/disbursement entities (consulting firms, vendors)
 *
 * Uses string similarity algorithms and business rule heuristics to match entities.
 */

import logger from '@/lib/logging/simple-logger';

/**
 * Standardized entity record with normalized name and metadata
 */
export interface StandardizedEntity {
  normalizedName: string; // Canonical form for matching
  displayName: string; // Human-readable form
  rawVariants: string[]; // All original name variations
  entityType: 'individual' | 'organization' | 'unknown';
  metadata: {
    employer?: string;
    occupation?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
}

/**
 * Entity aggregation with deduplication
 */
export interface AggregatedEntity extends StandardizedEntity {
  totalAmount: number;
  transactionCount: number;
  transactions: Array<{
    amount: number;
    date: string;
    rawName: string;
  }>;
}

/**
 * Remove common noise from names for better matching
 */
function cleanNameForMatching(name: string): string {
  return (
    name
      .trim()
      .toUpperCase()
      // Remove common suffixes
      .replace(/\s+(INC\.?|LLC\.?|LLP\.?|CORP\.?|CORPORATION|COMPANY|CO\.?|LTD\.?)$/i, '')
      // Remove punctuation except spaces
      .replace(/[^\w\s]/g, '')
      // Normalize multiple spaces
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Standardize individual names to canonical form
 * Handles: LAST, FIRST MIDDLE -> First Middle Last
 */
function standardizeIndividualName(name: string): string {
  const cleaned = name.trim();

  // Check if name is in "LAST, FIRST" format
  if (cleaned.includes(',')) {
    const parts = cleaned.split(',').map(p => p.trim());
    if (parts.length === 2) {
      const [last, first] = parts;
      return `${first} ${last}`.replace(/\s+/g, ' ').trim();
    }
  }

  // Already in "First Last" format
  return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * Calculate Levenshtein distance for string similarity
 * Used to detect typos and minor variations
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0]![j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1, // substitution
          matrix[i]![j - 1]! + 1, // insertion
          matrix[i - 1]![j]! + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length]![a.length]!;
}

/**
 * Calculate similarity ratio between two strings (0-1)
 */
function similarityRatio(a: string, b: string): number {
  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  return maxLength === 0 ? 1 : 1 - distance / maxLength;
}

/**
 * Detect if name represents an individual or organization
 */
function detectEntityType(name: string): 'individual' | 'organization' | 'unknown' {
  const cleaned = name.toUpperCase();

  // Organization indicators
  const orgIndicators = [
    'INC',
    'LLC',
    'LLP',
    'CORP',
    'CORPORATION',
    'COMPANY',
    'CO',
    'LTD',
    'PARTNERSHIP',
    'COMMITTEE',
    'PAC',
    'FUND',
    'FOUNDATION',
    'ASSOCIATION',
    'SOCIETY',
    'INSTITUTE',
    'COUNCIL',
    'GROUP',
  ];

  if (orgIndicators.some(indicator => cleaned.includes(indicator))) {
    return 'organization';
  }

  // Individual indicators (comma-separated name format)
  if (cleaned.includes(',')) {
    return 'individual';
  }

  // Count words - individuals typically have 2-4 words
  const wordCount = cleaned.split(/\s+/).length;
  if (wordCount >= 2 && wordCount <= 4) {
    return 'individual';
  }

  return 'unknown';
}

/**
 * Check if two entities should be considered the same based on name similarity
 * and metadata matching
 */
export function entitiesMatch(
  entity1: {
    name: string;
    employer?: string;
    city?: string;
    state?: string;
    zip?: string;
  },
  entity2: {
    name: string;
    employer?: string;
    city?: string;
    state?: string;
    zip?: string;
  },
  threshold: number = 0.85
): boolean {
  const name1 = cleanNameForMatching(entity1.name);
  const name2 = cleanNameForMatching(entity2.name);

  // Exact match
  if (name1 === name2) {
    return true;
  }

  // Calculate similarity
  const similarity = similarityRatio(name1, name2);

  // High similarity threshold for base match
  if (similarity < threshold) {
    return false;
  }

  // Additional metadata checks to confirm match
  let metadataMatches = 0;
  let metadataChecks = 0;

  // Check employer match (for individuals)
  if (entity1.employer && entity2.employer) {
    metadataChecks++;
    const emp1 = cleanNameForMatching(entity1.employer);
    const emp2 = cleanNameForMatching(entity2.employer);
    if (emp1 === emp2 || similarityRatio(emp1, emp2) > 0.8) {
      metadataMatches++;
    }
  }

  // Check location match
  if (entity1.state && entity2.state) {
    metadataChecks++;
    if (entity1.state.toUpperCase() === entity2.state.toUpperCase()) {
      metadataMatches++;

      // Same city is strong confirmation
      if (entity1.city && entity2.city) {
        metadataChecks++;
        const city1 = cleanNameForMatching(entity1.city);
        const city2 = cleanNameForMatching(entity2.city);
        if (city1 === city2) {
          metadataMatches++;
        }
      }
    }
  }

  // If we have metadata, require at least 50% match
  if (metadataChecks > 0) {
    return metadataMatches / metadataChecks >= 0.5;
  }

  // No metadata, rely on name similarity
  return similarity >= threshold;
}

/**
 * Normalize a single entity name and metadata
 */
export function normalizeEntity(
  name: string,
  metadata?: {
    employer?: string;
    occupation?: string;
    city?: string;
    state?: string;
    zip?: string;
  }
): StandardizedEntity {
  const entityType = detectEntityType(name);

  let displayName: string;
  let normalizedName: string;

  if (entityType === 'individual') {
    displayName = standardizeIndividualName(name);
    normalizedName = cleanNameForMatching(displayName);
  } else {
    displayName = name.trim();
    normalizedName = cleanNameForMatching(name);
  }

  return {
    normalizedName,
    displayName,
    rawVariants: [name],
    entityType,
    metadata: metadata || {},
  };
}

/**
 * Deduplicate and aggregate contributions by entity
 */
export function deduplicateContributions(
  contributions: Array<{
    contributor_name: string;
    contributor_employer?: string;
    contributor_occupation?: string;
    contributor_city?: string;
    contributor_state?: string;
    contributor_zip?: string;
    contribution_receipt_amount: number;
    contribution_receipt_date: string;
  }>
): AggregatedEntity[] {
  const entityMap = new Map<string, AggregatedEntity>();

  logger.debug(`[Entity Resolution] Deduplicating ${contributions.length} contributions`);

  for (const contrib of contributions) {
    if (!contrib.contributor_name?.trim()) {
      continue;
    }

    const metadata = {
      employer: contrib.contributor_employer,
      occupation: contrib.contributor_occupation,
      city: contrib.contributor_city,
      state: contrib.contributor_state,
      zip: contrib.contributor_zip,
    };

    const normalized = normalizeEntity(contrib.contributor_name, metadata);

    // Check if we already have a matching entity
    let matchedKey: string | null = null;

    for (const [key, existing] of entityMap.entries()) {
      if (
        entitiesMatch(
          {
            name: normalized.normalizedName,
            employer: metadata.employer,
            city: metadata.city,
            state: metadata.state,
            zip: metadata.zip,
          },
          {
            name: existing.normalizedName,
            employer: existing.metadata.employer,
            city: existing.metadata.city,
            state: existing.metadata.state,
            zip: existing.metadata.zip,
          }
        )
      ) {
        matchedKey = key;
        break;
      }
    }

    if (matchedKey) {
      // Add to existing entity
      const existing = entityMap.get(matchedKey)!;
      existing.totalAmount += contrib.contribution_receipt_amount;
      existing.transactionCount++;
      existing.transactions.push({
        amount: contrib.contribution_receipt_amount,
        date: contrib.contribution_receipt_date,
        rawName: contrib.contributor_name,
      });

      // Add variant if not already present
      if (!existing.rawVariants.includes(contrib.contributor_name)) {
        existing.rawVariants.push(contrib.contributor_name);
      }

      // Update metadata if more complete
      if (!existing.metadata.employer && metadata.employer) {
        existing.metadata.employer = metadata.employer;
      }
      if (!existing.metadata.occupation && metadata.occupation) {
        existing.metadata.occupation = metadata.occupation;
      }
    } else {
      // Create new entity
      entityMap.set(normalized.normalizedName, {
        ...normalized,
        totalAmount: contrib.contribution_receipt_amount,
        transactionCount: 1,
        transactions: [
          {
            amount: contrib.contribution_receipt_amount,
            date: contrib.contribution_receipt_date,
            rawName: contrib.contributor_name,
          },
        ],
      });
    }
  }

  const result = Array.from(entityMap.values());
  logger.debug(
    `[Entity Resolution] Deduplicated ${contributions.length} contributions into ${result.length} unique entities`
  );

  return result;
}

/**
 * Deduplicate and aggregate disbursements by recipient
 */
export function deduplicateDisbursements(
  disbursements: Array<{
    recipient_name: string;
    recipient_city?: string;
    recipient_state?: string;
    disbursement_amount: number;
    disbursement_date: string;
    disbursement_description?: string;
  }>
): AggregatedEntity[] {
  const entityMap = new Map<string, AggregatedEntity>();

  logger.debug(`[Entity Resolution] Deduplicating ${disbursements.length} disbursements`);

  for (const disb of disbursements) {
    if (!disb.recipient_name?.trim()) {
      continue;
    }

    const metadata = {
      city: disb.recipient_city,
      state: disb.recipient_state,
    };

    const normalized = normalizeEntity(disb.recipient_name, metadata);

    // Check if we already have a matching entity
    let matchedKey: string | null = null;

    for (const [key, existing] of entityMap.entries()) {
      if (
        entitiesMatch(
          {
            name: normalized.normalizedName,
            city: metadata.city,
            state: metadata.state,
          },
          {
            name: existing.normalizedName,
            city: existing.metadata.city,
            state: existing.metadata.state,
          }
        )
      ) {
        matchedKey = key;
        break;
      }
    }

    if (matchedKey) {
      // Add to existing entity
      const existing = entityMap.get(matchedKey)!;
      existing.totalAmount += disb.disbursement_amount;
      existing.transactionCount++;
      existing.transactions.push({
        amount: disb.disbursement_amount,
        date: disb.disbursement_date,
        rawName: disb.recipient_name,
      });

      // Add variant if not already present
      if (!existing.rawVariants.includes(disb.recipient_name)) {
        existing.rawVariants.push(disb.recipient_name);
      }
    } else {
      // Create new entity
      entityMap.set(normalized.normalizedName, {
        ...normalized,
        totalAmount: disb.disbursement_amount,
        transactionCount: 1,
        transactions: [
          {
            amount: disb.disbursement_amount,
            date: disb.disbursement_date,
            rawName: disb.recipient_name,
          },
        ],
      });
    }
  }

  const result = Array.from(entityMap.values());
  logger.debug(
    `[Entity Resolution] Deduplicated ${disbursements.length} disbursements into ${result.length} unique entities`
  );

  return result;
}

/**
 * Standardize employer/organization names for industry analysis
 */
export function standardizeEmployerName(employer: string): string {
  const cleaned = employer.trim();
  const entityType = detectEntityType(cleaned);

  if (entityType === 'organization') {
    // Return cleaned form without corporate suffixes
    return cleanNameForMatching(cleaned)
      .split(' ')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }

  // Keep original for individuals or unknown
  return cleaned;
}
