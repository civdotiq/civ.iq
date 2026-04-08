/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * QuestionSuggestions — 3 question cards linking to /ask/ pages.
 *
 * Designed for embedding in representative profile pages below the hero section.
 * Server component.
 */

import Link from 'next/link';
import { getAllTemplates } from '@/lib/questions/question-registry';

interface QuestionSuggestionsProps {
  bioguideId: string;
  name: string;
}

export function QuestionSuggestions({ bioguideId, name }: QuestionSuggestionsProps) {
  const templates = getAllTemplates();

  return (
    <section aria-label="Questions about this representative" className="mt-grid-3">
      <h2 className="type-sm font-semibold text-black mb-grid-2">Common questions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {templates.map(template => {
          const question = template.questionPattern.replace(/\{name\}/g, name);
          return (
            <Link
              key={template.slug}
              href={`/ask/${template.slug}/${bioguideId}`}
              className="border-2 border-black bg-white p-3 hover:bg-gray-50 transition-colors"
            >
              <p className="type-xs aicher-heading-wide text-gray-500 mb-1">
                {template.category.toUpperCase()}
              </p>
              <p className="type-sm font-medium text-[#3ea2d4]">{question}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
