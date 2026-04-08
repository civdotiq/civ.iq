/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * RelatedQuestions — "People Also Ask" section linking to other question pages.
 *
 * Deterministic: derived from the template's relatedSlugs, not AI-generated.
 * Server component.
 */

import Link from 'next/link';
import type { RelatedQuestionItem } from '@/lib/questions/related-questions';

interface RelatedQuestionsProps {
  questions: RelatedQuestionItem[];
}

export function RelatedQuestions({ questions }: RelatedQuestionsProps) {
  if (questions.length === 0) return null;

  return (
    <section className="mt-grid-6">
      <h2 className="type-lg font-semibold text-black mb-grid-3">Related questions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {questions.map(q => (
          <Link
            key={q.href}
            href={q.href}
            className="border-2 border-black bg-white p-4 hover:bg-gray-50 transition-colors"
          >
            <p className="type-xs aicher-heading-wide text-gray-500 mb-1">
              {q.category.toUpperCase()}
            </p>
            <p className="type-sm font-medium text-[#3ea2d4]">{q.question}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
