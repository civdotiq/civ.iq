/**
 * Entity Recognition Service
 *
 * Identifies political entities (representatives, bills, committees, donors) in text
 * and provides utilities for linking and tracking connections.
 */

export interface EntityMatch {
  type: 'representative' | 'bill' | 'committee' | 'donor';
  text: string;
  id: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
}

// Patterns for recognizing different entity types
const ENTITY_PATTERNS = {
  // Representative patterns
  representative: [
    // "Rep. John Smith", "Senator Jane Doe"
    /\b(Rep\.|Representative|Sen\.|Senator)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
    // "John Smith (R-TX)", "Jane Doe (D-CA)"
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+\(([RDI])-([A-Z]{2})\)/g,
  ],

  // Bill patterns
  bill: [
    // "H.R. 1234", "S. 567", "H.J.Res. 89"
    /\b(H\.?R\.?|S\.?|H\.?J\.?Res\.?|S\.?J\.?Res\.?|H\.?Con\.?Res\.?|S\.?Con\.?Res\.?|H\.?Res\.?|S\.?Res\.?)\s*(\d+)/gi,
    // "HR1234" compact format
    /\b(HR|S|HJRES|SJRES|HCONRES|SCONRES|HRES|SRES)(\d+)/gi,
  ],

  // Committee patterns
  committee: [
    // "House Committee on Ways and Means"
    /\b(House|Senate)\s+(?:Committee|Subcommittee)\s+on\s+([A-Z][a-zA-Z\s,&]+?)(?=\s*[,.]|\s*$)/g,
    // "Ways and Means Committee"
    /\b([A-Z][a-zA-Z\s,&]+?)\s+(?:Committee|Subcommittee)(?=\s*[,.]|\s*$)/g,
  ],

  // Donor/money patterns
  donor: [
    // "$1.2M from XYZ Corp", "donated $50,000"
    /\$[\d,]+(?:\.\d+)?[MKB]?\s+(?:from|by)\s+([A-Z][a-zA-Z\s&.,']+?)(?=\s*[,.]|\s*$)/g,
    // "XYZ Corp donated $1.2M"
    /\b([A-Z][a-zA-Z\s&.,']+?)\s+donated\s+\$[\d,]+(?:\.\d+)?[MKB]?/g,
  ],
};

// Cache for entity lookups (in production, this would be Redis or similar)
// Currently unused - entity ID generation returns null until proper async lookup is implemented
const _entityCache = new Map<string, string>();

/**
 * Recognize entities in text
 */
export function recognizeEntities(
  text: string,
  entityType: 'auto' | 'representative' | 'bill' | 'committee' | 'donor' = 'auto'
): EntityMatch[] {
  const matches: EntityMatch[] = [];
  const typesToSearch =
    entityType === 'auto'
      ? (['representative', 'bill', 'committee', 'donor'] as const)
      : [entityType];

  for (const type of typesToSearch) {
    const patterns = ENTITY_PATTERNS[type];

    for (const pattern of patterns) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match;

      while ((match = regex.exec(text)) !== null) {
        const entityMatch = processMatch(match, type, text);
        if (entityMatch && !isOverlapping(entityMatch, matches)) {
          matches.push(entityMatch);
        }
      }
    }
  }

  // Sort by start index and remove overlapping matches
  return matches
    .sort((a, b) => a.startIndex - b.startIndex)
    .filter((match, index, arr) => {
      if (index === 0) return true;
      const prevMatch = arr[index - 1];
      return prevMatch ? match.startIndex >= prevMatch.endIndex : true;
    });
}

/**
 * Process a regex match into an EntityMatch
 */
function processMatch(
  match: RegExpExecArray,
  type: EntityMatch['type'],
  _fullText: string
): EntityMatch | null {
  const text = match[0];
  let id = '';
  let confidence = 0.8; // Default confidence

  switch (type) {
    case 'representative': {
      if (match[0].includes('(')) {
        // Format: "John Smith (R-TX)"
        const name = match[1] || '';
        const party = match[2];
        const state = match[3];
        if (name) {
          const repId = generateRepresentativeId(name, party, state);
          // If we can't identify the representative, don't create a fake link
          if (!repId) {
            return null;
          }
          id = repId;
          confidence = 0.9;
        }
      } else {
        // Format: "Rep. John Smith"
        const _title = match[1];
        const name = match[2] || '';
        if (name) {
          const repId = generateRepresentativeId(name);
          // If we can't identify the representative, don't create a fake link
          if (!repId) {
            return null;
          }
          id = repId;
          confidence = 0.7; // Lower confidence without party/state
        }
      }
      break;
    }

    case 'bill': {
      const billType = match[1]?.replace(/\./g, '').toUpperCase();
      const billNumber = match[2];
      if (billType && billNumber) {
        id = `${billType.toLowerCase()}${billNumber}-119`; // Assuming 119th Congress
        confidence = 0.95;
      }
      break;
    }

    case 'committee': {
      const committeeName = match[1] || match[2] || '';
      if (committeeName) {
        id = generateCommitteeId(committeeName);
        confidence = 0.8;
      }
      break;
    }

    case 'donor': {
      const donorName = match[1] || '';
      if (donorName) {
        id = generateDonorId(donorName);
        confidence = 0.7;
      }
      break;
    }
  }

  if (!id) return null;

  return {
    type,
    text,
    id,
    startIndex: match.index!,
    endIndex: match.index! + text.length,
    confidence,
  };
}

/**
 * Check if an entity match overlaps with existing matches
 */
function isOverlapping(newMatch: EntityMatch, existingMatches: EntityMatch[]): boolean {
  return existingMatches.some(
    existing =>
      (newMatch.startIndex >= existing.startIndex && newMatch.startIndex < existing.endIndex) ||
      (newMatch.endIndex > existing.startIndex && newMatch.endIndex <= existing.endIndex) ||
      (newMatch.startIndex <= existing.startIndex && newMatch.endIndex >= existing.endIndex)
  );
}

/**
 * Try to find a representative's bioguide ID from name and optional party/state.
 * Returns null if the representative cannot be identified - this is intentional
 * to prevent linking to non-existent representatives.
 *
 * NOTE: This function currently returns null because we don't have a synchronous
 * lookup mechanism. For proper entity linking, the caller should use the
 * representatives API to look up members by name when needed.
 */
function generateRepresentativeId(_name: string, _party?: string, _state?: string): string | null {
  // Return null to indicate we cannot determine the bioguide ID
  // This prevents creating fake links that lead to 404 errors
  // A proper implementation would need async lookup against the representatives API
  return null;
}

/**
 * Generate a committee ID from committee name
 */
function generateCommitteeId(name: string): string {
  // Map common committee names to IDs
  const commonCommittees: Record<string, string> = {
    'Ways and Means': 'HSWM',
    Judiciary: 'HSJU',
    Appropriations: 'HSAP',
    'Foreign Affairs': 'HSFA',
    'Armed Services': 'HSAS',
    // Add more mappings
  };

  for (const [key, id] of Object.entries(commonCommittees)) {
    if (name.includes(key)) {
      return id;
    }
  }

  // Default placeholder
  return 'COMM-' + name.replace(/[^A-Z]/g, '').substring(0, 4);
}

/**
 * Generate a donor ID from donor name
 */
function generateDonorId(name: string): string {
  // Placeholder implementation
  return 'DONOR-' + name.replace(/[^A-Z0-9]/gi, '').substring(0, 10);
}

/**
 * Preload entity data for better performance
 */
export async function preloadEntityData(entityIds: string[]): Promise<void> {
  // In production, this would batch-fetch entity data
  // and populate the cache
  void entityIds; // Suppress unused parameter warning
}

/**
 * Get the link URL for an entity.
 * Returns null for entity types without implemented pages (e.g., donors).
 */
export function getEntityLink(entity: EntityMatch): string | null {
  switch (entity.type) {
    case 'representative':
      return `/representative/${entity.id}`;
    case 'bill':
      return `/bill/${entity.id}`;
    case 'committee':
      return `/committee/${entity.id}`;
    case 'donor':
      // Donor pages not yet implemented - return null to avoid dead links
      return null;
    default:
      return null;
  }
}
