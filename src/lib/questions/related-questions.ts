/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Deterministic related-question computation.
 *
 * Takes the current template's relatedSlugs, substitutes the entity name
 * into each template's questionPattern, and builds hrefs.
 */

import { getTemplate, getAllTemplates, type QuestionTemplate } from './question-registry';

export interface RelatedQuestionItem {
  question: string;
  href: string;
  category: QuestionTemplate['category'];
}

export function computeRelatedQuestions(
  currentSlug: string,
  entityId: string,
  entityName: string
): RelatedQuestionItem[] {
  const currentTemplate = getTemplate(currentSlug);
  if (!currentTemplate) return [];

  const allTemplates = getAllTemplates();

  return currentTemplate.relatedSlugs
    .map(slug => allTemplates.find(t => t.slug === slug))
    .filter((t): t is QuestionTemplate => t !== undefined)
    .map(template => ({
      question: template.questionPattern.replace(/\{name\}/g, entityName),
      href: `/ask/${template.slug}/${entityId}`,
      category: template.category,
    }));
}
