/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Question Registry — central routing table for question-template pages.
 *
 * Every question page is driven by a template defined here.
 * Template slug maps to a URL: /ask/{slug}/[entityId]
 */

export interface QuestionTemplate {
  /** URL path segment: /ask/{slug}/[entityId] */
  slug: string;
  /** Question category for navigation and breadcrumbs */
  category: 'who' | 'how' | 'what' | 'where' | 'why';
  /** Question with {name} placeholder, e.g., "Where do {name}'s campaign contributions come from?" */
  questionPattern: string;
  /** Meta description with placeholders like {name}, {party}, {state}, {chamber} */
  descriptionPattern: string;
  /** Entity type this template applies to */
  entityType: 'representative' | 'committee' | 'topic';
  /** API route patterns (with [id] placeholder) */
  dataSources: string[];
  /** Slugs for related question links */
  relatedSlugs: string[];
}

const CATEGORY_LABELS: Record<QuestionTemplate['category'], string> = {
  who: 'Who',
  how: 'How',
  what: 'What',
  where: 'Where',
  why: 'Why',
};

export function getCategoryLabel(category: QuestionTemplate['category']): string {
  return CATEGORY_LABELS[category];
}

const QUESTION_TEMPLATES: QuestionTemplate[] = [
  {
    slug: 'campaign-contributions',
    category: 'where',
    questionPattern: "Where do {name}'s campaign contributions come from?",
    descriptionPattern:
      'See where {name} ({party}-{state}) gets campaign money. Industry breakdown, top donors, and in-state vs out-of-state funding from FEC filings.',
    entityType: 'representative',
    dataSources: [
      '/api/representative/[id]',
      '/api/representative/[id]/finance',
      '/api/representative/[id]/finance/industries',
      '/api/intelligence/representative/[id]/vote-finance',
    ],
    relatedSlugs: ['party-alignment', 'voting-record'],
  },
  {
    slug: 'party-alignment',
    category: 'how',
    questionPattern: 'How does {name} vote compared to their party?',
    descriptionPattern:
      'See how often {name} ({party}-{state}) votes with their party. Party-line rate, trends over time, and notable departures.',
    entityType: 'representative',
    dataSources: [
      '/api/representative/[id]',
      '/api/representative/[id]/party-alignment',
      '/api/intelligence/representative/[id]/temporal',
    ],
    relatedSlugs: ['campaign-contributions', 'voting-record'],
  },
  {
    slug: 'voting-record',
    category: 'how',
    questionPattern: 'How does {name} vote?',
    descriptionPattern:
      "Review {name}'s ({party}-{state}) recent votes, sponsored bills, and voting patterns in the 119th Congress.",
    entityType: 'representative',
    dataSources: [
      '/api/representative/[id]',
      '/api/representative/[id]/votes',
      '/api/representative/[id]/bills',
    ],
    relatedSlugs: ['party-alignment', 'campaign-contributions'],
  },
];

const TEMPLATE_MAP = new Map(QUESTION_TEMPLATES.map(t => [t.slug, t]));

export function getTemplate(slug: string): QuestionTemplate | undefined {
  return TEMPLATE_MAP.get(slug);
}

export function getAllTemplates(): QuestionTemplate[] {
  return [...QUESTION_TEMPLATES];
}

export function getAllSlugs(): string[] {
  return QUESTION_TEMPLATES.map(t => t.slug);
}

/**
 * Fill placeholders in a pattern string.
 * Accepts any Record<string, string> — e.g., { name, party, state } for
 * representatives, { name, chamber } for committees, { name } for topics.
 */
export function fillPattern(pattern: string, vars: Record<string, string>): string {
  let result = pattern;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}
