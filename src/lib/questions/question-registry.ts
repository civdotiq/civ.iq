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
    relatedSlugs: ['donor-voting-alignment', 'voting-record'],
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
    relatedSlugs: ['bills-sponsored', 'campaign-contributions'],
  },
  {
    slug: 'bills-sponsored',
    category: 'what',
    questionPattern: 'What bills has {name} sponsored?',
    descriptionPattern:
      "Browse {name}'s ({party}-{state}) sponsored and cosponsored legislation in the 119th Congress, including policy area breakdown.",
    entityType: 'representative',
    dataSources: ['/api/representative/[id]', '/api/representative/[id]/bills'],
    relatedSlugs: ['voting-record', 'campaign-contributions'],
  },
  {
    slug: 'contact-info',
    category: 'who',
    questionPattern: 'How do I contact {name}?',
    descriptionPattern:
      "Find {name}'s ({party}-{state}) office phone number, mailing address, contact form, website, and social media accounts.",
    entityType: 'representative',
    dataSources: ['/api/representative/[id]'],
    relatedSlugs: ['voting-record', 'campaign-contributions'],
  },
  {
    slug: 'donor-voting-alignment',
    category: 'why',
    questionPattern: "Does {name}'s voting align with their donors?",
    descriptionPattern:
      "Statistical analysis of whether {name}'s ({party}-{state}) voting patterns correlate with campaign donor sectors. Includes sector-by-sector breakdown.",
    entityType: 'representative',
    dataSources: ['/api/representative/[id]', '/api/intelligence/representative/[id]/vote-finance'],
    relatedSlugs: ['campaign-contributions', 'voting-record'],
  },
  {
    slug: 'committee-members',
    category: 'who',
    questionPattern: 'Who sits on {name}?',
    descriptionPattern:
      'Members, leadership, and subcommittees of the {name} ({chamber}). Data from Congress.gov.',
    entityType: 'committee',
    dataSources: ['/api/committee/[id]'],
    relatedSlugs: ['committee-activity', 'committee-lobbying'],
  },
  {
    slug: 'committee-activity',
    category: 'what',
    questionPattern: 'What is {name} working on?',
    descriptionPattern:
      'Recent hearings, bills in committee, and jurisdiction of the {name} ({chamber}). Data from Congress.gov.',
    entityType: 'committee',
    dataSources: [
      '/api/committee/[id]',
      '/api/committee/[id]/bills',
      '/api/committee/[id]/meetings',
    ],
    relatedSlugs: ['committee-members', 'committee-lobbying'],
  },
  {
    slug: 'committee-lobbying',
    category: 'where',
    questionPattern: 'Who lobbies {name}?',
    descriptionPattern:
      'Organizations lobbying the {name} ({chamber}), spending by issue, and related legislation. Data from Senate LDA disclosures.',
    entityType: 'committee',
    dataSources: ['/api/intelligence/committee/[id]'],
    relatedSlugs: ['committee-members', 'committee-activity'],
  },
  {
    slug: 'topic-bills',
    category: 'what',
    questionPattern: 'What bills are about {name}?',
    descriptionPattern:
      'Recent legislation, federal regulations, related committees, and spending for {name}. Data from Congress.gov, Federal Register, and USAspending.gov.',
    entityType: 'topic',
    dataSources: ['/api/search/policy-area'],
    relatedSlugs: [],
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
 * Slugify a policy area name for use as a topic entity ID.
 * "Armed Forces and National Security" → "armed-forces-and-national-security"
 */
export function slugifyPolicyArea(policyArea: string): string {
  return policyArea.toLowerCase().replace(/[,]/g, '').replace(/\s+/g, '-');
}

/**
 * Get all templates for a specific entity type.
 */
export function getTemplatesByEntityType(
  entityType: QuestionTemplate['entityType']
): QuestionTemplate[] {
  return QUESTION_TEMPLATES.filter(t => t.entityType === entityType);
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
