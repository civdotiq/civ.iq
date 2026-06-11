/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Derivation helpers shared by the representative profile layouts
 * (redesigned overview and classic dashboard).
 */

import { ALL_COMMITTEE_MAPPINGS } from '@/lib/connections/committee-agency-map';

/** Derive committee codes from committee names via ALL_COMMITTEE_MAPPINGS */
export function deriveCommitteeCodes(committees?: Array<{ name: string }>): string[] {
  if (!committees || committees.length === 0) return [];

  const codes: string[] = [];
  for (const committee of committees) {
    const lower = committee.name.toLowerCase();
    for (const mapping of ALL_COMMITTEE_MAPPINGS) {
      if (
        lower.includes(mapping.committeeName.toLowerCase()) ||
        mapping.committeeName.toLowerCase().includes(lower)
      ) {
        codes.push(mapping.committeeCode);
        break;
      }
    }
  }
  return codes;
}

/** Derive focus areas from committee names */
export function deriveFocusAreas(committees?: Array<{ name: string }>): string[] {
  if (!committees || committees.length === 0) return [];

  // Map common committee name keywords to short labels
  const keywordMap: Record<string, string> = {
    'armed services': 'Defense',
    defense: 'Defense',
    veterans: 'Veterans',
    judiciary: 'Judiciary',
    finance: 'Finance',
    banking: 'Banking',
    budget: 'Budget',
    appropriations: 'Appropriations',
    energy: 'Energy',
    commerce: 'Commerce',
    agriculture: 'Agriculture',
    education: 'Education',
    'foreign relations': 'Foreign Relations',
    'foreign affairs': 'Foreign Affairs',
    intelligence: 'Intelligence',
    homeland: 'Homeland Security',
    health: 'Health',
    environment: 'Environment',
    transportation: 'Transportation',
    'small business': 'Small Business',
    science: 'Science',
    'natural resources': 'Natural Resources',
    oversight: 'Oversight',
    rules: 'Rules',
    ethics: 'Ethics',
    'ways and means': 'Ways & Means',
  };

  const areas = new Set<string>();
  for (const committee of committees) {
    const lower = committee.name.toLowerCase();
    for (const [keyword, label] of Object.entries(keywordMap)) {
      if (lower.includes(keyword) && areas.size < 4) {
        areas.add(label);
        break;
      }
    }
  }

  return Array.from(areas);
}
