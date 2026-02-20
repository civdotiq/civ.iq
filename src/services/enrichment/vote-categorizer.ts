/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Vote Categorizer
 *
 * Maps bill titles and subjects to policy categories using keyword matching.
 * Reuses the category pattern from vote-pattern-analyzer.ts for consistency.
 */

const CATEGORY_MAP: Array<[string[], string]> = [
  [
    [
      'health',
      'medical',
      'medicare',
      'medicaid',
      'drug',
      'hospital',
      'mental health',
      'opioid',
      'pharmaceutical',
    ],
    'Healthcare',
  ],
  [
    ['education', 'school', 'student', 'university', 'teacher', 'curriculum', 'charter', 'tuition'],
    'Education',
  ],
  [
    [
      'crime',
      'criminal',
      'police',
      'law enforcement',
      'prison',
      'corrections',
      'sentencing',
      'parole',
      'probation',
      'felony',
      'misdemeanor',
      'public safety',
    ],
    'Criminal Justice',
  ],
  [
    ['budget', 'appropriation', 'fiscal', 'spending', 'deficit', 'surplus', 'debt'],
    'Budget & Appropriations',
  ],
  [['tax', 'revenue', 'income tax', 'sales tax', 'property tax', 'exemption'], 'Taxation'],
  [
    [
      'environment',
      'climate',
      'energy',
      'epa',
      'pollution',
      'renewable',
      'solar',
      'wind',
      'emission',
      'water quality',
      'conservation',
    ],
    'Environment & Energy',
  ],
  [
    ['infrastructure', 'transport', 'highway', 'bridge', 'road', 'transit', 'rail', 'broadband'],
    'Infrastructure',
  ],
  [
    ['housing', 'mortgage', 'rent', 'tenant', 'landlord', 'affordable housing', 'homelessness'],
    'Housing',
  ],
  [['agriculture', 'farm', 'food', 'crop', 'livestock', 'rural'], 'Agriculture'],
  [
    ['election', 'voting', 'ballot', 'campaign', 'redistricting', 'gerrymandering'],
    'Elections & Voting',
  ],
  [['gun', 'firearm', 'weapon', 'second amendment', 'concealed carry'], 'Firearms'],
  [['immigration', 'border', 'visa', 'refugee', 'asylum', 'undocumented'], 'Immigration'],
  [
    ['labor', 'wage', 'worker', 'union', 'employment', 'minimum wage', 'workplace', 'overtime'],
    'Labor & Employment',
  ],
  [
    ['child', 'children', 'foster', 'adoption', 'custody', 'juvenile', 'family'],
    'Children & Families',
  ],
  [['insurance', 'liability', 'coverage'], 'Insurance'],
  [
    [
      'commerce',
      'business',
      'trade',
      'regulation',
      'licensing',
      'small business',
      'economic development',
    ],
    'Commerce & Business',
  ],
  [['veteran', 'military', 'defense', 'armed forces', 'national guard'], 'Veterans & Military'],
];

/**
 * Categorize a bill by its title and/or subjects.
 * Returns the matching category name, or 'Other' if no match found.
 */
export function categorizeBill(title: string, subjects?: string[]): string {
  const searchText = [title, ...(subjects ?? [])].join(' ').toLowerCase();

  for (const [keywords, category] of CATEGORY_MAP) {
    if (keywords.some(k => searchText.includes(k))) {
      return category;
    }
  }

  return 'Other';
}

/**
 * Get all available category names (for documentation/typing purposes).
 */
export function getAllCategories(): string[] {
  return CATEGORY_MAP.map(([, category]) => category);
}
